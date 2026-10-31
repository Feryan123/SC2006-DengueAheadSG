// - Adjust exact humidity, past rainfall and high-Aedes overlap values.
// - Keep the controls, fixed area map and comparison inside one simulation panel.
// - Reuse the existing risk formula on a copy of the original snapshot.
// - Reject invalid inputs, ignore old replies and restore baseline values on reset.
// - UC-4 Simulate Risk Scenario; calls RiskSimulationControl.

import { useEffect, useRef, useState } from 'react';
import { AdjustableRiskFactorType, AdjustmentLevel } from '../entity/enums.ts';
import type { PlanningSubzone } from '../entity/PlanningSubzone.ts';
import type { RiskAssessment } from '../entity/RiskAssessment.ts';
import type { ScenarioAdjustment } from '../entity/ScenarioAdjustment.ts';
import type { RiskSimulationControl, SimulationResult } from '../control/RiskSimulationControl.ts';
import type { PublicDataSnapshot } from '../services/ApprovedPublicDataServiceBoundary.ts';
import { SelectedAreaMap } from './SelectedAreaPreview.tsx';
import { getRiskLevelStyle } from './riskLevelStyle.ts';

export interface SimulationBoundaryProps {
  baseline: RiskAssessment;
  snapshot: PublicDataSnapshot;
  simulationControl: RiskSimulationControl;
  subzone?: PlanningSubzone;
  onClose?: () => void;
}

type Factor = AdjustableRiskFactorType;
const factors = [
  { type: AdjustableRiskFactorType.Humidity, label: 'Humidity', unit: '%', scale: 1, max: 100 },
  {
    type: AdjustableRiskFactorType.LaggedRainfall,
    label: 'Rainfall 2–3 months ago',
    unit: 'mm',
    scale: 1,
    max: undefined,
  },
  {
    type: AdjustableRiskFactorType.HighAedesArea,
    label: 'High-Aedes area overlap',
    unit: '%',
    scale: 100,
    max: 100,
  },
];

function inputError(value: string, max?: number) {
  if (value.trim() === '' || !Number.isFinite(Number(value))) return 'Enter a number.';
  if (Number(value) < 0) return 'Enter zero or a positive value.';
  if (max !== undefined && Number(value) > max) return `Enter a value from 0 to ${max}%.`;
  return '';
}

function format(value: number) {
  return Number(value.toFixed(2)).toString();
}

