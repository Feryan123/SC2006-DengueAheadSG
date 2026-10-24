import { describe, it, expect } from 'vitest';
import fs from 'fs';

interface Subzone {
  subzoneId: string;
  name: string;
  residentCount: number;
  residentsPerKm2: number;
}

const subzones: Subzone[] = JSON.parse(fs.readFileSync('data/derived/subzones.json', 'utf8'));

describe('data/derived/subzones.json', () => {
  it('has all 332 URA MP2019 subzones', () => {
    expect(subzones.length).toBe(332);
  });

  it('has a unique subzoneId for every subzone', () => {
    const ids = subzones.map((s) => s.subzoneId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has a non-negative numeric residentCount for every subzone', () => {
    const bad = subzones.filter(
      (s) => typeof s.residentCount !== 'number' || !(s.residentCount >= 0),
    );
    expect(bad.map((s) => s.name)).toEqual([]);
  });

  it('has a finite residentsPerKm2 for every subzone', () => {
    const bad = subzones.filter((s) => !Number.isFinite(s.residentsPerKm2));
    expect(bad.map((s) => s.name)).toEqual([]);
  });
});