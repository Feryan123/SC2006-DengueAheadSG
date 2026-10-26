/**
 * Traces to: RiskFactorCalculator <<interface>> (Strategy) in class diagram
 */
import type { RiskFactorType } from '../../entity/enums.ts';
import type { PlanningSubzone } from '../../entity/PlanningSubzone.ts';
import type { PublicDataSnapshot } from '../../services/ApprovedPublicDataServiceBoundary.ts';

export interface FactorResult {
  inputValue: number;  // the raw value (e.g. 82.5 %), shown as RiskFactorContribution.inputValue
  score: number;       // 0–100
}

export interface RiskFactorCalculator {
  readonly factorType: RiskFactorType;
  calculate(subzone: PlanningSubzone, snapshot: PublicDataSnapshot): FactorResult | null;
}
