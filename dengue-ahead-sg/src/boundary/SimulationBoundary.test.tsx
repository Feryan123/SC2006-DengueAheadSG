// @vitest-environment jsdom
// - Check exact values, linked sliders, validation, reset and delayed replies.
// - Use simulated calculation replies without live API calls.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SimulationBoundary } from './SimulationBoundary.tsx';
import { AdjustableRiskFactorType as F, RiskLevel } from '../entity/enums.ts';
import type { RiskAssessment } from '../entity/RiskAssessment.ts';
import type { RiskSimulationControl, SimulationResult } from '../control/RiskSimulationControl.ts';
import type { PublicDataSnapshot } from '../services/ApprovedPublicDataServiceBoundary.ts';
const baseline = {
  assessmentId: 'baseline',
  subzoneId: 'one',
  riskIndex: 40,
  riskLevel: RiskLevel.Moderate,
} as RiskAssessment;
const snapshot = {
  weather: { meanHumidityPct: 80, rainfallMm: 100 },
  subzones: [{ subzoneId: 'one', aedesOverlapRatio: 0.5 }],
} as PublicDataSnapshot;
function reply(score: number): SimulationResult {
  return {
    baseline,
    simulated: { ...baseline, riskIndex: score, riskLevel: RiskLevel.High },
    scenario: {
      scenarioId: 'sim',
      createdAt: '2026-10-31',
      baselineAssessmentId: 'baseline',
      isHypothetical: true,
      adjustments: [],
    },
  };
}
let container: HTMLDivElement, root: Root, calculate: ReturnType<typeof vi.fn>;
beforeEach(() => {
  Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
    configurable: true,
    value: true,
  });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  calculate = vi.fn().mockResolvedValue(reply(65));
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});
async function render(data = snapshot) {
  const control = {
    recalculateScenario: calculate,
    adjustedValue: () => 140,
  } as unknown as RiskSimulationControl;
  await act(async () =>
    root.render(
      <SimulationBoundary baseline={baseline} snapshot={data} simulationControl={control} />,
    ),
  );
}
function input(type: F, kind = 'value') {
  return container.querySelector<HTMLInputElement>(`#${kind}-${type}`)!;
}
async function change(type: F, value: string, kind = 'value') {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(input(type, kind), value);
    input(type, kind).dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function reset() {
  await act(async () =>
    [...container.querySelectorAll('button')]
      .find((b) => b.textContent === 'Reset to baseline')!
      .click(),
  );
}
function comparison() {
  return container.querySelector('[aria-label="Simulation comparison"]')?.textContent ?? '';
}
describe('Exact-value risk simulation', () => {
  it('starts at the baseline without recalculation', async () => {
    await render();
    expect(input(F.Humidity).value).toBe('80');
    expect(input(F.LaggedRainfall).value).toBe('100');
    expect(input(F.HighAedesArea).value).toBe('50');
    expect(calculate).not.toHaveBeenCalled();
    expect(comparison()).toContain('40.0');
  });
  it('immediately sends an exact decimal value to the calculator', async () => {
    await render();
    await change(F.Humidity, '81.25');
    expect(calculate).toHaveBeenLastCalledWith(
      baseline,
      [{ factorType: F.Humidity, value: 81.25 }],
      snapshot,
    );
    expect(comparison()).toContain('65.0');
    expect(comparison()).toContain('+25.0');
    expect(input(F.Humidity, 'sim').value).toBe('81.25');
  });
  it('links the slider to the number field and converts Aedes percentage to a ratio', async () => {
    await render();
    await change(F.HighAedesArea, '12.3', 'sim');
    expect(input(F.HighAedesArea).value).toBe('12.3');
    expect(calculate.mock.calls.at(-1)?.[1][0].value).toBeCloseTo(0.123);
  });
  it('allows changing zero Aedes overlap', async () => {
    const data = { ...snapshot, subzones: [{ ...snapshot.subzones[0], aedesOverlapRatio: 0 }] };
    await render(data);
    await change(F.HighAedesArea, '20');
    expect(calculate).toHaveBeenLastCalledWith(
      baseline,
      [{ factorType: F.HighAedesArea, value: 0.2 }],
      data,
    );
  });
  it('extends the rain slider without shrinking it during a drag', async () => {
    await render();
    await change(F.LaggedRainfall, '800.5');
    expect(input(F.LaggedRainfall, 'sim').max).toBe('850');
    await change(F.LaggedRainfall, '300', 'sim');
    expect(input(F.LaggedRainfall).value).toBe('300');
    expect(input(F.LaggedRainfall, 'sim').max).toBe('850');
  });
  it.each([
    [F.Humidity, '101'],
    [F.HighAedesArea, '-1'],
    [F.HighAedesArea, '101'],
    [F.LaggedRainfall, '-2'],
    [F.Humidity, ''],
  ])('rejects invalid %s input %s without showing an old result', async (type, value) => {
    await render();
    await change(F.Humidity, '85');
    calculate.mockClear();
    await change(type, value);
    expect(calculate).not.toHaveBeenCalled();
    expect(input(type).getAttribute('aria-invalid')).toBe('true');
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(comparison()).not.toContain('65.0');
  });
  it('accepts zero and 100 percent', async () => {
    await render();
    await change(F.Humidity, '0');
    await change(F.HighAedesArea, '100');
    expect(calculate).toHaveBeenLastCalledWith(
      baseline,
      [
        { factorType: F.Humidity, value: 0 },
        { factorType: F.HighAedesArea, value: 1 },
      ],
      snapshot,
    );
  });
  it('ignores an older calculation that finishes after a newer one', async () => {
    let finish!: (r: SimulationResult) => void;
    calculate
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finish = resolve;
        }),
      )
      .mockResolvedValueOnce(reply(70));
    await render();
    await change(F.Humidity, '85');
    await change(F.Humidity, '90');
    await act(async () => finish(reply(50)));
    expect(comparison()).toContain('70.0');
    expect(comparison()).not.toContain('50.0');
  });
  it('reset restores every input and ignores an unfinished reply', async () => {
    let finish!: (r: SimulationResult) => void;
    calculate.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    await render();
    await change(F.Humidity, '85');
    await reset();
    await act(async () => finish(reply(65)));
    expect(input(F.Humidity).value).toBe('80');
    expect(input(F.LaggedRainfall).value).toBe('100');
    expect(input(F.HighAedesArea).value).toBe('50');
    expect(comparison()).not.toContain('65.0');
  });
  it('shows safe errors and recovers after another valid input', async () => {
    calculate
      .mockRejectedValueOnce(new Error('Private calculation detail'))
      .mockResolvedValueOnce(reply(70));
    await render();
    await change(F.Humidity, '85');
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      'Simulation could not be calculated',
    );
    expect(container.textContent).not.toContain('Private calculation detail');
    await change(F.Humidity, '90');
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(comparison()).toContain('70.0');
  });
});
