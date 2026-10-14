/**
 * Traces to: ScenarioAdjustment (<<entity>>) in class diagram
 * Related use case(s): UC-4 Simulate Risk Scenario (adjust risk factors)
 *
 * ATTRIBUTES:
 * - factorType : AdjustableRiskFactorType — which adjustable factor is changed (enum, see enums.ts)
 * - adjustmentLevel : AdjustmentLevel — the chosen adjustment level (enum, see enums.ts)
 *
 * Relationships:
 * - ScenarioAdjustment 0..* —◆ 1 SimulationScenario (part of a SimulationScenario; multiplicity TODO(verify))
 */

import type { AdjustableRiskFactorType, AdjustmentLevel } from './enums.ts';

export interface ScenarioAdjustment {
  factorType: AdjustableRiskFactorType;
  adjustmentLevel: AdjustmentLevel;
}
