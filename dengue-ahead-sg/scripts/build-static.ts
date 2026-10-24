/**
 * Traces to: #11 build-static (Retrieve / Refresh Public Data)
 * Builds weatherBaselines.json once, locally, from the monthly datasets fetched by `npm run sync`.
 * Run: npm run build-static
 */
import fs from 'fs';
import path from 'path';
import { computeMonthlyBaselines } from './lib/baselines.ts';

const DYNAMIC_DIR = path.join(process.cwd(), 'data', 'dynamic');
const OUT_DIR = path.join(process.cwd(), 'data', 'derived');

/** Reads a datastore_search file and returns its rows. */
function readRecords(fileName: string) {
  const json = JSON.parse(fs.readFileSync(path.join(DYNAMIC_DIR, fileName), 'utf8'));
  return json.result.records;
}

const humidityRecords = readRecords('relativeHumidityMonthly.json');
const rainfallRecords = readRecords('rainfallMonthly.json');

const baselines = {
  generatedAt: new Date().toISOString(),
  humidity: {
    period: '2014-2025',
    byMonth: computeMonthlyBaselines(humidityRecords, 'mean_rh', 2014, 2025),
  },
  rainfall: {
    period: '1991-2020',
    byMonth: computeMonthlyBaselines(rainfallRecords, 'total_rainfall', 1991, 2020),
  },
};

fs.mkdirSync(OUT_DIR, { recursive: true });
const outPath = path.join(OUT_DIR, 'weatherBaselines.json');
fs.writeFileSync(outPath, JSON.stringify(baselines, null, 2));
console.log(`Wrote ${outPath}`);
