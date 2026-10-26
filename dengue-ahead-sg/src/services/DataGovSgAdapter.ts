import fs from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';

const streamPipeline = promisify(pipeline);

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

    /**
     * Helper to execute a fetch request with exponential backoff and jitter.
     */
    private async fetchWithRetry(url: string, options: RequestInit = {}, maxRetries = 3, baseDelayMs = 1000): Promise<Response> {
        let lastError: any;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const res = await fetch(url, options);
                // Retry on server errors (5xx) or rate limits (429)
                if (!res.ok && (res.status >= 500 || res.status === 429)) {
                    throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
                }
                return res;
            } catch (err: any) {
                lastError = err;
                if (attempt === maxRetries) {
                    break;
                }
                const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;
                console.warn(`[DataGovSgAdapter] Fetch failed for ${url} (Attempt ${attempt + 1}/${maxRetries + 1}): ${err.message}. Retrying in ${Math.round(delay)}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        throw new Error(`Failed to fetch ${url} after ${maxRetries + 1} attempts. Last error: ${lastError?.message}`);
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

        const res = await this.fetchWithRetry(url, { headers: this.getHeaders() });
        return await res.json();
    }

    // 2. Stream-based Poll-Download workflow with backoff
    public async fetchPollDownloadToDisk(datasetId: string, outputPath: string): Promise<void> {
        const initUrl = `https://api-open.data.gov.sg/v1/public/api/datasets/${datasetId}/initiate-download`;
        const pollUrl = `https://api-open.data.gov.sg/v1/public/api/datasets/${datasetId}/poll-download`;

        const initRes = await this.fetchWithRetry(initUrl, { headers: this.getHeaders() });
        const initJson = await initRes.json();
        
        if (initJson.code !== 0) {
            throw new Error(`Init failed for dataset ${datasetId}: ${initJson.errMsg || 'Unknown error'}`);
        }

        let fileUrl: string | null = null;
        for (let attempt = 0; attempt < 5; attempt++) {
            const pollRes = await this.fetchWithRetry(pollUrl, { headers: this.getHeaders() });
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

        const fileRes = await this.fetchWithRetry(fileUrl);

        if (!fileRes.body) {
            throw new Error(`Response body is missing for dataset ${datasetId}`);
        }

        const fileStream = fs.createWriteStream(outputPath);
        await streamPipeline(fileRes.body as any, fileStream);
    }

    // 3. Datastore Search wrapper
    public async fetchDatastoreSearch(resourceId: string, outputPath: string): Promise<void> {
        return await this.fetchPollDownloadToDisk(resourceId, outputPath);
    }

    // 4. Datastore Search / CSV Fetcher (For tabular datasets)
    public async fetchDatastoreRecords(resourceId: string, outputPath: string, limit: number = 50000): Promise<void> {
        const searchUrl = `https://data.gov.sg/api/action/datastore_search?resource_id=${resourceId}&limit=${limit}`;
        
        const res = await this.fetchWithRetry(searchUrl, { headers: this.getHeaders() });
        const json = await res.json();
        fs.writeFileSync(outputPath, JSON.stringify(json, null, 4));
    }
}