import fs from 'fs';
import path from 'path';
import { DataGovSgAdapter } from '../src/services/DataGovSgAdapter.ts';
import { processSubzoneSpatialJoin } from '../src/services/turf.ts'; 
import * as turf from '@turf/turf';

// 1. Static historical datasets (Downloaded ONCE and cached forever)
const STATIC_DATASETS = [
    { key: "ds2020PopulationDensity", id: "d_d95ae740c0f8961a0b10435836660ce0" },
    { key: "subzonesBoundary", id: "d_8594ae9ff96d0c708bc2af633048edfb" }
];

// 2. Dynamic Poll-Download Datasets (GeoJSON spatial bundles - Refreshed HOURLY)
const POLL_DOWNLOAD_DATASETS: Record<string, string> = {
    dengueClusters: "d_dbfabf16158d1b0e1c420627c0819168",
    highAedesAreas: "d_5d060d8b7838a15e8906fb22c50dbf51"
};

// 3. Dynamic Datastore / CSV Datasets (Monthly tabular statistics - Refreshed DAILY / 24 hours)
const DATASTORE_DATASETS: Record<string, string> = {
    rainfallMonthly: "d_b16d06b83473fdfcc92ed9d37b66ba58",
    relativeHumidityMonthly: "d_e3b1111a26b2aefef4f386c068d4ca5d"
};

const REALTIME_ENDPOINTS: string[] = [
    //"airTemperature",
    //"rainfall",
    //"relativeHumidity"
];

/**
 * Helper to check file age in hours using file modification time (mtime)
 * since dynamic/uncommitted files won't exist in git history.
 */
function getFileAgeInHours(filePath: string): number {
    try {
        if (!fs.existsSync(filePath)) return 999;
        const stats = fs.statSync(filePath);
        return (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);
    } catch {
        return 999; 
    }
}

/**
 * Safely parse JSON files with a fallback if the content is raw text/CSV or malformed.
 */
function parseSafely(filePath: string, fallback: any = {}): any {
    if (!fs.existsSync(filePath)) return fallback;
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(raw);
    } catch {
        console.warn(`[Warning] Could not parse JSON from ${filePath}. File content might be raw text/CSV.`);
        return fallback;
    }
}

/** subzoneId whose boundary contains the feature's centroid; falls back to the first subzone it overlaps. */
function findSubzoneId(geometry: any, subzones: any[]): string | null {
    const centre = turf.centroid(geometry);

    const containing = subzones.find(sz => turf.booleanPointInPolygon(centre, sz.boundary));
    if (containing) return containing.subzoneId;

    const overlapping = subzones.find(sz => turf.booleanIntersects(geometry, sz.boundary));
    if (overlapping) return overlapping.subzoneId;

    return null;
}

