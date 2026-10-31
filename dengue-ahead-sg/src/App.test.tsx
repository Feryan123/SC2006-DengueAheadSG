// @vitest-environment jsdom
// - Check real app navigation, map selection, saved assessment data and footer credits.
// - Use test versions of P2/P5 screens to check their callback connections.
// - Ticket 19: these tests do not implement or claim the unfinished team screens.

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { RiskMapControl } from './control/RiskMapControl.ts';
import { LocationRiskControl } from './control/LocationRiskControl.ts';
import { PreventionGuidanceControl } from './control/PreventionGuidanceControl.ts';
import { RiskSimulationControl } from './control/RiskSimulationControl.ts';
import { RiskAssessmentControl } from './control/RiskAssessmentControl.ts';
import { MockPublicDataService } from './services/mocks/MockPublicDataService.ts';
import { AssessmentType, DataConfidence, RiskLevel } from './entity/enums.ts';
import type { PublicDataSnapshot } from './services/ApprovedPublicDataServiceBoundary.ts';
import type { RiskAssessment } from './entity/RiskAssessment.ts';
import type { HomePageBoundaryProps } from './boundary/HomePageBoundary.tsx';
import type { RiskResultBoundaryProps } from './boundary/RiskResultBoundary.tsx';
import type { SimulationBoundaryProps } from './boundary/SimulationBoundary.tsx';
import type { PreventionGuidanceBoundaryProps } from './boundary/PreventionGuidanceBoundary.tsx';

const screens = vi.hoisted(() => ({ home: vi.fn(), result: vi.fn(), simulation: vi.fn(), prevention: vi.fn() }));
let snapshot: PublicDataSnapshot;
let baseline: RiskAssessment;

vi.mock('./boundary/HomePageBoundary.tsx', () => ({
  default: (props: HomePageBoundaryProps) => {
    screens.home(props);
    return (
      <section aria-label="Test home screen">
        <button onClick={() => props.onAssessmentReady?.(snapshot.subzones[0], baseline, snapshot)}>Test valid location</button>
        <button onClick={() => props.onAssessmentReady?.(snapshot.subzones[0], baseline)}>Test location without snapshot</button>
        <button onClick={() => props.onAssessmentReady?.(snapshot.subzones[0], { ...baseline, subzoneId: 'wrong' })}>Test mismatched area</button>
        <button onClick={() => props.onDataUnavailable?.('Private upstream detail')}>Test failed request</button>
        <button onClick={props.onOpenMap}>Open map from home</button>
        <button onClick={props.onOpenPrevention}>Open guidance from home</button>
      </section>
    );
  },
}));

vi.mock('./boundary/RiskResultBoundary.tsx', () => ({
  default: (props: RiskResultBoundaryProps) => {
    screens.result(props);
    return (
      <section aria-label="Test result screen">
        <h1>{props.subzone.name}</h1>
        <p>{props.assessment.assessmentId}</p>
        <button onClick={() => props.onSimulate?.(props.assessment)}>Simulate</button>
        <button onClick={props.onBack}>Back</button>
      </section>
    );
  },
}));

vi.mock('./boundary/SimulationBoundary.tsx', () => ({
  default: (props: SimulationBoundaryProps) => {
    screens.simulation(props);
    return <h1>Test simulation screen</h1>;
  },
}));

vi.mock('./boundary/PreventionGuidanceBoundary.tsx', () => ({
  default: (props: PreventionGuidanceBoundaryProps) => {
    screens.prevention(props);
    return <section><h1>Test prevention screen</h1><button onClick={props.onBack}>Back from guidance</button></section>;
  },
}));

let App: typeof import('./App.tsx').default;
let container: HTMLDivElement;
let root: Root;
let locationControl: LocationRiskControl;
let mapControl: RiskMapControl;

beforeAll(async () => {
  // jsdom needs a fixed map size and SVG support for real Leaflet layers.
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 800 });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 420 });
  Object.defineProperty(SVGSVGElement.prototype, 'createSVGRect', { configurable: true, value: () => ({}) });
  Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { configurable: true, value: true });
  App = (await import('./App.tsx')).default;
});

