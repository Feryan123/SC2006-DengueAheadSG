// @vitest-environment jsdom
// - Ticket 18: RiskResultBoundary shows the risk level, why, data confidence, tips and disclaimer.
// - Uses fake assessments and a fake PreventionGuidanceControl, so no real data is involved.

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import RiskResultBoundary, { type RiskResultBoundaryProps } from './RiskResultBoundary.tsx';
import type { PreventionGuidanceControl } from '../control/PreventionGuidanceControl.ts';
import type { DengueCluster } from '../entity/DengueCluster.ts';
import type { PlanningSubzone } from '../entity/PlanningSubzone.ts';
import type { PreventionTask } from '../entity/PreventionTask.ts';
import type { RiskAssessment } from '../entity/RiskAssessment.ts';
import {
  AssessmentType, ContributionLevel, DataConfidence, RiskFactorType, RiskLevel,
} from '../entity/enums.ts';

const subzone = { subzoneId: 'SZ1', name: 'Bedok North' } as unknown as PlanningSubzone;

function contribution(factorType: RiskFactorType, value: number, level: ContributionLevel, explanation: string) {
  return { factorType, inputValue: 1, contribution: value, contributionLevel: level, explanation };
}

function makeAssessment(overrides: Partial<RiskAssessment> = {}): RiskAssessment {
  return {
    assessmentId: 'a1', subzoneId: 'SZ1', riskIndex: 65, riskLevel: RiskLevel.High,
    horizonDays: 14, dataConfidence: DataConfidence.Medium, assessmentType: AssessmentType.Baseline,
    generatedAt: '2026-10-28T01:00:00.000Z', dataTimeStamp: '2026-10-28T00:00:00.000Z',
    contributions: [
      contribution(RiskFactorType.Humidity, 10, ContributionLevel.Low, 'Humidity 80% scores 40/100'),
      contribution(RiskFactorType.DengueClusters, 40, ContributionLevel.High, '5 cluster cases nearby'),
      contribution(RiskFactorType.PopulationDensity, 15, ContributionLevel.Moderate, '9000 residents/km2'),
    ],
    ...overrides,
  } as RiskAssessment;
}

const tip: PreventionTask = {
  taskId: 'tip-1', actionText: 'Do the Mozzie Wipeout every week', explanation: 'Removes stagnant water.',
  riskLevels: [RiskLevel.High], sourceUrl: 'https://www.nea.gov.sg/dengue-zika/stop-dengue-now',
};

function controlReturning(tips: PreventionTask[]) {
  const generateTips = vi.fn(async () => tips);
  return { control: { generateTips } as unknown as PreventionGuidanceControl, generateTips };
}

let container: HTMLDivElement;
let root: Root;

beforeAll(() => {
  Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { configurable: true, value: true });
});

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

async function renderResult(props: Partial<RiskResultBoundaryProps> = {}) {
  const { control } = controlReturning([tip]);
  await act(async () => root.render(
    <RiskResultBoundary subzone={subzone} assessment={makeAssessment()} preventionControl={control} {...props} />,
  ));
}

function button(label: string) {
  const found = [...container.querySelectorAll('button')].find((item) => item.textContent === label);
  if (!found) 
    throw new Error(`Missing button: ${label}`);
    return found;
}

const factorItems = () => [...container.querySelectorAll('[aria-label="Risk factor contributions"] > li')];