async function syncAllData(): Promise<void> {
    try {
        console.log("Starting multi-source data sync...");
        const adapter = new DataGovSgAdapter();
        const results: Record<string, any> = {};

        // Ensure directories exist
        const staticDir = path.join(process.cwd(), 'data', 'static');
        const dynamicDir = path.join(process.cwd(), 'data', 'dynamic');
        const derivedDir = path.join(process.cwd(), 'data', 'derived');
        
        if (!fs.existsSync(staticDir)) fs.mkdirSync(staticDir, { recursive: true });
        if (!fs.existsSync(dynamicDir)) fs.mkdirSync(dynamicDir, { recursive: true });
        if (!fs.existsSync(derivedDir)) fs.mkdirSync(derivedDir, { recursive: true });

        // A. Handle Static Data
        const staticManifest: Record<string, string> = {};
        for (const item of STATIC_DATASETS) {
            const filePath = path.join(staticDir, `${item.key}.json`);

            if (fs.existsSync(filePath)) {
                console.log(`[Static] Using cached file: ${item.key}.json`);
            } else {
                console.log(`[Static] Downloading static dataset: ${item.key}...`);
                if (item.key === "subzonesBoundary") {
                    await adapter.fetchPollDownloadToDisk(item.id, filePath);
                } else {
                    await adapter.fetchDatastoreRecords(item.id, filePath);
                }
            }
            staticManifest[item.key] = path.relative(process.cwd(), filePath);
        }
        results.staticData = staticManifest;

        // B. Handle Dynamic Datasets
        const dynamicManifest: Record<string, string> = {};

        // B1. Poll-Download streams
        for (const [key, datasetId] of Object.entries(POLL_DOWNLOAD_DATASETS)) {
            const filePath = path.join(dynamicDir, `${key}.json`);
            console.log(`[Dynamic Poll] Fetching latest live data for: ${key}...`);
            await adapter.fetchPollDownloadToDisk(datasetId, filePath);
            dynamicManifest[key] = path.relative(process.cwd(), filePath);
        }

        // B2. Datastore search queries (Respect GitHub Actions cache-hit if true)
        const skipMonthlyFetch = process.env.CACHE_HIT === 'true';
        for (const [key, datasetId] of Object.entries(DATASTORE_DATASETS)) {
            const filePath = path.join(dynamicDir, `${key}.json`);
            let needsRefresh = true;

            if (skipMonthlyFetch && fs.existsSync(filePath)) {
                console.log(`[Dynamic Datastore] Cache hit in CI. Skipping fetch for ${key}.`);
                needsRefresh = false;
            } else if (fs.existsSync(filePath)) {
                const ageHours = getFileAgeInHours(filePath);
                if (ageHours < 24) {
                    console.log(`[Dynamic Datastore] Skipping fetch for ${key} (file age: ${ageHours.toFixed(1)} hours)`);
                    needsRefresh = false;
                }
            }

            if (needsRefresh) {
                console.log(`[Dynamic Datastore] Fetching fresh records for: ${key}...`);
                await adapter.fetchDatastoreRecords(datasetId, filePath);
            } else {
                console.log(`[Dynamic Datastore] Using cached records for: ${key}`);
            }

            dynamicManifest[key] = path.relative(process.cwd(), filePath);
        }
        results.dynamicData = dynamicManifest;
        
        // C. Fetch live real-time weather APIs
        const realtimeResults: Record<string, any> = {};
        for (const endpointName of REALTIME_ENDPOINTS) {
            console.log(`[Realtime] Fetching API endpoint: ${endpointName}...`);
            realtimeResults[endpointName] = await adapter.fetchRealtime(endpointName);
        }
        results.realtime = realtimeResults;

        // --- D. SPATIAL JOIN, FRESHNESS & VALIDATION (Ticket #12) ---
        console.log("Processing spatial joins and generating subzone metrics...");

        const subzonesPath = path.join(derivedDir, 'subzones.json');
        const weatherBaselinesPath = path.join(derivedDir, 'weatherBaselines.json');

        if (!fs.existsSync(subzonesPath)) {
            throw new Error("Missing required committed file: data/derived/subzones.json");
        }
        if (!fs.existsSync(weatherBaselinesPath)) {
            throw new Error("Missing required committed file: data/derived/weatherBaselines.json");
        }

        const subzonesData = parseSafely(subzonesPath, []);
        const weatherBaselines = parseSafely(weatherBaselinesPath, null);
        if (!weatherBaselines) throw new Error("Missing or invalid weatherBaselines.json");

        // Load dynamic GeoJSON files safely
        const dengueClustersPath = path.join(dynamicDir, 'dengueClusters.json');
        const highAedesPath = path.join(dynamicDir, 'highAedesAreas.json');

        const dengueGeoJson = parseSafely(dengueClustersPath, { features: [] });
        const aedesGeoJson = parseSafely(highAedesPath, { features: [] });

        // 1. Perform Turf.js polygon spatial join & aedes ratio calculations
        const subzoneMetrics = processSubzoneSpatialJoin(subzonesData, dengueGeoJson, aedesGeoJson);

        // 2. Track Dataset Status and Freshness
        const datasetsStatus: Record<string, { retrievedAt: string; status: 'FRESH' | 'STALE' | 'FAILED' }> = {};
        const now = new Date();

        function evaluateMonthlyFreshness(filePath: string): 'FRESH' | 'STALE' | 'FAILED' {
            try {
                const fileContent = parseSafely(filePath, null);
                if (!fileContent) return 'FAILED';
                const records = fileContent?.result?.records || (Array.isArray(fileContent) ? fileContent : []);
                if (records.length === 0) return 'STALE';

                const latestRecord = records[records.length - 1];
                const dateVal = latestRecord?.date || latestRecord?.yearMonth || latestRecord?.month || latestRecord?._timestamp;
                if (!dateVal) return 'FRESH';

                const latestDate = new Date(dateVal);
                const monthsElapsed = (now.getFullYear() - latestDate.getFullYear()) * 12 + (now.getMonth() - latestDate.getMonth());
                return monthsElapsed > 2 ? 'STALE' : 'FRESH';
            } catch {
                return 'FAILED';
            }
        }

        const rainfallMonthlyPath = path.join(dynamicDir, 'rainfallMonthly.json');
        const relativeHumidityMonthlyPath = path.join(dynamicDir, 'relativeHumidityMonthly.json');

        datasetsStatus.rainfallMonthly = {
            retrievedAt: new Date().toISOString(),
            status: evaluateMonthlyFreshness(rainfallMonthlyPath)
        };
        datasetsStatus.relativeHumidityMonthly = {
            retrievedAt: new Date().toISOString(),
            status: evaluateMonthlyFreshness(relativeHumidityMonthlyPath)
        };
        datasetsStatus.dengueClusters = {
            retrievedAt: new Date().toISOString(),
            status: fs.existsSync(dengueClustersPath) ? 'FRESH' : 'FAILED'
        };
        datasetsStatus.highAedesAreas = {
            retrievedAt: new Date().toISOString(),
            status: fs.existsSync(highAedesPath) ? 'FRESH' : 'FAILED'
        };

        // Parse records safely for WeatherProfile construction (Strict checking - no invented fallbacks)
        const rainfallContent = parseSafely(rainfallMonthlyPath, null);
        const humidityContent = parseSafely(relativeHumidityMonthlyPath, null);
        const rainfallRecords = rainfallContent?.result?.records || [];
        const humidityRecords = humidityContent?.result?.records || [];

        if (rainfallRecords.length === 0 || humidityRecords.length === 0) {
            throw new Error("Validation Error: Rainfall or Humidity monthly records are empty. Marking dataset sync FAILED.");
        }

        // Rainfall (2-3 months back lag)
        const targetRainfallIndex = Math.max(0, rainfallRecords.length - 3);
        const rainfallRecord = rainfallRecords[targetRainfallIndex];
        const rainfallMonthStr = String(rainfallRecord.month || rainfallRecord.date || rainfallRecord.yearMonth);
        const rainfallCalendarMonth = rainfallMonthStr.slice(-2);
        const rainfallBaseline = weatherBaselines?.rainfall?.byMonth?.[rainfallCalendarMonth];
        if (!rainfallBaseline) throw new Error(`Missing rainfall baseline for month: ${rainfallCalendarMonth}`);

        // Humidity (latest complete month)
        const humidityRecord = humidityRecords[humidityRecords.length - 1];
        const humidityMonthStr = String(humidityRecord.month || humidityRecord.date || humidityRecord.yearMonth);
        const humidityCalendarMonth = humidityMonthStr.slice(-2);
        const humidityBaseline = weatherBaselines?.humidity?.byMonth?.[humidityCalendarMonth];
        if (!humidityBaseline) throw new Error(`Missing humidity baseline for month: ${humidityCalendarMonth}`);

        const weatherProfile = {
            humidityMonth: humidityMonthStr,
            meanHumidityPct: Number(humidityRecord.mean_rh ?? 0),
            humidityNormalMean: humidityBaseline.mean,
            humidityNormalSd: humidityBaseline.sd,
            rainfallMonth: rainfallMonthStr,
            rainfallMm: Number(rainfallRecord.total_rainfall ?? 0),
            rainfallNormalMean: rainfallBaseline.mean,
            rainfallNormalSd: rainfallBaseline.sd
        };

        // 3. Map to Entity Definitions
        const retrievedTimestamp = new Date().toISOString();

        // PopulationProfile[]: subzones.json (Ticket 11) already has residents and density per subzoneId
        const populationProfilesData = subzonesData.map((sz: any) => ({
            subzoneId: sz.subzoneId,
            residentCount: sz.residentCount,
            density: sz.residentsPerKm2,
            housingComposition: ''
        }));

        // DengueCluster[]
        const dengueClustersData = (dengueGeoJson?.features || []).map((f: any) => ({
            clusterId: String(f.properties.OBJECTID),
            location: f.properties.LOCALITY ?? '',
            caseCount: Number(f.properties.CASE_SIZE),
            geometry: f.geometry,
            retrievedAt: retrievedTimestamp,
            subzoneId: findSubzoneId(f.geometry, subzonesData),
        })).filter((c: any) => {
            if (c.subzoneId) return true;
            console.warn(`Cluster ${c.clusterId} is outside every subzone; skipped`);
            return false;
        });

        // HighAedesArea[]
        const highAedesAreasData = (aedesGeoJson?.features || []).map((f: any) => ({
            areaId: String(f.properties.OBJECTID),
            geometry: f.geometry,
            retrievedAt: retrievedTimestamp,
            subzoneId: findSubzoneId(f.geometry, subzonesData),
        })).filter((a: any) => {
            if (a.subzoneId) return true;
            console.warn(`High Aedes area ${a.areaId} is outside every subzone; skipped`);
            return false;
        });

        // 4. VALIDATION GUARD: Reject empty arrays or all-zero metrics
        const hasValidMetrics = Array.isArray(subzoneMetrics) && 
            subzoneMetrics.length > 0 && 
            subzoneMetrics.some((sz: any) => (sz.clusterCasesNearby ?? 0) > 0 || (sz.aedesOverlapRatio ?? 0) > 0);

        if (!hasValidMetrics) {
            throw new Error("Validation Error: Computed subzone metrics resulted in an empty array or all-zero values. Aborting to protect last good snapshot.");
        }

        // 5. Publish Final PublicDataSnapshot matching required schema
        const finalSnapshot = {
            generatedAt: retrievedTimestamp,
            datasets: datasetsStatus,
            weather: weatherProfile,
            populationProfiles: populationProfilesData,
            dengueClusters: dengueClustersData,
            highAedesAreas: highAedesAreasData,
            subzones: subzoneMetrics
        };

        const snapshotOutputPath = path.join(derivedDir, 'latest-snapshot.json');
        fs.writeFileSync(snapshotOutputPath, JSON.stringify(finalSnapshot, null, 2));

        // Also write master manifest for backward compatibility
        const masterManifestPath = path.join(process.cwd(), 'snapshot.json');
        fs.writeFileSync(masterManifestPath, JSON.stringify({ generatedAt: retrievedTimestamp, ...results }, null, 4));

        console.log("Successfully completed data sync, entity mapping, and snapshot publication!");

    } catch (error: any) {
        console.error("Error during data sync:", error.message);
        process.exit(1);
    }
}

syncAllData();