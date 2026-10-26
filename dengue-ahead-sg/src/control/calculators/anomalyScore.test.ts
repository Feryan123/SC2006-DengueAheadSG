import { describe, it, expect } from 'vitest';
import { anomalyScore } from './anomalyScore.ts';

describe('anomalyScore', () => {
  it('scores a normal month (value = mean) as 50', () => {
    expect(anomalyScore(80, 80, 4)).toBe(50);
  });

  it('scores +1 SD as 75', () => {
    expect(anomalyScore(84, 80, 4)).toBeCloseTo(75);
  });

  it('scores +2 SD as 100', () => {
    expect(anomalyScore(88, 80, 4)).toBeCloseTo(100);
  });

  it('clamps anything beyond +2 SD to 100', () => {
    expect(anomalyScore(104, 80, 4)).toBe(100);
  });

  it('scores -2 SD as 0', () => {
    expect(anomalyScore(72, 80, 4)).toBeCloseTo(0);
  });

  it('returns null when sd is 0', () => {
    expect(anomalyScore(82, 80, 0)).toBeNull();
  });

  it('returns null for a NaN input', () => {
    expect(anomalyScore(NaN, 80, 4)).toBeNull();
  });
});
