/**
 * Traces to: HighAedesAreaCalculator (implements RiskFactorCalculator, Strategy) in class diagram
 * Related use case(s): UC-1 Assess Location Risk · Ticket 5
 * Score = percentile of aedesOverlapRatio among all subzones.
 */
import { RiskFactorType } from '../../entity/enums.ts';
import type { PlanningSubzone } from '../../entity/PlanningSubzone.ts';
import type { PublicDataSnapshot } from '../../services/ApprovedPublicDataServiceBoundary.ts';
import { percentileScore } from './percentileScore.ts';
import type { FactorResult, RiskFactorCalculator } from './RiskFactorCalculator.ts';

export class HighAedesAreaCalculator implements RiskFactorCalculator {
  readonly factorType = RiskFactorType.HighAedesArea;

  calculate(subzone: PlanningSubzone, snapshot: PublicDataSnapshot): FactorResult | null {
    if(snapshot.subzones == null) return null;

    const population = snapshot.subzones.map(s => s.aedesOverlapRatio);
    const inputValue = subzone.aedesOverlapRatio;
    const score = percentileScore(inputValue, population);
        
    return (score == null ? null : {inputValue, score});
  }
}
