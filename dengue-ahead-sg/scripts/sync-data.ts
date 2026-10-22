import fs from 'fs';
import path from 'path';
import { DataGovSgAdapter } from '../src/services/DataGovSgAdapter.ts';

// 1. Static historical datasets (Downloaded ONCE and cached forever)
const STATIC_DATASETS = [
    { key: "ds2020PopulationDensity", id: "d_d95ae740c0f8961a0b10435836660ce0" },
    { key: "ds2024Temperature", id: "d_910c81fce47f38574015b3882ac59254" },
    { key: "ds2023Temperature", id: "d_370bbfc65de96ad93eaefa182135d1c0" },
    { key: "ds2022Temperature", id: "d_6fd47a46bd59c5cb70d9561b404d0a64" },
    { key: "ds2021Temperature", id: "d_557fbb859f12a8af29ef4e1375288165" },
    { key: "ds2020Temperature", id: "d_10d453bc02d1a41daf6373b96b1929e4" },
    { key: "ds2024RelativeHumidity", id: "d_7916c4c0cbe0dfaadaeac4b56d732a2a" },
    { key: "ds2023RelativeHumidity", id: "d_d6fb7c8f42cacf73af76d17518c39f24" },
    { key: "ds2022RelativeHumidity", id: "d_6ecc4ed07e7dcc024c22e548aa1e86f6" },
    { key: "ds2021RelativeHumidity", id: "d_b30e532f095592dfa8fef924c2325b38" },
    { key: "ds2020RelativeHumidity", id: "d_15f4385609fa3aa8f5812872586cbb80" },
    { key: "ds2024Rainfall", id: "d_a0b69d3e02576a1fd0ab673e71f83507" }
];

// 2. Dynamic Poll-Download Datasets (REFRESHED EVERY TIME your script runs)
const DYNAMIC_DATASET_IDS: Record<string, string> = {
    dengueClusters: "d_dbfabf16158d1b0e1c420627c0819168",
    highAedesAreas: "d_5d060d8b7838a15e8906fb22c50dbf51"
};

// 3. Real-time weather API endpoints (REFRESHED EVERY TIME)
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
                console.log(`[Static] Downloading new historical dataset: ${item.key}...`);
                await adapter.fetchPollDownloadToDisk(item.id, filePath);
            }
            staticManifest[item.key] = path.relative(process.cwd(), filePath);
        }
        results.staticData = staticManifest;

        // B. Handle Dynamic Datasets (Always downloads fresh data on every run)
        const dynamicManifest: Record<string, string> = {};
        for (const [key, datasetId] of Object.entries(DYNAMIC_DATASET_IDS)) {
            const filePath = path.join(dynamicDir, `${key}.json`);
            console.log(`[Dynamic] Fetching latest live data for: ${key}...`);
            await adapter.fetchPollDownloadToDisk(datasetId, filePath);
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
        
        console.log("Successfully completed data sync! Static files are cached, dynamic feeds are updated.");

    } catch (error: any) {
        console.error("Error during data sync:", error.message);
        process.exit(1);
    }
}

syncAllData();