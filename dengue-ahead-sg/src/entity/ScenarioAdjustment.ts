/**
 * Traces to: ScenarioAdjustment (<<entity>>) in class diagram
 * Related use case(s): UC-4 Simulate Risk Scenario (adjust risk factors)
 *
 * ATTRIBUTES:
 * - factorType : AdjustableRiskFactorType — which adjustable factor is changed (enum, see enums.ts)
 * - adjustmentLevel : AdjustmentLevel — an existing preset (optional)
 * - value : number — an exact humidity %, rainfall mm or Aedes ratio 0–1 (optional)
 * - Supply either a preset or an exact value; the simulation control validates it.
 *
 * Relationships:
 * - ScenarioAdjustment 0..* —◆ 1 SimulationScenario (part of a SimulationScenario; multiplicity TODO(verify))
 */

import type { AdjustableRiskFactorType, AdjustmentLevel } from './enums.ts';

export interface ScenarioAdjustment {
  factorType: AdjustableRiskFactorType;
  adjustmentLevel?: AdjustmentLevel;
  value?: number;
}
