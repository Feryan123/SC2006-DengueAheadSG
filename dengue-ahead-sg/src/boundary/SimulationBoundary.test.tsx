
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
import type {
  RiskSimulationControl,
  SimulationResult,
} from '../control/RiskSimulationControl.ts';
import type { PublicDataSnapshot } from '../services/ApprovedPublicDataServiceBoundary.ts';

const baseline = {
  assessmentId: 'baseline-1',
  subzoneId: 'subzone-1',
  riskIndex: 40,
  riskLevel: RiskLevel.Moderate,
} as RiskAssessment;

const simulated = {
  assessmentId: 'simulated-1',
  subzoneId: 'subzone-1',
  riskIndex: 65,
  riskLevel: RiskLevel.High,
} as RiskAssessment;

const snapshot = {} as PublicDataSnapshot;

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

  recalculateScenario = vi.fn().mockResolvedValue({
    baseline,
    simulated,
    scenario: {
      scenarioId: 'scenario-1',
      createdAt: '2026-10-28T00:00:00.000Z',
      baselineAssessmentId: 'baseline-1',
      simulatedAssessmentId: 'simulated-1',
      isHypothetical: true,
      adjustments: [],
    },
  } as SimulationResult);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

async function renderSimulation() {
  const simulationControl = {
    recalculateScenario,
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

function getButton(label: string): HTMLButtonElement {
  const button = [...container.querySelectorAll('button')].find(
    (item) => item.textContent?.trim() === label,
  );

  if (!button) {
    throw new Error(`Missing button: ${label}`);
  }

  return button;
}

async function clickButton(label: string) {
  await act(async () => {
    getButton(label).click();
  });
}

function getFactorInput(
  factor: string,
  level: string,
): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>(
    `input[name="${factor}"][value="${level}"]`,
  );

  if (!input) {
    throw new Error(`Missing factor option: ${factor} / ${level}`);
  }

  return input;
}

async function chooseFactor(factor: string, level: string) {
  const input = getFactorInput(factor, level);

  await act(async () => {
    input.click();
  });
}

describe('SimulationBoundary (ticket 24)', () => {
  it('displays all three adjustable risk factors', async () => {
    await renderSimulation();

    expect(container.textContent).toContain('Humidity');
    expect(container.textContent).toContain('Lagged rainfall');
    expect(container.textContent).toContain('High-Aedes area overlap');
  });

  it('starts with No change selected for every factor', async () => {
    await renderSimulation();

    for (const factor of Object.values(AdjustableRiskFactorType)) {
      expect(
        getFactorInput(factor, AdjustmentLevel.NoChange).checked,
      ).toBe(true);
    }
  });

  it('requires at least one change before calculating', async () => {
    await renderSimulation();
    await clickButton('Calculate scenario');

    expect(container.querySelector('[role="alert"]')?.textContent)
      .toContain('Choose at least one change');
    expect(recalculateScenario).not.toHaveBeenCalled();
  });

  it('passes selected adjustments to RiskSimulationControl', async () => {
    await renderSimulation();

    await chooseFactor(
      AdjustableRiskFactorType.Humidity,
      AdjustmentLevel.Increase,
    );

    await clickButton('Calculate scenario');

    expect(recalculateScenario).toHaveBeenCalledWith(
      baseline,
      [
        {
          factorType: AdjustableRiskFactorType.Humidity,
          adjustmentLevel: AdjustmentLevel.Increase,
        },
      ],
      snapshot,
    );
  });

  it('shows baseline and simulated risk comparison', async () => {
    await renderSimulation();

    await chooseFactor(
      AdjustableRiskFactorType.LaggedRainfall,
      AdjustmentLevel.Decrease,
    );

    await clickButton('Calculate scenario');

    expect(container.textContent).toContain(
      'Baseline vs simulated risk',
    );
    expect(container.textContent).toContain('40.0');
    expect(container.textContent).toContain('65.0');
    expect(container.textContent).toContain('+25.0');
    expect(container.textContent).toContain(
      'Hypothetical scenario only',
    );
  });

  it('resets all adjustments and clears the comparison', async () => {
    await renderSimulation();

    await chooseFactor(
      AdjustableRiskFactorType.HighAedesArea,
      AdjustmentLevel.Increase,
    );

    await clickButton('Calculate scenario');

    expect(container.textContent).toContain(
      'Baseline vs simulated risk',
    );

    await clickButton('Reset to baseline');

    for (const factor of Object.values(AdjustableRiskFactorType)) {
      expect(
        getFactorInput(factor, AdjustmentLevel.NoChange).checked,
      ).toBe(true);
    }

    expect(container.textContent).not.toContain(
      'Baseline vs simulated risk',
    );
  });

  it('shows an error when simulation calculation fails', async () => {
    recalculateScenario.mockRejectedValue(
      new Error('Internal simulation failure'),
    );

    await renderSimulation();

    await chooseFactor(
      AdjustableRiskFactorType.Humidity,
      AdjustmentLevel.Increase,
    );

    await clickButton('Calculate scenario');

    expect(container.querySelector('[role="alert"]')?.textContent)
      .toContain('Simulation could not be calculated');
    expect(container.textContent).not.toContain(
      'Internal simulation failure',
    );
  });
});
