/**
 * Traces to: LaggedRainfallCalculator (implements RiskFactorCalculator, Strategy) in class diagram
 * Related use case(s): UC-1 Assess Location Risk
 * Monthly rainfall total from 2–3 months ago vs that calendar month's 1991–2020 normal.
 * The lagged month is chosen by the sync job (Ticket 12) when it builds WeatherProfile; this class trusts it.
 */
import { RiskFactorType } from '../../entity/enums.ts';
import type { PlanningSubzone } from '../../entity/PlanningSubzone.ts';
import type { PublicDataSnapshot } from '../../services/ApprovedPublicDataServiceBoundary.ts';
import { anomalyScore } from './anomalyScore.ts';
import type { FactorResult, RiskFactorCalculator } from './RiskFactorCalculator.ts';

export class LaggedRainfallCalculator implements RiskFactorCalculator {
  readonly factorType = RiskFactorType.LaggedRainfall;

  calculate(_subzone: PlanningSubzone, snapshot: PublicDataSnapshot): FactorResult | null {
    const weather = snapshot.weather;
    if (!weather) return null;
    const score = anomalyScore(weather.rainfallMm, weather.rainfallNormalMean, weather.rainfallNormalSd);
    if (score === null) return null;
    return { inputValue: weather.rainfallMm, score };
  }
}
