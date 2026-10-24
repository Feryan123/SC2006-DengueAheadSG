/**
 * Traces to: #11 build-static (Retrieve / Refresh Public Data)
 * Builds weatherBaselines.json once, locally, from the monthly datasets fetched by `npm run sync`.
 * Run: npm run build-static
 */
import fs from 'fs';
import path from 'path';
import { computeMonthlyBaselines } from './lib/baselines.ts';
import { buildPopulationIndex, density, normaliseName } from './lib/census.ts';

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

const STATIC_DIR = path.join(process.cwd(), 'data', 'static');

interface BoundaryFeature {
  properties: { SUBZONE_C: string; SUBZONE_N: string; PLN_AREA_N: string; 'SHAPE.AREA': number };
  geometry: unknown;   // Polygon or MultiPolygon, passed through as-is
}

const censusRecords = JSON.parse(
  fs.readFileSync(path.join(STATIC_DIR, 'ds2020PopulationDensity.json'), 'utf8'),
).result.records;
const boundaryFeatures: BoundaryFeature[] = JSON.parse(
  fs.readFileSync(path.join(STATIC_DIR, 'subzonesBoundary.json'), 'utf8'),
).features;

const populationIndex = buildPopulationIndex(censusRecords);
const unmatched: string[] = [];

const subzones = boundaryFeatures.map((f) => {
  const p = f.properties;
  const residents = populationIndex.get(normaliseName(p.SUBZONE_N));
  if (residents === undefined) {
    unmatched.push(p.SUBZONE_N)
  }
  const areaM2 = p['SHAPE.AREA'];
  return {
    subzoneId: p.SUBZONE_C,
    name: p.SUBZONE_N,
    planningArea: p.PLN_AREA_N,
    residentCount: residents ?? 0,
    areaKm2: areaM2 / 1_000_000,
    residentsPerKm2: density(residents ?? 0, areaM2),
    boundary: f.geometry,
  };
});

if (unmatched.length > 0) {
  throw new Error(`'${unmatched.length}' boundary subzones has no census match: '${unmatched.join(', ')}`)
}

fs.writeFileSync(path.join(OUT_DIR, 'subzones.json'), JSON.stringify(subzones));
console.log(`Wrote ${subzones.length} subzones`);
