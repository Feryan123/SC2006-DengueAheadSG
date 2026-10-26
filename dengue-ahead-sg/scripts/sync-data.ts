import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { DataGovSgAdapter } from '../src/services/DataGovSgAdapter.ts';
import { processSubzoneSpatialJoin } from '../src/services/turf.ts'; 

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

// 4. Real-time weather API endpoints (REFRESHED EVERY TIME)
const REALTIME_ENDPOINTS: string[] = [];

/**
 * Helper to check how many hours ago a file was last modified and committed in git.
 */
function getFileAgeInHours(filePath: string): number {
    try {
        const timestampStr = execSync(`git log -1 --format=%ct -- "${filePath}"`, { encoding: 'utf8' }).trim();
        if (!timestampStr) return 999; 
        const commitTimeMs = parseInt(timestampStr, 10) * 1000;
        return (Date.now() - commitTimeMs) / (1000 * 60 * 60);
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

        // B2. Datastore search queries
        for (const [key, datasetId] of Object.entries(DATASTORE_DATASETS)) {
            const filePath = path.join(dynamicDir, `${key}.json`);
            let needsRefresh = true;

            if (fs.existsSync(filePath)) {
                const ageHours = getFileAgeInHours(filePath);
                if (ageHours < 24) {
                    console.log(`[Dynamic Datastore] Skipping fetch for ${key} (last updated in git ${ageHours.toFixed(1)} hours ago)`);
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
        const weatherBaselines = parseSafely(weatherBaselinesPath, { humidity: { byMonth: {} }, rainfall: { byMonth: {} } });

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
        datasetsStatus.weatherBaselines = {
            retrievedAt: new Date().toISOString(),
            status: 'FRESH'
        };

        // Parse records safely for WeatherProfile construction
        const rainfallContent = parseSafely(rainfallMonthlyPath, {});
        const humidityContent = parseSafely(relativeHumidityMonthlyPath, {});
        const rainfallRecords = rainfallContent?.result?.records || (Array.isArray(rainfallContent) ? rainfallContent : []);
        const humidityRecords = humidityContent?.result?.records || (Array.isArray(humidityContent) ? humidityContent : []);

        // Rainfall (2-3 months back lag)
        const targetRainfallIndex = Math.max(0, rainfallRecords.length - 3);
        const rainfallRecord = rainfallRecords[targetRainfallIndex] || {};
        const rainfallMonthStr = String(rainfallRecord.month || rainfallRecord.date || rainfallRecord.yearMonth || '2026-07');
        const rainfallCalendarMonth = rainfallMonthStr.slice(-2);
        const rainfallBaseline = weatherBaselines?.rainfall?.byMonth?.[rainfallCalendarMonth] || { mean: 0, sd: 0 };

        // Humidity (latest complete month)
        const humidityRecord = humidityRecords[humidityRecords.length - 1] || {};
        const humidityMonthStr = String(humidityRecord.month || humidityRecord.date || humidityRecord.yearMonth || '2026-09');
        const humidityCalendarMonth = humidityMonthStr.slice(-2);
        const humidityBaseline = weatherBaselines?.humidity?.byMonth?.[humidityCalendarMonth] || { mean: 0, sd: 0 };

        const weatherProfile = {
            humidityMonth: humidityMonthStr,
            meanHumidityPct: Number(humidityRecord.value || humidityRecord.humidity || humidityRecord.mean || 0),
            humidityNormalMean: humidityBaseline.mean,
            humidityNormalSd: humidityBaseline.sd,
            rainfallMonth: rainfallMonthStr,
            rainfallMm: Number(rainfallRecord.value || rainfallRecord.rainfall || rainfallRecord.total || 0),
            rainfallNormalMean: rainfallBaseline.mean,
            rainfallNormalSd: rainfallBaseline.sd
        };

        // Load population profiles safely
        const popDensityPath = path.join(staticDir, 'ds2020PopulationDensity.json');
        const populationProfilesData = parseSafely(popDensityPath, []);

        // 3. VALIDATION GUARD: Reject empty arrays or all-zero metrics
        const hasValidMetrics = Array.isArray(subzoneMetrics) && 
            subzoneMetrics.length > 0 && 
            subzoneMetrics.some((sz: any) => (sz.clusterCasesNearby ?? 0) > 0 || (sz.aedesOverlapRatio ?? 0) > 0);

        if (!hasValidMetrics) {
            throw new Error("Validation Error: Computed subzone metrics resulted in an empty array or all-zero values. Aborting to protect last good snapshot.");
        }

        // 4. Publish Final PublicDataSnapshot matching required schema
        const finalSnapshot = {
            generatedAt: new Date().toISOString(),
            datasets: datasetsStatus,
            weather: weatherProfile,
            populationProfiles: populationProfilesData,
            dengueClusters: dengueGeoJson,
            highAedesAreas: aedesGeoJson,
            subzones: subzoneMetrics
        };

        const snapshotOutputPath = path.join(derivedDir, 'latest-snapshot.json');
        fs.writeFileSync(snapshotOutputPath, JSON.stringify(finalSnapshot, null, 2));

        // Also write master manifest for backward compatibility
        const masterManifestPath = path.join(process.cwd(), 'snapshot.json');
        fs.writeFileSync(masterManifestPath, JSON.stringify({ generatedAt: new Date().toISOString(), ...results }, null, 4));

        console.log("Successfully completed data sync, polygon spatial join, freshness checks, and snapshot publication!");

    } catch (error: any) {
        console.error("Error during data sync:", error.message);
        process.exit(1);
    }
}

syncAllData();