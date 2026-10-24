import { describe, it, expect } from 'vitest';
import { normaliseName, parseCount, buildPopulationIndex, density } from './census.ts';

const rows = [
  { Number: 'Total', Total_Total: '4044210' },
  { Number: 'Yishun - Total', Total_Total: '220000' },
  { Number: 'Yishun West', Total_Total: '53910' },
  { Number: 'Yishun Central', Total_Total: '-' },
];

describe('normaliseName', () => {
  it('trims, uppercases and collapses spaces', () => {
    expect(normaliseName('  Yishun   West ')).toBe('YISHUN WEST');
  });
});

describe('parseCount', () => {
  it("treats '-' as 0", () => {
    expect(parseCount('-')).toBe(0);
  });

  it('parses a numeric string', () => {
    expect(parseCount('53910')).toBe(53910);
  });

  it('throws on non-numeric text', () => {
    expect(() => parseCount('abc')).toThrow();
  });
});

describe('buildPopulationIndex', () => {
  it("skips 'Total' and '- Total' rows", () => {
    const index = buildPopulationIndex(rows);
    expect(index.size).toBe(2);
  });

  it('keys by normalised name', () => {
    const index = buildPopulationIndex(rows);
    expect(index.get('YISHUN WEST')).toBe(53910);
  });

  it("stores '-' rows as 0", () => {
    const index = buildPopulationIndex(rows);
    expect(index.get('YISHUN CENTRAL')).toBe(0);
  });
});
