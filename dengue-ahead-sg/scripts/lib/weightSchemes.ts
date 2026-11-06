/**
 * Ticket 35: alternative rank-based weighting methods, compared with the rank-sum weights in riskModelConfig.ts.
 * All take the same ranks (1 = most important) and return weights that sum to 1.
 */
import type { RiskFactorType } from '../../src/entity/enums.ts';

type Weights = Record<RiskFactorType, number>;

function checkRanks(rank: Record<RiskFactorType, number>): number {
  const ranks = Object.values(rank);
  const n = ranks.length;
  if (ranks.some((r) => !Number.isInteger(r) || r < 1 || r > n) || new Set(ranks).size !== n) {
    throw new RangeError(`Ranks must be unique integers from 1 to ${n}`);
  }
  return n;
}

function mapRanks(rank: Record<RiskFactorType, number>, weightOf: (r: number, n: number) => number): Weights {
  const n = checkRanks(rank);
  return Object.fromEntries(Object.entries(rank).map(([factor, r]) => [factor, weightOf(r, n)])) as Weights;
}

/** Rank order centroid (ROC): w_r = (1/n) × Σ_{k=r..n} 1/k. */
export function rankOrderCentroidWeights(rank: Record<RiskFactorType, number>): Weights {
  return mapRanks(rank, (r, n) => {
    let sum = 0;
    for (let k = r; k <= n; k++) sum += 1 / k;
    return sum / n;
  });
}

/** Rank reciprocal (sum reciprocal): w_r = (1/r) / Σ_{k=1..n} 1/k. */
export function rankReciprocalWeights(rank: Record<RiskFactorType, number>): Weights {
  return mapRanks(rank, (r, n) => {
    let total = 0;
    for (let k = 1; k <= n; k++) total += 1 / k;
    return 1 / r / total;
  });
}

/** Equal weights: every factor 1/n (ignores the ranking). */
export function equalWeights(rank: Record<RiskFactorType, number>): Weights {
  return mapRanks(rank, (_r, n) => 1 / n);
}

/**
 * One weight multiplied by `multiplier` (1.2 = +20 %, 0.8 = −20 %), then all weights rescaled to sum to 1,
 * so the other factors keep their proportions to each other.
 */
export function adjustWeight(weights: Weights, factor: RiskFactorType, multiplier: number): Weights {
  if (!(multiplier > 0)) throw new RangeError('Multiplier must be positive');
  const changed = { ...weights, [factor]: weights[factor] * multiplier };
  const total = Object.values(changed).reduce((a, b) => a + b, 0);
  return Object.fromEntries(Object.entries(changed).map(([f, w]) => [f, w / total])) as Weights;
}
