// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { SimulationBoundary } from './SimulationBoundary.tsx';
import {
  AdjustableRiskFactorType,
  AdjustmentLevel,
  RiskLevel,
} from '../entity/enums.ts';
import type { RiskAssessment } from '../entity/RiskAssessment.ts';
import {
  ADJUSTMENT_STEPS,
  type RiskSimulationControl,
  type SimulationResult,
} from '../control/RiskSimulationControl.ts';
import type { PublicDataSnapshot } from '../services/ApprovedPublicDataServiceBoundary.ts';

const baseline = {
  assessmentId: 'baseline-1',
  subzoneId: 'subzone-1',
  riskIndex: 40,
  riskLevel: RiskLevel.Moderate,
} as RiskAssessment;

function assessment(riskIndex: number, riskLevel: RiskLevel): RiskAssessment {
  return { ...baseline, assessmentId: `simulated-${riskIndex}`, riskIndex, riskLevel };
}

function resultFor(simulated: RiskAssessment): SimulationResult {
  return {
    baseline,
    simulated,
    scenario: {
      scenarioId: 'scenario-1',
      createdAt: '2026-10-28T00:00:00.000Z',
      baselineAssessmentId: 'baseline-1',
      simulatedAssessmentId: simulated.assessmentId,
      isHypothetical: true,
      adjustments: [],
    },
  };
}

const snapshot = {} as PublicDataSnapshot;

/** Current values: humidity 80%, rainfall 100 mm, Aedes overlap 50% (or `aedes`). Each step moves 10%. */
function fakeAdjustedValue(aedes = 0.5) {
  const current = {
    [AdjustableRiskFactorType.Humidity]: 80,
    [AdjustableRiskFactorType.LaggedRainfall]: 100,
    [AdjustableRiskFactorType.HighAedesArea]: aedes,
  };
  return (_s: PublicDataSnapshot, _id: string, factor: AdjustableRiskFactorType, level: AdjustmentLevel) =>
    current[factor] * (1 + 0.1 * (ADJUSTMENT_STEPS.indexOf(level) - 2));
}

let container: HTMLDivElement;
let root: Root;
let recalculateScenario: ReturnType<typeof vi.fn>;

beforeEach(() => {
  Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
    configurable: true,
    value: true,
  });

  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);

  recalculateScenario = vi.fn().mockResolvedValue(resultFor(assessment(65, RiskLevel.High)));
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

async function renderSimulation(aedes?: number) {
  const simulationControl = {
    recalculateScenario,
    adjustedValue: fakeAdjustedValue(aedes),
  } as unknown as RiskSimulationControl;

  await act(async () => {
    root.render(
      <SimulationBoundary
        baseline={baseline}
        snapshot={snapshot}
        simulationControl={simulationControl}
      />,
    );
  });
}

function slider(factor: AdjustableRiskFactorType): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>(`#sim-${factor}`);
  if (!input) throw new Error(`Missing slider: ${factor}`);
  return input;
}