export function SimulationBoundary({
  baseline,
  snapshot,
  simulationControl,
  subzone,
  onClose,
}: SimulationBoundaryProps) {
  function currentValues(): Record<Factor, string> {
    return {
      [AdjustableRiskFactorType.Humidity]: format(snapshot.weather.meanHumidityPct),
      [AdjustableRiskFactorType.LaggedRainfall]: format(snapshot.weather.rainfallMm),
      [AdjustableRiskFactorType.HighAedesArea]: format(
        (snapshot.subzones.find((zone) => zone.subzoneId === baseline.subzoneId)
          ?.aedesOverlapRatio ?? 0) * 100,
      ),
    };
  }
  function initialRainfallMax() {
    return Math.max(
      200,
      Math.ceil(
        simulationControl.adjustedValue(
          snapshot,
          baseline.subzoneId,
          AdjustableRiskFactorType.LaggedRainfall,
          AdjustmentLevel.LargeIncrease,
        ),
      ),
    );
  }
  const [values, setValues] = useState(currentValues);
  const [rainfallMax, setRainfallMax] = useState(initialRainfallMax);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const original = currentValues();
  const preview = result?.simulated ?? baseline;
  const difference = preview.riskIndex - baseline.riskIndex;
  const currentStyle = getRiskLevelStyle(baseline.riskLevel);
  const previewStyle = getRiskLevelStyle(preview.riskLevel);
  const ready = !loading && !error;

  useEffect(() => {
    heading.current?.focus();
  }, []);
  useEffect(() => {
    setValues(currentValues());
    setRainfallMax(initialRainfallMax());
  }, [baseline, snapshot, simulationControl]);

  useEffect(() => {
    let active = true;
    setResult(null);
    setError('');
    setLoading(false);
    const adjustments: ScenarioAdjustment[] = [];
    for (const factor of factors) {
      const problem = inputError(values[factor.type], factor.max);
      if (problem) {
        setError(`${factor.label}: ${problem}`);
        return;
      }
      // Unchanged display values keep the original snapshot's full precision.
      if (Number(values[factor.type]) !== Number(original[factor.type]))
        adjustments.push({
          factorType: factor.type,
          value: Number(values[factor.type]) / factor.scale,
        });
    }
    if (adjustments.length === 0) return;
    setLoading(true);
    simulationControl
      .recalculateScenario(baseline, adjustments, snapshot)
      .then((next) => {
        if (active) setResult(next);
      })
      .catch(() => {
        if (active) setError('Simulation could not be calculated. Please try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [values, baseline, snapshot, simulationControl]);

  function changeValue(type: Factor, value: string) {
    setValues((previous) => ({ ...previous, [type]: value }));
    if (type === AdjustableRiskFactorType.LaggedRainfall && Number.isFinite(Number(value)))
      setRainfallMax((previous) => Math.max(previous, Math.ceil(Number(value) / 50) * 50));
  }
  function resetScenario() {
    setValues(currentValues());
    setRainfallMax(initialRainfallMax());
  }

  return (
    <section className="simulation-section" aria-label="Risk simulation">
      <div className="section-title">
        <h1 ref={heading} tabIndex={-1}>
          Simulation for {subzone?.name ?? 'this area'}
        </h1>
        {onClose && (
          <button className="secondary" onClick={onClose}>
            Back to current risk map
          </button>
        )}
      </div>
      <p>Enter values or move the sliders to compare the result for this area.</p>
      <div className="simulation-scores" aria-label="Simulation comparison" aria-live="polite">
        <div>
          <h2>Current risk</h2>
          <strong>
            {baseline.riskIndex.toFixed(1)}
            <small> / 100</small>
          </strong>
          <span
            className="risk-pill"
            style={{ backgroundColor: currentStyle.colour, color: currentStyle.textColour }}
          >
            {currentStyle.label}
          </span>
        </div>
        <div>
          <h2>Simulated risk</h2>
          <strong>
            {ready ? preview.riskIndex.toFixed(1) : '—'}
            <small> / 100</small>
          </strong>
          {ready && (
            <span
              className="risk-pill"
              style={{ backgroundColor: previewStyle.colour, color: previewStyle.textColour }}
            >
              {previewStyle.label}
            </span>
          )}
        </div>
        <div>
          <h2>Change</h2>
          <strong>
            {ready ? `${difference > 0 ? '+' : ''}${difference.toFixed(1)}` : '—'}
            <small> points</small>
          </strong>
        </div>
      </div>
      <div className="simulation-workspace">
        <div className="card simulation-inputs">
          <h2>Adjust simulation factors</h2>
          <div className="simulation-mobile-feedback" role="status">
            {loading
              ? 'Calculating…'
              : error
                ? 'Correct the value below to see the result.'
                : `Simulated: ${preview.riskIndex.toFixed(1)} · ${previewStyle.label} (${difference > 0 ? '+' : ''}${difference.toFixed(1)} points)`}
          </div>
          {factors.map((factor) => {
            const value = values[factor.type];
            const problem = inputError(value, factor.max);
            const max = factor.max ?? rainfallMax;
            return (
              <div className="sim-factor" key={factor.type}>
                <div className="sim-input-title">
                  <h3>{factor.label}</h3>
                  <span className="muted small">
                    Current: {original[factor.type]}
                    {factor.unit === '%' ? '%' : ' mm'}
                  </span>
                </div>
                <div className="sim-input-row">
                  <div>
                    <label className="sr-only" htmlFor={`sim-${factor.type}`}>
                      {factor.label} slider
                    </label>
                    <input
                      id={`sim-${factor.type}`}
                      type="range"
                      min="0"
                      max={max}
                      step={factor.unit === 'mm' ? 1 : 0.1}
                      value={problem ? 0 : Number(value)}
                      onChange={(event) => changeValue(factor.type, event.target.value)}
                    />
                    <div className="sim-range-labels">
                      <span>0{factor.unit}</span>
                      <span>
                        {max}
                        {factor.unit}
                      </span>
                    </div>
                  </div>
                  <div className="sim-number-field">
                    <label htmlFor={`value-${factor.type}`}>
                      Simulated value <span className="sr-only">for {factor.label}</span>
                    </label>
                    <div className="number-with-unit">
                      <input
                        id={`value-${factor.type}`}
                        type="number"
                        min="0"
                        max={factor.max}
                        step="any"
                        value={value}
                        aria-invalid={Boolean(problem)}
                        aria-describedby={problem ? `error-${factor.type}` : undefined}
                        onChange={(event) => changeValue(factor.type, event.target.value)}
                      />
                      <span>{factor.unit}</span>
                    </div>
                  </div>
                </div>
                {problem && (
                  <p id={`error-${factor.type}`} className="error-text small">
                    {problem}
                  </p>
                )}
                {factor.unit === 'mm' && (
                  <p className="muted small">
                    Past rainfall, not rainfall today. You can type a higher value to extend the
                    slider.
                  </p>
                )}
              </div>
            );
          })}
          <button type="button" className="secondary" onClick={resetScenario}>
            Reset to baseline
          </button>
          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}
          {loading && <p role="status">Calculating simulation…</p>}
        </div>
        <aside className="card simulation-preview" aria-label="Simulated area">
          <h2>Simulated result · {subzone?.name ?? 'selected area'}</h2>
          <div className="simulation-map-wrap">
            {subzone && <SelectedAreaMap zone={subzone} riskLevel={preview.riskLevel} />}
            {!ready && (
              <div className="simulation-map-placeholder">
                {loading ? 'Updating preview…' : 'Correct the inputs to see the preview.'}
              </div>
            )}
          </div>
          {ready && (
            <div className="area-score">
              <strong>
                {preview.riskIndex.toFixed(1)}
                <small> / 100</small>
              </strong>
              <span
                className="risk-pill"
                style={{ backgroundColor: previewStyle.colour, color: previewStyle.textColour }}
              >
                {previewStyle.label} risk
              </span>
            </div>
          )}
          <p className="muted small">Selected area only. This map cannot be moved or zoomed.</p>
        </aside>
      </div>
      <p className="simulation-note">
        Hypothetical simulation. Current data and risk assessment remain unchanged. This is not an
        official dengue forecast.
      </p>
    </section>
  );
}

export default SimulationBoundary;
