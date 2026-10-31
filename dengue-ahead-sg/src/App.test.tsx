// @vitest-environment jsdom
// - Check the real dashboard from search and map selection through simulation.
// - Keep the main map and original assessment unchanged during a what-if preview.
// - Check safe errors, source links and the calculation popup without live APIs.

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { RiskMapControl } from './control/RiskMapControl.ts';
import { LocationRiskControl } from './control/LocationRiskControl.ts';
import { RiskSimulationControl } from './control/RiskSimulationControl.ts';
import { RiskAssessmentControl } from './control/RiskAssessmentControl.ts';
import { MockPublicDataService } from './services/mocks/MockPublicDataService.ts';
import {
  AdjustableRiskFactorType,
  AssessmentType,
  DataConfidence,
  RiskLevel,
  QueryType,
  ValidationStatus,
} from './entity/enums.ts';
import type { PublicDataSnapshot } from './services/ApprovedPublicDataServiceBoundary.ts';
import type { RiskAssessment } from './entity/RiskAssessment.ts';

let App: typeof import('./App.tsx').default;
let container: HTMLDivElement;
let root: Root;
let snapshot: PublicDataSnapshot;
let baseline: RiskAssessment;
let mapControl: RiskMapControl;
let locationControl: LocationRiskControl;
let simulationControl: RiskSimulationControl;

beforeAll(async () => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get: () => 800,
  });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get: () => 420,
  });
  Object.defineProperty(SVGSVGElement.prototype, 'createSVGRect', {
    configurable: true,
    value: () => ({}),
  });
  Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
    configurable: true,
    value: true,
  });
  App = (await import('./App.tsx')).default;
});

beforeEach(async () => {
  snapshot = await new MockPublicDataService().retrievePublicData();
  baseline = {
    assessmentId: 'dashboard-baseline',
    subzoneId: snapshot.subzones[0].subzoneId,
    riskIndex: 40,
    riskLevel: RiskLevel.Moderate,
    generatedAt: snapshot.generatedAt,
    dataTimeStamp: snapshot.generatedAt,
    horizonDays: 14,
    dataConfidence: DataConfidence.High,
    assessmentType: AssessmentType.Baseline,
    contributions: [],
  };
  mapControl = new RiskMapControl(new MockPublicDataService(snapshot), {
    assessAll: async () => [baseline],
  });
  locationControl = new LocationRiskControl();
  simulationControl = new RiskSimulationControl(new RiskAssessmentControl());
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

async function renderDashboard() {
  await act(async () =>
    root.render(
      <App
        mapControl={mapControl}
        locationControl={locationControl}
        simulationControl={simulationControl}
      />,
    ),
  );
}

async function click(label: string) {
  const button = [...container.querySelectorAll('button')].find(
    (item) => item.textContent?.trim() === label || item.getAttribute('aria-label') === label,
  );
  if (!button) throw new Error(`Missing button: ${label}`);
  await act(async () => button.click());
}

async function enter(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function search(query: string) {
  await enter(container.querySelector('input[type="search"]')!, query);
  await act(async () =>
    container
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
  );
}

async function selectFirstArea() {
  await act(async () =>
    container
      .querySelector('.risk-map path.leaflet-interactive')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true })),
  );
}

function selectedCard() {
  return container.querySelector('[aria-label="Selected area"]')!;
}

