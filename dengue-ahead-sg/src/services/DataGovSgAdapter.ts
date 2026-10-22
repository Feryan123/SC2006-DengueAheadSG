import fs from 'fs';

export class DataGovSgAdapter {
    private apiKey: string;

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env.DATA_GOV_API_KEY || '';
    }

    private getHeaders(): Record<string, string> {
        return {
            "User-Agent": "DengueAheadSG-Bot",
            ...(this.apiKey && { "x-api-key": this.apiKey })
        };
    }

    // 1. Real-time API endpoints
    public async fetchRealtime(endpointName: string): Promise<any> {
        const endpoints: Record<string, string> = {
            airTemperature: "https://api-open.data.gov.sg/v2/real-time/api/air-temperature",
            rainfall: "https://api-open.data.gov.sg/v2/real-time/api/rainfall",
            relativeHumidity: "https://api-open.data.gov.sg/v2/real-time/api/relative-humidity"
        };

        const url = endpoints[endpointName];
        if (!url) {
            throw new Error(`Unknown real-time endpoint: ${endpointName}`);
        }

        const res = await fetch(url, { headers: this.getHeaders() });
        if (!res.ok) {
            throw new Error(`Failed to fetch real-time ${endpointName}: HTTP ${res.status}`);
        }
        return await res.json();
    }

    // 2. Stream-based Poll-Download workflow (Bypasses V8 memory string size limits for large files)
    public async fetchPollDownloadToDisk(datasetId: string, outputPath: string): Promise<void> {
        const initUrl = `https://api-open.data.gov.sg/v1/public/api/datasets/${datasetId}/initiate-download`;
        const pollUrl = `https://api-open.data.gov.sg/v1/public/api/datasets/${datasetId}/poll-download`;

        const initRes = await fetch(initUrl, { headers: this.getHeaders() });
        const initJson = await initRes.json();
        
        if (initJson.code !== 0) {
            throw new Error(`Init failed for dataset ${datasetId}: ${initJson.errMsg || 'Unknown error'}`);
        }

        let fileUrl: string | null = null;
        for (let attempt = 0; attempt < 5; attempt++) {
            const pollRes = await fetch(pollUrl, { headers: this.getHeaders() });
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
            throw new Error(`Failed to download payload file for dataset ${datasetId}: HTTP ${fileRes.status}`);
        }

        const fileStream = fs.createWriteStream(outputPath);
        await new Promise((resolve, reject) => {
            if (!fileRes.body) {
                return reject(new Error(`Response body is missing for dataset ${datasetId}`));
            }
            import('stream').then(({ pipeline }) => {
                // @ts-ignore
                pipeline(fileRes.body, fileStream, (err) => {
                    if (err) reject(err);
                    else resolve(true);
                });
            });
        });
    }

    // 3. Datastore Search wrapper
    public async fetchDatastoreSearch(resourceId: string, outputPath: string): Promise<void> {
        return await this.fetchPollDownloadToDisk(resourceId, outputPath);
    }
}