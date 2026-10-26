/**
 * Traces to: HumidityCalculator (implements RiskFactorCalculator, Strategy) in class diagram
 * Related use case(s): UC-1 Assess Location Risk · Ticket 6
 */
import { RiskFactorType } from '../../entity/enums.ts';
import type { PlanningSubzone } from '../../entity/PlanningSubzone.ts';
import type { PublicDataSnapshot } from '../../services/ApprovedPublicDataServiceBoundary.ts';
import { anomalyScore } from './anomalyScore.ts';
import type { FactorResult, RiskFactorCalculator } from './RiskFactorCalculator.ts';

export class HumidityCalculator implements RiskFactorCalculator {
  readonly factorType = RiskFactorType.Humidity;

  calculate(_subzone: PlanningSubzone, snapshot: PublicDataSnapshot): FactorResult | null {
    const weather = snapshot.weather;
    if (!weather) return null;
    const score = anomalyScore(weather.meanHumidityPct, weather.humidityNormalMean, weather.humidityNormalSd);
    if (score === null) return null;
    return { inputValue: weather.meanHumidityPct, score };
  }
}
