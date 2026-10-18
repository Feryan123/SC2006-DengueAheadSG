/**
 * Traces to: RiskSimulationControl (<<control>>) in class diagram
 * Related use case(s): UC-4 Simulate Risk Scenario
 *
 * METHODS:
 * - validateAdjustment() — check that a ScenarioAdjustment is allowed
 * - recalculateScenario() — recalculate the simulated risk index and compare it with the baseline
 * - resetScenario() — reset factors back to the baseline assessment
 *
 * Relationships (dependencies):
 * - Called by SimulationBoundary
 * - Uses RiskAssessmentControl
 * - Reads/writes SimulationScenario, ScenarioAdjustment
 */

import type { RiskAssessment } from '../entity/RiskAssessment.ts';
import type { ScenarioAdjustment } from '../entity/ScenarioAdjustment.ts';
import type { SimulationScenario } from '../entity/SimulationScenario.ts';
import type { RiskAssessmentControl } from './RiskAssessmentControl.ts';
import type { PublicDataSnapshot } from '../services/ApprovedPublicDataServiceBoundary.ts';


// What recalculateScenario gives back to the boundary, so it can show the comparison
export interface SimulationResult {
  scenario: SimulationScenario;
  baseline: RiskAssessment;
  simulated: RiskAssessment;
}

export class RiskSimulationControl {
  readonly riskAssessmentControl: RiskAssessmentControl;

  constructor(riskAssessmentControl: RiskAssessmentControl) {
    this.riskAssessmentControl = riskAssessmentControl;
  }

  async validateAdjustment(_adjustment: ScenarioAdjustment): Promise<boolean> {
    // TODO: factorType must be an AdjustableRiskFactorType (population density can't be adjusted)
    // TODO: adjustmentLevel must be a valid AdjustmentLevel
    throw new Error('Not implemented');
  }

  
  async recalculateScenario(_baseline: RiskAssessment,_adjustments: ScenarioAdjustment[],_snapshot: PublicDataSnapshot,): Promise<SimulationResult> {
    // TODO: validate each adjustment
    // TODO: get baseline inputs with riskAssessmentControl.collectInputs(baseline.subzoneId, snapshot)
    // TODO: change the inputs based on each adjustment (decide how much DECREASE / INCREASE changes them)
    // TODO: riskAssessmentControl.generateAssessment(..., { inputs, assessmentType: SIMULATED })
    // TODO: build a SimulationScenario (isHypothetical = true, baselineAssessmentId, simulatedAssessmentId)
    throw new Error('Not implemented');
  }

  async resetScenario(_scenario: SimulationScenario): Promise<SimulationScenario> {
    // TODO: clear adjustments, remove simulatedAssessmentId, so only the baseline is left
    throw new Error('Not implemented');
  }

}
