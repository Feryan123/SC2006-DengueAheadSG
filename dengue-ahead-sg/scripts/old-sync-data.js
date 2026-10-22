import fs from 'fs';
import path from 'path';

// 1. Downloadable file datasets (Initiate -> Poll workflow)
const DATASET_IDS = {
    dengueClusters: "d_dbfabf16158d1b0e1c420627c0819168",
    highAedesAreas: "d_5d060d8b7838a15e8906fb22c50dbf51"
};

// 2. Real-time API endpoints (Direct GET request)
const REALTIME_ENDPOINTS = {
    airTemperature: "https://api-open.data.gov.sg/v2/real-time/api/air-temperature",
    rainfall: "https://api-open.data.gov.sg/v2/real-time/api/rainfall",
    relativeHumidity: "https://api-open.data.gov.sg/v2/real-time/api/relative-humidity"
};

// Helper function to handle the Initiate -> Poll -> Download cycle for file datasets
async function fetchDatasetById(datasetId, headers) {
    const initUrl = `https://api-open.data.gov.sg/v1/public/api/datasets/${datasetId}/initiate-download`;
    const pollUrl = `https://api-open.data.gov.sg/v1/public/api/datasets/${datasetId}/poll-download`;

    const initRes = await fetch(initUrl, { method: 'GET', headers });
    const initJson = await initRes.json();
    if (initJson.code !== 0) {
        throw new Error(`Init failed for ${datasetId}: ${initJson.errMsg || 'Unknown error'}`);
    }

    let fileUrl = null;
    for (let attempt = 0; attempt < 5; attempt++) {
        const pollRes = await fetch(pollUrl, { method: 'GET', headers });
        const pollJson = await pollRes.json();
        
        if (pollJson.code === 0 && pollJson.data?.url) {
            fileUrl = pollJson.data.url;
            break;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (!fileUrl) {
        throw new Error(`Polling timed out or failed to return URL for dataset ${datasetId}`);
    }

    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) {
        throw new Error(`Failed to download payload file for ${datasetId}: HTTP ${fileRes.status}`);
    }

    return await fileRes.json();
}

// Master sync execution function
async function syncAllData() {
    try {
        const headers = {
            "User-Agent": "DengueAheadSG-Bot",
            ...(process.env.DATA_GOV_API_KEY && { "x-api-key": process.env.DATA_GOV_API_KEY })
        };

        console.log("Starting comprehensive multi-source data sync...");
        const results = {};

        // Step A: Fetch all downloadable file datasets
        for (const [key, datasetId] of Object.entries(DATASET_IDS)) {
            console.log(`Fetching dataset file: ${key} (${datasetId})...`);
            results[key] = await fetchDatasetById(datasetId, headers);
        }

        // Step B: Fetch all live real-time APIs
        for (const [key, url] of Object.entries(REALTIME_ENDPOINTS)) {
            console.log(`Fetching real-time API: ${key}...`);
            const res = await fetch(url, { headers });
            if (!res.ok) {
                throw new Error(`Failed to fetch real-time endpoint ${key}: HTTP ${res.status}`);
            }
            results[key] = await res.json();
        }

        // Step C: Bundle everything together with a timestamp
        const combinedSnapshot = {
            lastUpdated: new Date().toISOString(),
            ...results
        };

        // Step D: Safely write out snapshot.json at the root
        const outputPath = path.join(process.cwd(), 'snapshot.json');
        fs.writeFileSync(outputPath, JSON.stringify(combinedSnapshot, null, 4));
        
        console.log(`Successfully updated snapshot.json with all data sources!`);

    } catch (error) {
        console.error("Error during data sync:", error.message);
        process.exit(1);
    }
}

syncAllData();