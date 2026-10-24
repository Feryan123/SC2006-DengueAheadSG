import { describe, it, expect } from 'vitest';
import { computeMonthlyBaselines } from './baselines.ts';

const recs = [
  { month: '2019-01', v: '10' },   // testing outside range
  { month: '2020-01', v: '2' },
  { month: '2021-01', v: '4' },
  { month: '2020-02', v: '5' },
  { month: '2021-02', v: '5' },
];

describe('computeMonthlyBaselines', () => {
  it('averages each calendar month within the year range', () => {
    const b = computeMonthlyBaselines(recs, 'v', 2020, 2021);
    expect(b['01'].mean).toBeCloseTo(3);
  });
  it('January SD must be around 1.414', () => {
    const b = computeMonthlyBaselines(recs, 'v', 2020, 2021);
    expect(b['01'].sd).toBeCloseTo(1.414);
  });
  it('January n has to be 2', () => {
    const b = computeMonthlyBaselines(recs, 'v', 2020, 2021);
    expect(b['01'].n).toBeCloseTo(2);
  });
  it('February SD must be 0', () => {
    const b = computeMonthlyBaselines(recs, 'v', 2020, 2021);
    expect(b['02'].sd).toBeCloseTo(0);
  });
    it('throws when the field is missing or not a number', () => {
    expect(() => computeMonthlyBaselines(recs, 'vv', 2020, 2021)).toThrow();
  });
});