beforeEach(async () => {
  vi.clearAllMocks();
  snapshot = await new MockPublicDataService().retrievePublicData();
  baseline = {
    assessmentId: 'test-baseline', subzoneId: snapshot.subzones[0].subzoneId,
    riskIndex: 65, riskLevel: RiskLevel.High, generatedAt: snapshot.generatedAt,
    dataTimeStamp: snapshot.generatedAt, horizonDays: 14, dataConfidence: DataConfidence.High,
    assessmentType: AssessmentType.Baseline, contributions: [],
  };
  locationControl = new LocationRiskControl();
  mapControl = new RiskMapControl(new MockPublicDataService(snapshot), { assessAll: async () => [baseline] });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

async function click(label: string) {
  const button = [...container.querySelectorAll('button')].find((item) => item.textContent === label || item.getAttribute('aria-label') === label);
  if (!button) throw new Error(`Missing button: ${label}`);
  await act(async () => button.click());
}

function simulationControl() {
  return new RiskSimulationControl(new RiskAssessmentControl());
}

describe('App navigation (ticket 19)', () => {
  it('shows an unavailable home instead of a fake working location form when no control is supplied', async () => {
    await act(async () => root.render(<App />));
    expect(container.querySelector('h1')?.textContent).toBe('Location search unavailable');
    expect(container.querySelector('input')).toBeNull();
    expect(container.textContent).not.toContain('PLACEHOLDER');
    expect(container.textContent).not.toContain('Tampines East');
    expect(screens.home).not.toHaveBeenCalled();
  });

  it('stores the home callback data and passes it to the real result interface', async () => {
    await act(async () => root.render(<App locationControl={locationControl} />));
    expect(screens.home).toHaveBeenLastCalledWith(expect.objectContaining({ control: locationControl }));
    await click('Test valid location');
    expect(screens.result).toHaveBeenLastCalledWith(expect.objectContaining({ subzone: snapshot.subzones[0], assessment: baseline }));
    await click('Back');
    expect(container.querySelector('[aria-label="Test home screen"]')).not.toBeNull();
  });

  it('handles a failed home request without exposing the upstream detail', async () => {
    await act(async () => root.render(<App locationControl={locationControl} />));
    await click('Test failed request');
    expect(container.querySelector('h1')?.textContent).toBe('Risk assessment unavailable');
    expect(container.textContent).not.toContain('Private upstream detail');
    expect(screens.result).not.toHaveBeenCalled();
  });

  it('rejects a result for a different subzone', async () => {
    await act(async () => root.render(<App locationControl={locationControl} />));
    await click('Test mismatched area');
    expect(container.querySelector('h1')?.textContent).toBe('Risk assessment unavailable');
    expect(screens.result).not.toHaveBeenCalled();
  });

  it('opens the map from home and passes the clicked area and its assessment to the result', async () => {
    await act(async () => root.render(<App locationControl={locationControl} mapControl={mapControl} />));
    await click('Open map from home');
    await act(async () => container.querySelector('path.leaflet-interactive')!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await click('View full assessment');
    expect(screens.result).toHaveBeenLastCalledWith(expect.objectContaining({
      subzone: snapshot.subzones[0], assessment: baseline,
      clusters: snapshot.dengueClusters.filter((cluster) => cluster.subzoneId === baseline.subzoneId),
    }));
    await click('Back');
    expect(container.querySelector('h1')?.textContent).toBe('Singapore Risk Map');
    expect(container.querySelectorAll('path.leaflet-interactive')).toHaveLength(snapshot.subzones.length);
  });

  it('keeps the exact map baseline and snapshot for simulation and return to the result', async () => {
    const simulation = simulationControl();
    await act(async () => root.render(<App mapControl={mapControl} simulationControl={simulation} />));
    await click('Open Risk Map');
    await act(async () => container.querySelector('path.leaflet-interactive')!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await click('View Assessment');
    await click('Simulate');
    expect(screens.simulation).toHaveBeenLastCalledWith({ baseline, snapshot, simulationControl: simulation });
    await click('Back to assessment');
    expect(screens.result).toHaveBeenLastCalledWith(expect.objectContaining({ assessment: baseline, subzone: snapshot.subzones[0] }));
  });

  it('shows unavailable data if a map result has no full assessment context', async () => {
    const loaded = await mapControl.loadRiskMap();
    if (loaded.status !== 'OK') throw new Error('Expected loaded test map.');
    delete loaded.data.snapshot;
    vi.spyOn(mapControl, 'loadRiskMap').mockResolvedValue(loaded);
    await act(async () => root.render(<App mapControl={mapControl} />));
    await click('Open Risk Map');
    await act(async () => container.querySelector('path.leaflet-interactive')!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await click('View Assessment');
    expect(container.querySelector('h1')?.textContent).toBe('Risk assessment unavailable');
    expect(screens.result).not.toHaveBeenCalled();
  });

  it('does not simulate a home assessment without its original snapshot', async () => {
    await act(async () => root.render(<App locationControl={locationControl} simulationControl={simulationControl()} />));
    await click('Test location without snapshot');
    await click('Simulate');
    expect(container.querySelector('h1')?.textContent).toBe('Simulation unavailable');
    expect(screens.simulation).not.toHaveBeenCalled();
    await click('Back to assessment');
    expect(container.querySelector('h1')?.textContent).toBe(snapshot.subzones[0].name);
  });

  it('passes the supplied shared snapshot with a home baseline to simulation', async () => {
    const simulation = simulationControl();
    await act(async () => root.render(<App locationControl={locationControl} simulationControl={simulation} />));
    await click('Test valid location');
    await click('Simulate');
    expect(screens.simulation).toHaveBeenLastCalledWith({ baseline, snapshot, simulationControl: simulation });
  });

  it('shows unavailable simulation when its control is missing', async () => {
    await act(async () => root.render(<App locationControl={locationControl} />));
    await click('Test valid location');
    await click('Simulate');
    expect(container.querySelector('h1')?.textContent).toBe('Simulation unavailable');
    expect(screens.simulation).not.toHaveBeenCalled();
  });

  it('opens the prevention boundary from home and passes its control and return action', async () => {
    const preventionControl = new PreventionGuidanceControl();
    await act(async () => root.render(<App locationControl={locationControl} preventionControl={preventionControl} />));
    await click('Open guidance from home');
    expect(screens.prevention).toHaveBeenLastCalledWith(expect.objectContaining({ control: preventionControl }));
    await click('Back from guidance');
    expect(container.querySelector('[aria-label="Test home screen"]')).not.toBeNull();
  });

  it('shows unavailable guidance without inserting sample health advice', async () => {
    await act(async () => root.render(<App />));
    await click('Prevention Guidance');
    expect(container.querySelector('h1')?.textContent).toBe('Prevention guidance unavailable');
    expect(container.textContent).not.toContain('PLACEHOLDER');
    expect(screens.prevention).not.toHaveBeenCalled();
    await click('Return Home');
    expect(container.querySelector('h1')?.textContent).toBe('Location search unavailable');
  });

  it('uses the main navigation and brand without leaving stale assessment actions', async () => {
    await act(async () => root.render(<App locationControl={locationControl} mapControl={mapControl} />));
    await click('Test valid location');
    await click('DengueAhead SG home');
    await click('Test failed request');
    expect([...container.querySelectorAll('button')].some((item) => item.textContent === 'Back to assessment')).toBe(false);
    await click('Open Risk Map');
    expect(container.querySelector('[aria-current="page"]')?.textContent).toBe('Risk Map');
    await click('Home');
    expect(container.querySelector('[aria-current="page"]')?.textContent).toBe('Home');
  });

  it('keeps the required footer credits and disclaimer visible', async () => {
    await act(async () => root.render(<App />));
    const footer = container.querySelector('footer')!;
    expect([...footer.querySelectorAll('a')].map((link) => link.getAttribute('href'))).toEqual([
      'https://www.onemap.gov.sg/', 'https://www.sla.gov.sg/', 'https://data.gov.sg/', 'https://data.gov.sg/open-data-licence',
    ]);
    expect(footer.textContent).toContain('Singapore Open Data Licence');
    expect(footer.textContent).toContain('Not an official NEA forecast or medical advice.');
  });
});

describe('Navigation highlight (bug #60)', () => {
  const activeNav = () => container.querySelector('[aria-current="page"]')?.textContent;

  async function selectFirstMapArea() {
    await act(async () => container.querySelector('path.leaflet-interactive')!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  }

  it('highlights Risk Map, not Home, for a result opened from the map', async () => {
    await act(async () => root.render(<App locationControl={locationControl} mapControl={mapControl} />));
    await click('Open map from home');
    await selectFirstMapArea();
    await click('View full assessment');
    expect(container.querySelector('[aria-label="Test result screen"]')).not.toBeNull();
    expect(activeNav()).toBe('Risk Map');
  });

  it('keeps Home highlighted for a result opened from the home search', async () => {
    await act(async () => root.render(<App locationControl={locationControl} mapControl={mapControl} />));
    await click('Test valid location');
    expect(container.querySelector('[aria-label="Test result screen"]')).not.toBeNull();
    expect(activeNav()).toBe('Home');
  });

  it('keeps Risk Map highlighted on the simulation opened from a map result', async () => {
    await act(async () => root.render(<App mapControl={mapControl} simulationControl={simulationControl()} />));
    await click('Open Risk Map');
    await selectFirstMapArea();
    await click('View Assessment');
    await click('Simulate');
    expect(container.querySelector('h1')?.textContent).toBe('Test simulation screen');
    expect(activeNav()).toBe('Risk Map');
  });
});