describe('Single-page dashboard', () => {
  it('opens the map directly with one search and prevention below it', async () => {
    await renderDashboard();
    expect(container.querySelector('h1')?.textContent).toBe('Check dengue risk in your area');
    expect(container.querySelector('nav')).toBeNull();
    expect(container.querySelector('input[type="search"]')).not.toBeNull();
    expect(container.querySelector('.risk-map')).not.toBeNull();
    expect(container.querySelector('#prevention-heading')?.textContent).toBe(
      'Prevention starts at home',
    );
    expect(selectedCard().textContent).toContain('Enter a postal code or area name');
  });

  it('shows a selected area directly without a floating popup or rebuilding the main map', async () => {
    await renderDashboard();
    const originalMap = container.querySelector('.risk-map');
    await selectFirstArea();
    expect(selectedCard().querySelector('h2')?.textContent).toBe(snapshot.subzones[0].name);
    expect(selectedCard().textContent).toContain('40.0');
    expect(container.querySelector('.leaflet-popup')).toBeNull();
    expect(container.querySelector('.risk-map')).toBe(originalMap);
    expect(container.querySelector('#factors-heading')).not.toBeNull();
  });

  it('searches local subzone names without calling the address service', async () => {
    const lookup = vi.spyOn(locationControl, 'assessLocation');
    await renderDashboard();
    await search(`  ${snapshot.subzones[0].name.toLowerCase()}  `);
    expect(selectedCard().querySelector('h2')?.textContent).toBe(snapshot.subzones[0].name);
    expect(lookup).not.toHaveBeenCalled();
  });

  it('uses the postal search service and preserves the baseline shown on the map', async () => {
    vi.spyOn(locationControl, 'assessLocation').mockResolvedValue({
      status: 'OK',
      query: {
        queryText: '680123',
        queryType: QueryType.PostalCode,
        validationStatus: ValidationStatus.Valid,
      },
      subzone: snapshot.subzones[0],
      assessment: { ...baseline, riskIndex: 60 },
      snapshot,
    });
    await renderDashboard();
    await search('680123');
    expect(locationControl.assessLocation).toHaveBeenCalledWith('680123');
    expect(selectedCard().textContent).toContain('40.0');
    expect(container.querySelector('select')?.value).toBe(baseline.subzoneId);
  });

  it('keeps the previous selection on a failed search and hides private service errors', async () => {
    vi.spyOn(locationControl, 'assessLocation').mockRejectedValue(
      new Error('Private upstream details'),
    );
    await renderDashboard();
    await selectFirstArea();
    await search('680123');
    expect(container.textContent).toContain('Location search is unavailable');
    expect(container.textContent).not.toContain('Private upstream details');
    expect(selectedCard().querySelector('h2')?.textContent).toBe(snapshot.subzones[0].name);
  });

  it('does not let a delayed postal search overwrite a newer map selection', async () => {
    let finish: (value: Awaited<ReturnType<LocationRiskControl['assessLocation']>>) => void;
    vi.spyOn(locationControl, 'assessLocation').mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    await renderDashboard();
    await search('680123');
    await selectFirstArea();
    await act(async () => finish!({ status: 'DATA_UNAVAILABLE', reason: 'Old search error' }));
    expect(selectedCard().querySelector('h2')?.textContent).toBe(snapshot.subzones[0].name);
    expect(container.querySelector('.search-message')).toBeNull();
  });

  it('shows unavailable risk for an unassessed area instead of a made-up score', async () => {
    await renderDashboard();
    await act(async () =>
      container
        .querySelectorAll('.risk-map path.leaflet-interactive')[1]
        .dispatchEvent(new MouseEvent('click', { bubbles: true })),
    );
    expect(selectedCard().textContent).toContain('A risk assessment is unavailable');
    expect(container.querySelector('.area-score')).toBeNull();
  });

  it('changes only the preview during simulation and restores the baseline on reset and close', async () => {
    const simulated = {
      ...baseline,
      assessmentId: 'what-if',
      riskIndex: 65,
      riskLevel: RiskLevel.High,
    };
    const calculate = vi.spyOn(simulationControl, 'recalculateScenario').mockResolvedValue({
      baseline,
      simulated,
      scenario: {
        scenarioId: 'scenario',
        createdAt: snapshot.generatedAt,
        isHypothetical: true,
        baselineAssessmentId: baseline.assessmentId,
        adjustments: [],
      },
    });
    await renderDashboard();
    await selectFirstArea();
    const mainPolygon = container.querySelector('.risk-map path')!;
    const originalFill = mainPolygon.getAttribute('fill');
    await click('Simulate risk');
    expect(container.querySelector('.risk-map')?.closest('[hidden]')).not.toBeNull();
    await enter(container.querySelector(`#value-${AdjustableRiskFactorType.Humidity}`)!, '80');
    expect(calculate).toHaveBeenCalledWith(baseline, expect.any(Array), snapshot);
    expect(container.querySelector('.simulation-scores')?.textContent).toContain('65.0');
    expect(container.querySelector('.simulation-scores')?.textContent).toContain('+25.0');
    expect(
      container.querySelector('.simulation-preview .area-preview-map path')?.getAttribute('fill'),
    ).toBe('#6baed6');
    expect(mainPolygon.getAttribute('fill')).toBe(originalFill);
    expect(baseline.riskIndex).toBe(40);
    await click('Reset to baseline');
    expect(
      container.querySelector('.simulation-preview .area-preview-map path')?.getAttribute('fill'),
    ).toBe('#bdd7e7');
    await click('Back to current risk map');
    expect(container.querySelector('input[type="range"]')).toBeNull();
    expect(selectedCard().textContent).toContain('40.0');
    expect(container.querySelector('.risk-map')).toBe(mainPolygon.closest('.risk-map'));
    expect(container.querySelector('.risk-map')?.closest('[hidden]')).toBeNull();
  });

  it('clears a simulation when another area is selected', async () => {
    await renderDashboard();
    await selectFirstArea();
    await click('Simulate risk');
    await click('Back to current risk map');
    const select = container.querySelector('select')!;
    await act(async () => {
      select.value = '';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(container.querySelector('input[type="range"]')).toBeNull();
    expect(selectedCard().textContent).toContain('Enter a postal code or area name');
  });

  it('opens a calculation dialog with the configured weights and research links', async () => {
    // jsdom does not implement native dialogs; browser checks cover focus and Escape.
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: function () {
        this.open = true;
      },
    });
    await renderDashboard();
    await selectFirstArea();
    await click('How is this calculated?');
    const dialog = container.querySelector('dialog')!;
    expect(dialog.open).toBe(true);
    expect(
      [...dialog.querySelectorAll('.method-weights strong')].map((item) => item.textContent),
    ).toEqual(['33.3%', '26.7%', '20.0%', '13.3%', '6.7%']);
    expect(dialog.querySelectorAll('.research-links a')).toHaveLength(3);
    expect(
      [...dialog.querySelectorAll('a')].every(
        (link) => link.target === '_blank' && link.rel.includes('noopener'),
      ),
    ).toBe(true);
    expect(dialog.textContent).toContain('not an infection probability');
  });

  it('keeps the complete prevention checklist available after selecting an area', async () => {
    await renderDashboard();
    await selectFirstArea();
    const checklist = container.querySelector('.full-checklist')!;
    expect(checklist.querySelectorAll('.prevention-cards > li')).toHaveLength(15);
    await act(async () => (checklist.querySelector('summary') as HTMLElement).click());
    await act(async () =>
      (checklist.querySelector('.prevention-cards button') as HTMLButtonElement).click(),
    );
    expect(checklist.querySelector('.task-details-panel a')?.getAttribute('href')).toContain(
      'https://www.nea.gov.sg/',
    );
  });

  it('retains the required credits and licence links', async () => {
    await renderDashboard();
    const footer = container.querySelector('footer')!;
    expect(footer.querySelectorAll('a')).toHaveLength(4);
    expect(footer.textContent).toContain('Singapore Open Data Licence');
    expect(footer.textContent).toContain('Not an official NEA forecast or medical advice.');
  });
});

describe('Headings (Ticket 60, dashboard layout)', () => {
  it('has exactly one h1, with prevention guidance as a section under it', async () => {
    await renderDashboard();
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelector('#prevention-heading')?.tagName).toBe('H2');
  });
});
