import fs from 'fs';
import path from 'path';
import { DataGovSgAdapter } from '../src/services/DataGovSgAdapter.ts';

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
    "airTemperature",
    "rainfall",
    "relativeHumidity"
];

async function syncAllData(): Promise<void> {
    try {
        console.log("Starting multi-source data sync...");
        const adapter = new DataGovSgAdapter();
        const results: Record<string, any> = {};

        // Ensure directories exist
        const staticDir = path.join(process.cwd(), 'data', 'static');
        const dynamicDir = path.join(process.cwd(), 'data', 'dynamic');
        
        if (!fs.existsSync(staticDir)) fs.mkdirSync(staticDir, { recursive: true });
        if (!fs.existsSync(dynamicDir)) fs.mkdirSync(dynamicDir, { recursive: true });

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

        // D. Write master snapshot manifest
        const combinedSnapshot = {
            lastUpdated: new Date().toISOString(),
            ...results
        };

        const outputPath = path.join(process.cwd(), 'snapshot.json');
        fs.writeFileSync(outputPath, JSON.stringify(combinedSnapshot, null, 4));
        
        console.log("Successfully completed data sync! Static files cached, dynamic poll & datastore tables updated.");

    } catch (error: any) {
        console.error("Error during data sync:", error.message);
        process.exit(1);
    }
}

syncAllData();