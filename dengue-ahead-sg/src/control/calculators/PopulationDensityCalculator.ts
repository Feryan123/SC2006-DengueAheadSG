/**
 * Traces to: PopulationDensityCalculator (implements RiskFactorCalculator, Strategy) in class diagram
 * Related use case(s): UC-1 Assess Location Risk · Ticket 5
 * Score = percentile of residentsPerKm2 among subzones with residents.
 * Zero-resident subzones (industrial, nature reserves, airport) are left out of the
 * ranking population so they don't inflate everyone else's score; they still score 0.
 */
import { RiskFactorType } from '../../entity/enums.ts';
import type { PlanningSubzone } from '../../entity/PlanningSubzone.ts';
import type { PublicDataSnapshot } from '../../services/ApprovedPublicDataServiceBoundary.ts';
import { percentileScore } from './percentileScore.ts';
import type { FactorResult, RiskFactorCalculator } from './RiskFactorCalculator.ts';

export class PopulationDensityCalculator implements RiskFactorCalculator {
    readonly factorType = RiskFactorType.PopulationDensity;

    calculate(subzone: PlanningSubzone, snapshot: PublicDataSnapshot): FactorResult | null {
        if(snapshot.subzones == null) return null;
        
        const population = snapshot.subzones.map(s => s.residentsPerKm2).filter(d => d > 0);
        const inputValue = subzone.residentsPerKm2;
        const score = percentileScore(inputValue, population);

        return (score == null ? null : {inputValue, score});
    }
}
