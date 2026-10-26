import fs from 'fs';
import path from 'path';
import { DataGovSgAdapter } from '../src/services/DataGovSgAdapter.ts';
import { processSubzoneSpatialJoin } from '../src/services/turf.ts'; 

// 1. Static historical datasets (Downloaded ONCE and cached forever)
const STATIC_DATASETS = [
    { key: "ds2020PopulationDensity", id: "d_d95ae740c0f8961a0b10435836660ce0" },
    { key: "subzonesBoundary", id: "d_8594ae9ff96d0c708bc2af633048edfb" }
];

// 2. Dynamic Poll-Download Datasets (GeoJSON spatial bundles)
const POLL_DOWNLOAD_DATASETS: Record<string, string> = {
    dengueClusters: "d_dbfabf16158d1b0e1c420627c0819168",
    highAedesAreas: "d_5d060d8b7838a15e8906fb22c50dbf51"
};

// 3. Dynamic Datastore / CSV Datasets (Monthly tabular statistics)
const DATASTORE_DATASETS: Record<string, string> = {
    rainfallMonthly: "d_b16d06b83473fdfcc92ed9d37b66ba58",
    relativeHumidityMonthly: "d_e3b1111a26b2aefef4f386c068d4ca5d"
};

// 4. Real-time weather API endpoints (REFRESHED EVERY TIME)
const REALTIME_ENDPOINTS: string[] = [
    // "airTemperature",
    // "rainfall",
    // "relativeHumidity"
];

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

        // A. Handle Static Data (Idempotent: skips if file already exists)
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

        // B2. Datastore search queries (Rainfall & Humidity)
        for (const [key, datasetId] of Object.entries(DATASTORE_DATASETS)) {
            const filePath = path.join(dynamicDir, `${key}.json`);
            console.log(`[Dynamic Datastore] Fetching records for: ${key}...`);
            await adapter.fetchDatastoreRecords(datasetId, filePath);
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

        // 1. Read committed static/derived baseline files
        const subzonesPath = path.join(derivedDir, 'subzones.json');
        const weatherBaselinesPath = path.join(derivedDir, 'weatherBaselines.json');

        if (!fs.existsSync(subzonesPath)) {
            throw new Error("Missing required committed file: data/derived/subzones.json");
        }
        if (!fs.existsSync(weatherBaselinesPath)) {
            throw new Error("Missing required committed file: data/derived/weatherBaselines.json");
        }

        const subzonesData = JSON.parse(fs.readFileSync(subzonesPath, 'utf8'));

        // 2. Load newly fetched dynamic dengue data and safely normalize into { lat, lng } points
        const dengueClustersPath = path.join(dynamicDir, 'dengueClusters.json');
        const dengueFileContent = fs.existsSync(dengueClustersPath) 
            ? JSON.parse(fs.readFileSync(dengueClustersPath, 'utf8')) 
            : [];

        let incidentPoints: Array<{ lat: number; lng: number }> = [];

        if (Array.isArray(dengueFileContent)) {
            // Case A: Already a flat array
            incidentPoints = dengueFileContent;
        } else if (dengueFileContent && Array.isArray(dengueFileContent.features)) {
            // Case B: GeoJSON FeatureCollection format (extracting [lng, lat] from geometry)
            incidentPoints = dengueFileContent.features.map((f: any) => {
                const coords = f.geometry?.coordinates;
                return {
                    lng: coords?.[0],
                    lat: coords?.[1]
                };
            }).filter((pt: any) => pt.lat != null && pt.lng != null);
        } else if (dengueFileContent && Array.isArray(dengueFileContent.data)) {
            // Case C: Wrapped in a .data property
            incidentPoints = dengueFileContent.data;
        }

        // 3. Perform Turf.js spatial join using your normalized points helper
        const subzoneMetrics = processSubzoneSpatialJoin(subzonesData, incidentPoints);

        // 4. Track Dataset Status and Freshness (Stale if latest month is > 2 months old)
        const rainfallMonthlyPath = path.join(dynamicDir, 'rainfallMonthly.json');
        let rainfallStatus = 'fresh';
        if (fs.existsSync(rainfallMonthlyPath)) {
            const rainfallData = JSON.parse(fs.readFileSync(rainfallMonthlyPath, 'utf8'));
            const latestRecord = rainfallData[rainfallData.length - 1];
            const latestDate = new Date(latestRecord?.date || latestRecord?.yearMonth || Date.now());
            const now = new Date();
            const monthsElapsed = (now.getFullYear() - latestDate.getFullYear()) * 12 + (now.getMonth() - latestDate.getMonth());
            if (monthsElapsed > 2) {
                rainfallStatus = 'stale';
            }
        }

        // 5. VALIDATION GUARD: Invalid data never overwrites the last good snapshot
        if (!subzoneMetrics || !Array.isArray(subzoneMetrics) || subzoneMetrics.length === 0) {
            throw new Error("Validation Error: Computed subzone metrics resulted in an empty array. Aborting to protect last good snapshot.");
        }

        // 6. Publish Final Validated Snapshot
        const finalSnapshot = {
            lastUpdated: new Date().toISOString(),
            datasetStatuses: {
                rainfallMonthly: rainfallStatus,
                weatherBaselines: "fresh",
                dengueClusters: "fresh"
            },
            subzones: subzoneMetrics
        };

        const snapshotOutputPath = path.join(derivedDir, 'latest-snapshot.json');
        fs.writeFileSync(snapshotOutputPath, JSON.stringify(finalSnapshot, null, 2));

        // Also write master manifest for backward compatibility
        const masterManifestPath = path.join(process.cwd(), 'snapshot.json');
        fs.writeFileSync(masterManifestPath, JSON.stringify({ lastUpdated: new Date().toISOString(), ...results }, null, 4));

        console.log("Successfully completed data sync, spatial join, validation, and snapshot publication!");

    } catch (error: any) {
        console.error("Error during data sync:", error.message);
        // CRITICAL: Exit with non-zero exit code so the GitHub Action fails and 
        // the previous 'latest-snapshot.json' file remains completely untouched.
        process.exit(1);
    }
}

syncAllData();