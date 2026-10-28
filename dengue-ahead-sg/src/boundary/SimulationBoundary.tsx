/**
 * Traces to: SimulationBoundary (<<boundary>>) in class diagram
 * Related use case(s): UC-4 Simulate Risk Scenario
 *
 * One slider per adjustable factor, from a large decrease to a large increase
 * (5 steps, No change in the middle). The comparison updates as soon as a
 * slider moves. Steps are labelled with the % change for this area, never
 * with model terms such as standard deviations.
 *
 * Calls: RiskSimulationControl
 */

import { useEffect, useState } from 'react';
import {
  AdjustableRiskFactorType,
  AdjustmentLevel,
} from '../entity/enums.ts';
import type { RiskAssessment } from '../entity/RiskAssessment.ts';
import {
  ADJUSTMENT_STEPS,
  type RiskSimulationControl,
  type SimulationResult,
} from '../control/RiskSimulationControl.ts';
import type { ScenarioAdjustment } from '../entity/ScenarioAdjustment.ts';
import type { PublicDataSnapshot } from '../services/ApprovedPublicDataServiceBoundary.ts';
import { getRiskLevelStyle } from './riskLevelStyle.ts';

export interface SimulationBoundaryProps {
  baseline: RiskAssessment;
  snapshot: PublicDataSnapshot;
  simulationControl: RiskSimulationControl;
}

type FactorType = ScenarioAdjustment['factorType'];
type Level = ScenarioAdjustment['adjustmentLevel'];

const factors: readonly { type: FactorType; label: string; format: (value: number) => string }[] = [
  {
    type: AdjustableRiskFactorType.Humidity,
    label: 'Humidity',
    format: (value) => `${value.toFixed(1)}%`,
  },
  {
    type: AdjustableRiskFactorType.LaggedRainfall,
    label: 'Rainfall 2–3 months ago',
    format: (value) => `${Math.round(value)} mm`,
  },
  {
    type: AdjustableRiskFactorType.HighAedesArea,
    label: 'Area overlapping high-Aedes zones',
    format: (value) => `${Math.round(value * 100)}% of the area`,
  },
];

const NO_CHANGE_STEP = ADJUSTMENT_STEPS.indexOf(AdjustmentLevel.NoChange);

function initialLevels(): Record<FactorType, Level> {
  return {
    [AdjustableRiskFactorType.Humidity]: AdjustmentLevel.NoChange,
    [AdjustableRiskFactorType.LaggedRainfall]: AdjustmentLevel.NoChange,
    [AdjustableRiskFactorType.HighAedesArea]: AdjustmentLevel.NoChange,
  };
}

/** "+15%", "−8%" or "No change"; values that cannot change relatively fall back to the raw difference. */
function changeLabel(current: number, adjusted: number, format: (value: number) => string): string {
  if (adjusted === current) return 'No change';
  if (current === 0) return `${adjusted > current ? '+' : '−'}${format(Math.abs(adjusted - current))}`;
  const percent = Math.round(((adjusted - current) / current) * 100);
  return `${percent > 0 ? '+' : '−'}${Math.abs(percent)}%`;
}

