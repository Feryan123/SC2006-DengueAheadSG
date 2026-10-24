/**
 * Traces to: SimulationBoundary (<<boundary>>) in class diagram
 * Related use case(s): UC-4 Simulate Risk Scenario
 *
 * METHODS:
 * - adjustFactor() — handle the user adjusting a risk factor
 * - resetScenario() — handle the user resetting factors to the baseline
 * - showComparison() — display the hypothetical result vs the baseline assessment
 *
 * Calls: RiskSimulationControl
 */

import { AdjustableRiskFactorType, AdjustmentLevel } from '../entity/enums.ts';
import type { RiskAssessment } from '../entity/RiskAssessment.ts';
import type { RiskSimulationControl } from '../control/RiskSimulationControl.ts';
import type { PublicDataSnapshot } from '../services/ApprovedPublicDataServiceBoundary.ts';

export interface SimulationBoundaryProps {
  baseline: RiskAssessment;               // the assessment the user is simulating from
  snapshot: PublicDataSnapshot;           // same data the baseline was built from
  simulationControl: RiskSimulationControl;
}

export function SimulationBoundary(_props: SimulationBoundaryProps) {
  // TODO: useState for the current adjustments and the latest SimulationResult

  function adjustFactor(_factorType: AdjustableRiskFactorType, _level: AdjustmentLevel) {
    // TODO: update adjustments, then call simulationControl.recalculateScenario(...)
  }

  function resetScenario() {
    // TODO: call simulationControl.resetScenario(...) and clear the simulated result
  }

  function showComparison() {
    // TODO: baseline vs simulated riskIndex + riskLevel, with a "hypothetical" label
    return <p>Comparison goes here</p>;
  }

  return (
    <section>
      <h2>Simulate risk</h2>
      {/* TODO: one control per AdjustableRiskFactorType (Decrease / No change / Increase) */}
      <button onClick={() => adjustFactor(AdjustableRiskFactorType.LaggedRainfall, AdjustmentLevel.Decrease)}>
        Less rain (placeholder)
      </button>
      <button onClick={resetScenario}>Reset to baseline</button>
      {showComparison()}
    </section>
  );
}
export default SimulationBoundary