describe('RiskResultBoundary (ticket 18)', () => {
  it('shows the area, risk level, risk index and 14-day horizon', async () => {
    await renderResult();
    expect(container.querySelector('h1')?.textContent).toBe('Bedok North');
    expect(container.querySelector('.risk-pill')?.textContent).toBe('High');
    expect(container.textContent).toContain('Risk index 65 out of 100');
    expect(container.textContent).toContain('14-day prediction');
    expect(container.textContent).toContain('2026');
  });

  it('lists contributions from the assessment, largest first, with explanations', async () => {
    await renderResult();
    const items = factorItems();
    expect(items).toHaveLength(3);
    expect(items[0].textContent).toContain('Dengue clusters nearby');
    expect(items[0].textContent).toContain('5 cluster cases nearby');
    expect(items[1].textContent).toContain('Population density');
    expect(items[2].textContent).toContain('Humidity');
  });

  it('shows only the contributions it is given (no hardcoded list)', async () => {
    await renderResult({
      assessment: makeAssessment({
        contributions: [contribution(RiskFactorType.LaggedRainfall, 22.46, ContributionLevel.Moderate, 'Rainfall 200 mm')],
      }),
    });
    expect(factorItems()).toHaveLength(1);
    expect(factorItems()[0].textContent).toContain('22.5 points');
    expect(container.textContent).not.toContain('Dengue clusters nearby');
  });

  it('says so when there are no contributions', async () => {
    await renderResult({ assessment: makeAssessment({ contributions: [] }) });
    expect(factorItems()).toHaveLength(0);
    expect(container.textContent).toContain('Factor details are not available');
  });

  it.each([
    [DataConfidence.High, 'High'],
    [DataConfidence.Medium, 'Medium'],
    [DataConfidence.Low, 'Low'],
  ])('shows data confidence %s', async (confidence, label) => {
    await renderResult({ assessment: makeAssessment({ dataConfidence: confidence }) });
    expect(container.textContent).toContain(`Data confidence: ${label}`);
  });

  it.each([
    [RiskLevel.Low, 'Your area is LOW risk: keep up the basics'],
    [RiskLevel.Moderate, 'Your area is MODERATE risk: stay vigilant'],
    [RiskLevel.High, 'Your area is HIGH risk: take extra precautions'],
    [RiskLevel.VeryHigh, 'Your area is VERY HIGH risk: act today'],
  ])('names %s in the tips heading', async (level, heading) => {
    await renderResult({ assessment: makeAssessment({ riskLevel: level }) });
    expect(container.querySelector('#tips-heading')?.textContent).toBe(heading);
  });

  it('puts the tips section after the contributions', async () => {
    await renderResult();
    const factors = container.querySelector('#factors-heading')!;
    const tips = container.querySelector('#tips-heading')!;
    expect(factors.compareDocumentPosition(tips) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it.each([RiskLevel.High, RiskLevel.VeryHigh])('uses "take extra precautions" wording at %s', async (level) => {
    await renderResult({ assessment: makeAssessment({ riskLevel: level }) });
    expect(container.querySelector('#precautions-note')?.textContent).toContain('Take extra precautions');
  });

  it.each([RiskLevel.Low, RiskLevel.Moderate])('does not add the precautions note at %s', async (level) => {
    await renderResult({ assessment: makeAssessment({ riskLevel: level }) });
    expect(container.querySelector('#precautions-note')).toBeNull();
  });

  it('asks the prevention control for tips and shows them with an NEA source link', async () => {
    const { control, generateTips } = controlReturning([tip]);
    const assessment = makeAssessment();
    await renderResult({ assessment, preventionControl: control });
    expect(generateTips).toHaveBeenCalledWith(assessment, subzone);
    const items = container.querySelectorAll('[aria-label="Prevention tips"] > li');
    expect(items).toHaveLength(1);
    expect(items[0].textContent).toContain('Do the Mozzie Wipeout every week');
    expect(items[0].querySelector('a')?.getAttribute('href')).toBe(tip.sourceUrl);
  });

  it('shows a fallback message when the tips cannot be loaded', async () => {
    const control = { generateTips: vi.fn(async () => { throw new Error('boom'); }) } as unknown as PreventionGuidanceControl;
    await renderResult({ preventionControl: control });
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Prevention tips are unavailable');
    expect(container.querySelector('h1')?.textContent).toBe('Bedok North');
  });

  it('shows the disclaimer', async () => {
    await renderResult();
    expect(container.querySelector('[aria-label="Disclaimer"]')?.textContent).toContain('not an official NEA forecast or medical advice');
  });

  it('calls onSimulate with the assessment, and onBack', async () => {
    const assessment = makeAssessment();
    const onSimulate = vi.fn();
    const onBack = vi.fn();
    await renderResult({ assessment, onSimulate, onBack });
    await act(async () => button('Simulate a scenario').click());
    await act(async () => button('Back').click());
    expect(onSimulate).toHaveBeenCalledWith(assessment);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('shows cluster information only when clusters are supplied', async () => {
    const clusters = [{ clusterId: 'c1', caseCount: 4 }, { clusterId: 'c2', caseCount: 3 }] as unknown as DengueCluster[];
    await renderResult({ clusters });
    expect(container.textContent).toContain('2 active dengue clusters recorded here');
    expect(container.textContent).toContain('7 cases in total');
    await renderResult({ clusters: undefined });
    expect(container.querySelector('#clusters-heading')).toBeNull();
  });
});
