// @vitest-environment jsdom
// - Check the real dashboard from search and map selection through simulation.
// - Keep the main map and original assessment unchanged during a what-if preview.
// - Check safe errors, source links and the calculation popup without live APIs.
// - Keep one visible factor breakdown beside the selected area's result.

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
  ContributionLevel,
  DataConfidence,
  DatasetStatus,
  RiskFactorType,
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

  it('groups the five factor readings and one calculation popup inside the area card', async () => {
    baseline.contributions = [
      { factorType: RiskFactorType.Humidity, inputValue: 77.3, contribution: 7,
        contributionLevel: ContributionLevel.Moderate, explanation: 'Humidity scores 53/100' },
      { factorType: RiskFactorType.LaggedRainfall, inputValue: 112, contribution: 2.6,
        contributionLevel: ContributionLevel.Moderate, explanation: 'Rainfall comparison' },
      { factorType: RiskFactorType.PopulationDensity, inputValue: 13503, contribution: 12.4,
        contributionLevel: ContributionLevel.Moderate, explanation: 'Population comparison' },
      { factorType: RiskFactorType.HighAedesArea, inputValue: 0.05, contribution: 18,
        contributionLevel: ContributionLevel.High, explanation: 'Area overlap comparison' },
      { factorType: RiskFactorType.DengueClusters, inputValue: 0, contribution: 0,
        contributionLevel: ContributionLevel.Low, explanation: 'Cluster comparison' },
    ];
    await renderDashboard();
    await selectFirstArea();

    const card = selectedCard();
    const breakdown = card.querySelector('.score-breakdown')!;
    expect(container.querySelectorAll('.score-breakdown')).toHaveLength(1);
    expect(breakdown.querySelectorAll('.factor-list > li')).toHaveLength(5);
    expect(breakdown.querySelector('.factor-list > li')?.textContent).toContain('Adds 18.0 points');
    expect(breakdown.textContent).toContain('77.3% humidity');
    expect(breakdown.textContent).toContain('112 mm of rain from 2–3 months ago');
    expect(breakdown.textContent).toContain('13,503 residents/km²');
    expect(breakdown.textContent).toContain('5% of this area overlaps');
    expect(breakdown.textContent).toContain('0 cluster cases nearby');
    expect(breakdown.querySelector('details')).toBeNull();
    expect(breakdown.textContent).not.toContain('53/100');
    expect(container.textContent).not.toContain('Why this matters');
    expect(card.querySelectorAll('.risk-scale-segment')).toHaveLength(4);
    expect(container.querySelectorAll('.method-link')).toHaveLength(1);
    expect(breakdown.querySelector('.method-link')).not.toBeNull();
    const ranking = container.querySelector('.map-ranking')!;
    expect(card.compareDocumentPosition(ranking) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows national totals and one update time in both empty and selected states', async () => {
    await renderDashboard();
    const totals = container.querySelector('[aria-label="Singapore-wide data"]')!;
    const counts = [...totals.querySelectorAll('.snapshot-stat > strong')].map(e => e.textContent);
    expect(counts).toEqual([
      String(snapshot.subzones.length), String(snapshot.dengueClusters.length),
      String(snapshot.highAedesAreas.length),
    ]);
    expect(selectedCard().querySelector('.risk-index-number')).toBeNull();
    expect(selectedCard().querySelector('button')?.disabled).toBe(true);
    expect(container.querySelector('.map-cluster-status')?.textContent).toContain('Select an area');
    expect(container.querySelectorAll('.snapshot-updated time')).toHaveLength(1);
    await selectFirstArea();
    expect(container.querySelectorAll('.snapshot-updated time')).toHaveLength(1);
    expect(selectedCard().querySelector('.area-overview .risk-index-number')).not.toBeNull();
    expect(selectedCard().querySelector('.area-overview .area-preview-map')).not.toBeNull();
    expect(selectedCard().querySelector('.confidence-help')).not.toBeNull();
    expect(selectedCard().querySelector('.data-time')).toBeNull();
  });

  it('labels failed overlay counts as unavailable instead of showing a misleading zero', async () => {
    snapshot.datasets = {
      ...snapshot.datasets,
      dengueClusters: { status: DatasetStatus.Failed, retrievedAt: snapshot.generatedAt },
      highAedesAreas: { status: DatasetStatus.Failed, retrievedAt: snapshot.generatedAt },
    };
    await renderDashboard();
    const counts = [...container.querySelectorAll('.snapshot-stat > strong')].map(e => e.textContent);
    expect(counts.slice(1)).toEqual(['Unavailable', 'Unavailable']);
    await selectFirstArea();
    expect(container.querySelector('.map-cluster-status')?.textContent).toContain('Unavailable');
    expect(container.querySelector('.map-cluster-status')?.textContent).not.toContain('None recorded');
  });

  it('puts overlapping-cluster counts inside the map and keeps national totals separate', async () => {
    // This cluster overlaps the selected zone although its stored ID names another zone.
    snapshot.dengueClusters = [
      { ...snapshot.dengueClusters[0], caseCount: 20,
        subzoneId: snapshot.subzones[1].subzoneId, geometry: snapshot.subzones[0].boundary },
      snapshot.dengueClusters[2],
    ];
    await renderDashboard();
    await selectFirstArea();
    const row = container.querySelector('.map-cluster-status')!;
    expect(row.closest('.map-card')).not.toBeNull();
    expect([...row.querySelectorAll('strong')].map(e => e.textContent)).toEqual(['1', '20']);
    expect(row.textContent).toContain('Cases reported across these clusters');
    expect(container.querySelectorAll('.snapshot-stat > strong')[1].textContent).toBe('2');
    expect(container.querySelector('#clusters-heading')).toBeNull();
    expect(row.compareDocumentPosition(container.querySelector('.map-legend')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows none recorded only when usable cluster data has no matching records', async () => {
    snapshot.dengueClusters = [];
    await renderDashboard();
    await selectFirstArea();
    expect(container.querySelector('.map-cluster-status')?.textContent).toContain('None recorded');
    expect(container.querySelector('.map-cluster-status')?.textContent).not.toContain('Unavailable');
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
