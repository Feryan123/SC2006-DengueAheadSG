import { describe, it, expect } from 'vitest';
import { FACTOR_RANK, rankSumWeights } from './riskModelConfig.ts';
import { RiskFactorType } from '../entity/enums.ts';

describe('rankSumWeights', () => {
  it('weights sum to 1', () => {
    const weights = rankSumWeights(FACTOR_RANK);
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1);
  });
  it('DENGUE_CLUSTERS is 5/15', () => {
    const weights = rankSumWeights(FACTOR_RANK);
    expect(weights[RiskFactorType.DengueClusters]).toBeCloseTo(5/15);
  })
  it('HIGH_AEDES_AREA is 4/15', () => {
    const weights = rankSumWeights(FACTOR_RANK);
    expect(weights[RiskFactorType.HighAedesArea]).toBeCloseTo(4/15);
  })
  it('POPULATION_DESNITY is 3/15', () => {
    const weights = rankSumWeights(FACTOR_RANK);
    expect(weights[RiskFactorType.PopulationDensity]).toBeCloseTo(3/15);
  })
  it('HUMIDITY is 2/15', () => {
    const weights = rankSumWeights(FACTOR_RANK);
    expect(weights[RiskFactorType.Humidity]).toBeCloseTo(2/15);
  })
  it('LAGGED_RAINFALL is 1/15', () => {
    const weights = rankSumWeights(FACTOR_RANK);
    expect(weights[RiskFactorType.LaggedRainfall]).toBeCloseTo(1/15);
  })
  it('rank 1 (DENGUE_CLUSTERS) has the largest weight', () => {
    const weights = rankSumWeights(FACTOR_RANK);
    const top = weights[RiskFactorType.DengueClusters];

    for (const w of Object.values(weights)) {
      expect(w).toBeLessThanOrEqual(top);
    }
  });

  it('throws on invalid ranks', () => {
    const tooHigh = { ...FACTOR_RANK, [RiskFactorType.Humidity]: 6};
    const notWhole = { ...FACTOR_RANK, [RiskFactorType.Humidity]: 2.5};
    const duplicate = { ...FACTOR_RANK, [RiskFactorType.Humidity]: 1 };

    expect(() => rankSumWeights(tooHigh)).toThrow();
    expect(() => rankSumWeights(notWhole)).toThrow();
    expect(() => rankSumWeights(duplicate)).toThrow();
  });

});