export function SimulationBoundary({
  baseline,
  snapshot,
  simulationControl,
}: SimulationBoundaryProps) {
  const [adjustments, setAdjustments] = useState(initialLevels);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState('');

  // Start from the baseline again when the assessment changes.
  useEffect(() => {
    setAdjustments(initialLevels());
  }, [baseline, snapshot, simulationControl]);

  // Recalculate whenever a slider moves; ignore answers that arrive after a newer move.
  useEffect(() => {
    const selected: ScenarioAdjustment[] = factors
      .filter((factor) => adjustments[factor.type] !== AdjustmentLevel.NoChange)
      .map((factor) => ({ factorType: factor.type, adjustmentLevel: adjustments[factor.type] }));

    setError('');
    if (selected.length === 0) {
      setResult(null);
      return;
    }

    let current = true;
    simulationControl
      .recalculateScenario(baseline, selected, snapshot)
      .then((simulated) => {
        if (current) setResult(simulated);
      })
      .catch(() => {
        if (current) {
          setResult(null);
          setError('Simulation could not be calculated. Please try again.');
        }
      });
    return () => {
      current = false;
    };
  }, [adjustments, baseline, snapshot, simulationControl]);

  function adjustFactor(factorType: FactorType, step: number) {
    setAdjustments((levels) => ({ ...levels, [factorType]: ADJUSTMENT_STEPS[step] }));
  }

  function resetScenario() {
    setAdjustments(initialLevels());
  }

  function valueOf(factorType: FactorType, level: Level): number {
    return simulationControl.adjustedValue(snapshot, baseline.subzoneId, factorType, level);
  }

  function showComparison() {
    const baselineStyle = getRiskLevelStyle(baseline.riskLevel);

    if (!result) {
      return (
        <div aria-label="Simulation comparison">
          <h3>Current risk</h3>
          <p>
            {baseline.riskIndex.toFixed(1)} ({baselineStyle.label})
          </p>
          <p className="muted small">Move a slider to see how the risk would change.</p>
        </div>
      );
    }

    const difference = result.simulated.riskIndex - result.baseline.riskIndex;

    return (
      <div aria-label="Simulation comparison" aria-live="polite">
        <h3>Baseline vs simulated risk</h3>
        <p>
          <strong>Baseline:</strong>{' '}
          {result.baseline.riskIndex.toFixed(1)} ({getRiskLevelStyle(result.baseline.riskLevel).label})
        </p>
        <p>
          <strong>Simulated:</strong>{' '}
          {result.simulated.riskIndex.toFixed(1)} ({getRiskLevelStyle(result.simulated.riskLevel).label})
        </p>
        <p>
          <strong>Risk index change:</strong>{' '}
          {difference > 0 ? '+' : ''}
          {difference.toFixed(1)}
        </p>
        <p className="muted small">
          Hypothetical scenario only. This is not an official dengue forecast.
        </p>
      </div>
    );
  }

  return (
    <section>
      <h2>Simulate risk</h2>
      <p className="muted">
        Explore how hypothetical changes to environmental factors may affect the selected area's dengue risk.
      </p>

      <div className="card sim-card">
        <h3>Adjust risk factors</h3>

        {factors.map((factor) => {
          const current = valueOf(factor.type, AdjustmentLevel.NoChange);
          const level = adjustments[factor.type];
          const adjusted = valueOf(factor.type, level);
          const labels = ADJUSTMENT_STEPS.map((step) =>
            changeLabel(current, valueOf(factor.type, step), factor.format));
          const step = ADJUSTMENT_STEPS.indexOf(level);
          // A value of 0 stays 0 under any % change (e.g. no Aedes overlap), so the slider would do nothing.
          const fixed = labels.every((label) => label === 'No change');
          const id = `sim-${factor.type}`;

          return (
            <div className="sim-factor" key={factor.type}>
              <label htmlFor={id}>
                <strong>{factor.label}:</strong> {factor.format(adjusted)}
                {step !== NO_CHANGE_STEP && <span className="muted"> ({labels[step]})</span>}
              </label>
              <input
                id={id}
                type="range"
                min={0}
                max={ADJUSTMENT_STEPS.length - 1}
                step={1}
                value={step}
                disabled={fixed}
                aria-valuetext={`${labels[step]}, ${factor.format(adjusted)}`}
                onChange={(event) => adjustFactor(factor.type, Number(event.target.value))}
              />
              {fixed ? (
                <p className="muted small">This is 0 for this area, so it can't be adjusted here.</p>
              ) : (
                <div className="sim-ticks" aria-hidden="true">
                  {labels.map((label, index) => <span key={ADJUSTMENT_STEPS[index]}>{label}</span>)}
                </div>
              )}
            </div>
          );
        })}

        <button type="button" className="secondary" onClick={resetScenario}>
          Reset to baseline
        </button>

        {error && <p role="alert" className="error-text">{error}</p>}
      </div>

      <div className="card sim-card">
        {showComparison()}
      </div>
    </section>
  );
}

export default SimulationBoundary;
