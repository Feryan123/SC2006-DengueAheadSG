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
 * - SimulationScenario 0..* —— 1 RiskAssessment, role "Baseline Assessment" (baselineAssessmentId, required)
 * - SimulationScenario 0..1 —— 1 RiskAssessment, role "Simulated Assessment" (simulatedAssessmentId, optional)
 * - SimulationScenario 1 ◆—— 0..* ScenarioAdjustment (composition; empty after reset)
 * - Dashed dependency with PreventionChecklist in the class diagram (no field links them in code)
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
  /** composition ◆—— 0..* (empty after reset) */
  adjustments: ScenarioAdjustment[];
}
