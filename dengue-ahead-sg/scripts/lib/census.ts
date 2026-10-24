export interface CensusRecord { Number: string; Total_Total: string }

/** 'Yishun  West ' → 'YISHUN WEST', so census and boundary names compare equal. */
export function normaliseName(name: string): string {
  return name.trim().toUpperCase().replace(/\s+/g, ' ');
}

/** Census counts are strings; '-' means 0. */
export function parseCount(raw: string): number {
  if (raw.trim() === '-') return 0;
  const n = Number(raw);
  if (Number.isNaN(n)) {
    throw new Error(`Non-numeric census count: '${raw}'`);
  }
  return n;
}

/** Map of normalised subzone name → resident count, without the total rows. */
export function buildPopulationIndex(records: CensusRecord[]): Map<string, number> {
  const index = new Map<string, number>();
  for (const r of records) {
    const name = r.Number.trim();
    if (name === 'Total' || /-\s*Total$/.test(name)) continue;
    index.set(normaliseName(name), parseCount(r.Total_Total));
  }
  return index;
}

/** SHAPE.AREA is in m²; 1 km² = 1,000,000 m². */
export function density(residents: number, areaM2: number): number {
  return residents / (areaM2 / 1_000_000);
}