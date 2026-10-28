
import { useEffect, useState } from 'react';
import {
  AdjustableRiskFactorType,
  AdjustmentLevel,
} from '../entity/enums.ts';
import type { RiskAssessment } from '../entity/RiskAssessment.ts';
import type {
  RiskSimulationControl,
  SimulationResult,
} from '../control/RiskSimulationControl.ts';
import type { ScenarioAdjustment } from '../entity/ScenarioAdjustment.ts';
import type { PublicDataSnapshot } from '../services/ApprovedPublicDataServiceBoundary.ts';
import { getRiskLevelStyle } from './riskLevelStyle.ts';

export interface SimulationBoundaryProps {
  baseline: RiskAssessment;
  snapshot: PublicDataSnapshot;
  simulationControl: RiskSimulationControl;
}

const factors = [
  {
    type: AdjustableRiskFactorType.Humidity,
    label: 'Humidity',
    description: 'Adjust by one normal standard deviation.',
  },
  {
    type: AdjustableRiskFactorType.LaggedRainfall,
    label: 'Lagged rainfall',
    description: 'Adjust by one normal standard deviation.',
  },
  {
    type: AdjustableRiskFactorType.HighAedesArea,
    label: 'High-Aedes area overlap',
    description: 'Adjust by a provisional 20%.',
  },
] as const;

const levels = [
  { value: AdjustmentLevel.Decrease, label: 'Decrease' },
  { value: AdjustmentLevel.NoChange, label: 'No change' },
  { value: AdjustmentLevel.Increase, label: 'Increase' },
] as const;

type FactorType = ScenarioAdjustment['factorType'];
type Level = ScenarioAdjustment['adjustmentLevel'];

function initialLevels(): Record<FactorType, Level> {
  return {
    [AdjustableRiskFactorType.Humidity]: AdjustmentLevel.NoChange,
    [AdjustableRiskFactorType.LaggedRainfall]: AdjustmentLevel.NoChange,
    [AdjustableRiskFactorType.HighAedesArea]: AdjustmentLevel.NoChange,
  };
}

export function SimulationBoundary({
  baseline,
  snapshot,
  simulationControl,
}: SimulationBoundaryProps) {
  const [adjustments, setAdjustments] = useState(initialLevels);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState('');
  const [calculating, setCalculating] = useState(false);

  // Clear the previous scenario when the baseline changes.
  useEffect(() => {
    setAdjustments(initialLevels());
    setResult(null);
    setError('');
    setCalculating(false);
  }, [baseline, snapshot, simulationControl]);

  function adjustFactor(factorType: FactorType, level: Level) {
    setAdjustments((current) => ({
      ...current,
      [factorType]: level,
    }));
    setResult(null);
    setError('');
  }

  async function calculateScenario() {
    const selectedAdjustments: ScenarioAdjustment[] = factors
      .filter(
        (factor) =>
          adjustments[factor.type] !== AdjustmentLevel.NoChange,
      )
      .map((factor) => ({
        factorType: factor.type,
        adjustmentLevel: adjustments[factor.type],
      }));

    if (selectedAdjustments.length === 0) {
      setResult(null);
      setError('Choose at least one change before calculating.');
      return;
    }

    setCalculating(true);
    setError('');

    try {
      const simulated = await simulationControl.recalculateScenario(
        baseline,
        selectedAdjustments,
        snapshot,
      );
      setResult(simulated);
    } catch {
      setResult(null);
      setError('Simulation could not be calculated. Please try again.');
    } finally {
      setCalculating(false);
    }
  }

  function resetScenario() {
    setAdjustments(initialLevels());
    setResult(null);
    setError('');
  }

  function showComparison() {
    if (!result) {
      return (
        <p className="muted">
          Adjust a factor and calculate to compare risk levels.
        </p>
      );
    }

    const difference =
      result.simulated.riskIndex - result.baseline.riskIndex;

    return (
      <div aria-label="Simulation comparison">
        <h3>Baseline vs simulated risk</h3>
        <p>
          <strong>Baseline:</strong>{' '}
          {result.baseline.riskIndex.toFixed(1)} (
          {getRiskLevelStyle(result.baseline.riskLevel).label})
        </p>
        <p>
          <strong>Simulated:</strong>{' '}
          {result.simulated.riskIndex.toFixed(1)} (
          {getRiskLevelStyle(result.simulated.riskLevel).label})
        </p>
        <p>
          <strong>Risk index change:</strong>{' '}
          {difference > 0 ? '+' : ''}
          {difference.toFixed(1)}
        </p>
        <p className="muted small">
          Hypothetical scenario only. This is not an official
          dengue forecast.
        </p>
      </div>
    );
  }

  return (
    <section>
      <h2>Simulate risk</h2>
      <p className="muted">
        Explore how hypothetical changes to environmental factors
        may affect the selected area's dengue risk.
      </p>

      <div className="card">
        <h3>Adjust risk factors</h3>

        {factors.map((factor) => (
          <fieldset
            key={factor.type}
            style={{ marginBottom: '16px' }}
            disabled={calculating}
          >
            <legend>
              <strong>{factor.label}</strong>
            </legend>

            <p className="muted small">{factor.description}</p>

            {levels.map((level) => (
              <label
                key={level.value}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginRight: '16px',
                }}
              >
                <input
                  type="radio"
                  name={factor.type}
                  value={level.value}
                  checked={adjustments[factor.type] === level.value}
                  onChange={() =>
                    adjustFactor(factor.type, level.value)
                  }
                />
                {level.label}
              </label>
            ))}
          </fieldset>
        ))}

        <button
          type="button"
          className="primary"
          disabled={calculating}
          onClick={() => void calculateScenario()}
        >
          {calculating ? 'Calculating...' : 'Calculate scenario'}
        </button>

        {' '}

        <button
          type="button"
          className="secondary"
          disabled={calculating}
          onClick={resetScenario}
        >
          Reset to baseline
        </button>

        {error && <p role="alert" className="error-text">{error}</p>}
      </div>

      <div className="card">
        {showComparison()}
      </div>
    </section>
  );
}

export default SimulationBoundary;
