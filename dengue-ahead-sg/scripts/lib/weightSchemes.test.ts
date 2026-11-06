import { describe, expect, it } from 'vitest';
import { RiskFactorType } from '../../src/entity/enums.ts';
import { FACTOR_RANK, rankSumWeights } from '../../src/control/riskModelConfig.ts';
import { adjustWeight, equalWeights, rankOrderCentroidWeights, rankReciprocalWeights } from './weightSchemes.ts';

const sum = (w: Record<string, number>) => Object.values(w).reduce((a, b) => a + b, 0);
const byRank = (w: Record<RiskFactorType, number>) =>
  Object.values(RiskFactorType).sort((a, b) => FACTOR_RANK[a] - FACTOR_RANK[b]).map((f) => w[f]);

describe('weight schemes (Ticket 35)', () => {
  it.each([
    ['ROC', rankOrderCentroidWeights],
    ['rank reciprocal', rankReciprocalWeights],
    ['equal', equalWeights],
  ])('%s weights sum to 1 and never increase with rank', (_name, scheme) => {
    const w = scheme(FACTOR_RANK);
    expect(sum(w)).toBeCloseTo(1, 10);
    const ordered = byRank(w);
    for (let i = 1; i < ordered.length; i++) expect(ordered[i]).toBeLessThanOrEqual(ordered[i - 1]);
  });

  it('ROC for 5 factors: 0.4567, 0.2567, 0.1567, 0.09, 0.04', () => {
    const expected = [137 / 300, 77 / 300, 47 / 300, 27 / 300, 12 / 300];
    byRank(rankOrderCentroidWeights(FACTOR_RANK)).forEach((w, i) => expect(w).toBeCloseTo(expected[i], 10));
  });

  it('rank reciprocal for 5 factors: 60/137, 30/137, 20/137, 15/137, 12/137', () => {
    const expected = [60, 30, 20, 15, 12].map((x) => x / 137);
    byRank(rankReciprocalWeights(FACTOR_RANK)).forEach((w, i) => expect(w).toBeCloseTo(expected[i], 10));
  });

  it('equal weights are all 1/5', () => {
    for (const w of Object.values(equalWeights(FACTOR_RANK))) expect(w).toBeCloseTo(0.2, 10);
  });

  it('rejects duplicate or out-of-range ranks', () => {
    expect(() => equalWeights({ ...FACTOR_RANK, [RiskFactorType.Humidity]: 1 })).toThrow(RangeError);
    expect(() => rankOrderCentroidWeights({ ...FACTOR_RANK, [RiskFactorType.Humidity]: 6 })).toThrow(RangeError);
  });
});

describe('adjustWeight', () => {
  const base = rankSumWeights(FACTOR_RANK);

  it('+20% on clusters: 5/15 × 1.2 = 0.4, total 1.0667, rescaled to 0.375', () => {
    const w = adjustWeight(base, RiskFactorType.DengueClusters, 1.2);
    expect(sum(w)).toBeCloseTo(1, 10);
    expect(w[RiskFactorType.DengueClusters]).toBeCloseTo(0.4 / (1 + 0.4 - 5 / 15), 10);
  });

  it('keeps the other factors in the same proportion to each other', () => {
    const w = adjustWeight(base, RiskFactorType.Humidity, 0.8);
    expect(w[RiskFactorType.HighAedesArea] / w[RiskFactorType.PopulationDensity]).toBeCloseTo(4 / 3, 10);
  });

  it('does not change the input weights', () => {
    adjustWeight(base, RiskFactorType.DengueClusters, 1.2);
    expect(base[RiskFactorType.DengueClusters]).toBeCloseTo(5 / 15, 10);
  });

  it('rejects a multiplier of 0 or less', () => {
    expect(() => adjustWeight(base, RiskFactorType.Humidity, 0)).toThrow(RangeError);
  });
});
