import { Z_CAP } from '../riskModelConfig.ts';

/** z = (value - mean) / sd, mapped linearly: -Z_CAP → 0, 0 → 50, +Z_CAP → 100. null if inputs are unusable. */
export function anomalyScore(value: number, mean: number, sd: number): number | null {
  if(!Number.isFinite(value) || !Number.isFinite(mean) || !Number.isFinite(sd) || sd <= 0){ return null; }

  const z = (value-mean)/sd;
  const score = 50 + (z / Z_CAP) * 50;

  return Math.min(100, Math.max(0, score));
}
