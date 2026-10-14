/**
 * Traces to: SimulationScenario (<<entity>>) in class diagram
 * Related use case(s): UC-4 Simulate Risk Scenario (Recalculate & Compare Simulated Risk Index, Reset Factors to Baseline)
 *
 * ATTRIBUTES:
 * - scenarioId : String — unique identifier of the scenario
 * - createdAt : DateTime — when the scenario was created
 * - isHypothetical : Boolean — marks the result as hypothetical
 *
 * Relationships:
 * - SimulationScenario 0..* —— 1 RiskAssessment, role "Baseline Assessment" (multiplicity TODO(verify))
 * - SimulationScenario 0..1 —— 1 RiskAssessment, role "Simulated Assessment" (multiplicity TODO(verify))
 * - SimulationScenario 1 ◆—— 0..* ScenarioAdjustment (composition; multiplicity TODO(verify))
 * - Dashed dependency between SimulationScenario and PreventionChecklist (direction/meaning TODO(verify))
 */

import type { ScenarioAdjustment } from './ScenarioAdjustment.ts';
import type { DateTime } from './types.ts';

export interface SimulationScenario {
  scenarioId: string;
  createdAt: DateTime;
  isHypothetical: boolean;
  /** "Baseline Assessment" role */
  baselineAssessmentId: string;
  /** "Simulated Assessment" role — 0..1, absent until recalculated */
  simulatedAssessmentId?: string;
  /** composition ◆—— 0..* — TODO(verify) multiplicity */
  adjustments: ScenarioAdjustment[];
}