/** Move a slider the way a drag or arrow key does: set the value, then fire the input event React listens to. */
async function moveSlider(factor: AdjustableRiskFactorType, level: AdjustmentLevel) {
  const input = slider(factor);
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  await act(async () => {
    setValue.call(input, String(ADJUSTMENT_STEPS.indexOf(level)));
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function clickButton(label: string) {
  const button = [...container.querySelectorAll('button')].find(
    (item) => item.textContent?.trim() === label,
  );
  if (!button) throw new Error(`Missing button: ${label}`);
  await act(async () => button.click());
}

function comparison() {
  return container.querySelector('[aria-label="Simulation comparison"]')?.textContent ?? '';
}

describe('SimulationBoundary (ticket 24)', () => {
  it('shows one 5-step slider per adjustable factor, starting at No change', async () => {
    await renderSimulation();

    for (const factor of Object.values(AdjustableRiskFactorType)) {
      const input = slider(factor);
      expect(input.type).toBe('range');
      expect(input.min).toBe('0');
      expect(input.max).toBe('4');
      expect(input.value).toBe(String(ADJUSTMENT_STEPS.indexOf(AdjustmentLevel.NoChange)));
    }
  });

  it('labels steps as percentages, not model terms', async () => {
    await renderSimulation();
    const ticks = (factor: AdjustableRiskFactorType) =>
      container.querySelector(`#sim-${factor} ~ .sim-ticks`)?.textContent;

    // Humidity and Aedes are already %, so their steps are percentage points (80% ± 8; 50% ± 5).
    expect(ticks(AdjustableRiskFactorType.Humidity)).toBe('−16.0%−8.0%No change+8.0%+16.0%');
    expect(ticks(AdjustableRiskFactorType.HighAedesArea)).toBe('−10%−5%No change+5%+10%');
    // Rainfall is in mm, so its steps are percent of the current amount (100 mm ± 10).
    expect(ticks(AdjustableRiskFactorType.LaggedRainfall)).toBe('−20%−10%No change+10%+20%');
    expect(container.textContent).not.toMatch(/standard deviation|SD\b/);
  });

  it('shows the current risk without calculating while every slider is at No change', async () => {
    await renderSimulation();

    expect(recalculateScenario).not.toHaveBeenCalled();
    expect(comparison()).toContain('40.0 (Moderate)');
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it('recalculates as soon as a slider moves, with no calculate button', async () => {
    await renderSimulation();
    await moveSlider(AdjustableRiskFactorType.Humidity, AdjustmentLevel.LargeIncrease);

    expect(recalculateScenario).toHaveBeenLastCalledWith(
      baseline,
      [{ factorType: AdjustableRiskFactorType.Humidity, adjustmentLevel: AdjustmentLevel.LargeIncrease }],
      snapshot,
    );
    expect(comparison()).toContain('Baseline vs simulated risk');
    expect(comparison()).toContain('65.0 (High)');
    expect(comparison()).toContain('+25.0');
    expect(comparison()).toContain('Hypothetical scenario only');
    expect(container.textContent).toContain('Humidity: 96.0% (+16.0%)');
    expect(container.textContent).not.toContain('Calculate');
  });

  it('shows the latest move even if an earlier calculation finishes last', async () => {
    let finishSlow!: (value: SimulationResult) => void;
    recalculateScenario
      .mockReturnValueOnce(new Promise((resolve) => { finishSlow = resolve; }))
      .mockResolvedValueOnce(resultFor(assessment(70, RiskLevel.High)));

    await renderSimulation();
    await moveSlider(AdjustableRiskFactorType.Humidity, AdjustmentLevel.Increase);
    await moveSlider(AdjustableRiskFactorType.Humidity, AdjustmentLevel.LargeIncrease);
    await act(async () => finishSlow(resultFor(assessment(50, RiskLevel.High))));

    expect(comparison()).toContain('70.0');
    expect(comparison()).not.toContain('50.0');
  });

  it('resets every slider to No change and clears the comparison', async () => {
    await renderSimulation();
    await moveSlider(AdjustableRiskFactorType.LaggedRainfall, AdjustmentLevel.Decrease);
    expect(comparison()).toContain('Baseline vs simulated risk');

    await clickButton('Reset to baseline');

    for (const factor of Object.values(AdjustableRiskFactorType)) {
      expect(slider(factor).value).toBe(String(ADJUSTMENT_STEPS.indexOf(AdjustmentLevel.NoChange)));
    }
    expect(comparison()).not.toContain('Baseline vs simulated risk');
  });

  it('disables a slider when no step changes its value', async () => {
    await renderSimulation(0);

    expect(slider(AdjustableRiskFactorType.HighAedesArea).disabled).toBe(true);
    expect(slider(AdjustableRiskFactorType.Humidity).disabled).toBe(false);
    expect(container.textContent).toContain("can't be adjusted for this area");
    expect(container.querySelector('#sim-HIGH_AEDES_AREA ~ .sim-ticks')).toBeNull();
  });

  it('shows an error when simulation calculation fails', async () => {
    recalculateScenario.mockRejectedValue(new Error('Internal simulation failure'));

    await renderSimulation();
    await moveSlider(AdjustableRiskFactorType.Humidity, AdjustmentLevel.Increase);

    expect(container.querySelector('[role="alert"]')?.textContent)
      .toContain('Simulation could not be calculated');
    expect(container.textContent).not.toContain('Internal simulation failure');
  });
});
