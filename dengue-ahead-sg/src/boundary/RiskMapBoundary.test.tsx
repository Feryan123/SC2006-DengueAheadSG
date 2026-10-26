// @vitest-environment jsdom
// - Draw the real Leaflet layers using test data, without network requests.
// - Check colours, area selection, errors and safe area names.
// - Ticket #20: Explore Risk Map / Assess Location Risk.

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import RiskResultBoundary from './RiskResultBoundary.tsx';
import { getRiskLevelStyle, riskLevelStyle } from './riskLevelStyle.ts';
import { RiskMapControl } from '../control/RiskMapControl.ts';
import { MockPublicDataService } from '../services/mocks/MockPublicDataService.ts';
import { AssessmentType, DataConfidence, RiskLevel } from '../entity/enums.ts';
import type { RiskAssessment } from '../entity/RiskAssessment.ts';
import officialOutlinesJson from '../assets/subzones.geojson?raw';
import { loadSubzoneBoundaries } from '../services/SubzoneBoundaryService.ts';

let RiskMapBoundary: typeof import('./RiskMapBoundary.tsx').default;
let container: HTMLDivElement;
let root: Root;

beforeAll(async () => {
  // jsdom has no layout. Give Leaflet a map size and SVG support for these tests.
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 800 });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 420 });
  Object.defineProperty(SVGSVGElement.prototype, 'createSVGRect', { configurable: true, value: () => ({}) });
  Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { configurable: true, value: true });
  RiskMapBoundary = (await import('./RiskMapBoundary.tsx')).default;
});

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function assessment(subzoneId: string, riskLevel: RiskLevel): RiskAssessment {
  return {
    assessmentId: `test-${subzoneId}`, subzoneId, riskLevel, riskIndex: 50,
    generatedAt: '2026-10-26T00:00:00Z', dataTimeStamp: '2026-10-26T00:00:00Z',
    horizonDays: 14, dataConfidence: DataConfidence.High,
    assessmentType: AssessmentType.Baseline, contributions: [],
  };
}

async function mapWithAssessments() {
  const snapshot = await new MockPublicDataService().retrievePublicData();
  const assessments = Object.values(RiskLevel).map((level, index) => assessment(snapshot.subzones[index].subzoneId, level));
  return { snapshot, control: new RiskMapControl(new MockPublicDataService(snapshot), { assessAll: async () => assessments }) };
}

function button(label: string) {
  const found = [...container.querySelectorAll('button')].find((item) => item.textContent === label);
  if (!found) throw new Error(`Button not found: ${label}`);
  return found;
}

describe('Risk map', () => {
  it('draws polygons with the four assessment colours and leaves missing assessments grey', async () => {
    const { snapshot, control } = await mapWithAssessments();
    await act(async () => root.render(<RiskMapBoundary control={control} onRequestAssessment={() => {}} />));
    const paths = [...container.querySelectorAll('path.leaflet-interactive')];
    expect(paths).toHaveLength(snapshot.subzones.length);
    expect(paths.map((path) => path.getAttribute('fill'))).toEqual([
      ...Object.values(riskLevelStyle).map((style) => style.colour), '#d9d9d9', '#d9d9d9',
    ]);
    for (const style of Object.values(riskLevelStyle)) expect(container.querySelector('.map-legend')?.textContent).toContain(style.label);
    expect(container.textContent).toContain('Singapore Land Authority');
  });

  it('selects a clicked area, shows its level and passes its ID to the result action', async () => {
    const { snapshot, control } = await mapWithAssessments();
    const onRequestAssessment = vi.fn();
    await act(async () => root.render(<RiskMapBoundary control={control} onRequestAssessment={onRequestAssessment} />));
    const path = container.querySelector('path.leaflet-interactive')!;
    await act(async () => path.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(container.querySelector('.map-summary')?.textContent).toContain(snapshot.subzones[0].name);
    expect(container.querySelector('.map-summary .risk-pill')?.textContent).toBe('Low');
    expect(path.getAttribute('stroke-width')).toBe('3');
    expect(path.getAttribute('stroke')).toBe('#e600a9');
    expect(path.getAttribute('stroke-dasharray')).toBeNull();
    await act(async () => button('View Assessment').click());
    expect(onRequestAssessment).toHaveBeenCalledExactlyOnceWith(snapshot.subzones[0].subzoneId);
  });

  it('uses dashed purple boundaries and restores them when another area is selected', async () => {
    const { control } = await mapWithAssessments();
    await act(async () => root.render(<RiskMapBoundary control={control} onRequestAssessment={() => {}} />));
    const paths = [...container.querySelectorAll('path.leaflet-interactive')];
    expect(paths[0].getAttribute('stroke')).toBe('#7c3aed');
    expect(paths[0].getAttribute('stroke-dasharray')).toBe('4 4');
    await act(async () => paths[0].dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await act(async () => paths[1].dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(paths[0].getAttribute('stroke')).toBe('#7c3aed');
    expect(paths[0].getAttribute('stroke-dasharray')).toBe('4 4');
    expect(paths[1].getAttribute('stroke')).toBe('#e600a9');
    expect(paths[1].getAttribute('stroke-dasharray')).toBeNull();
  });

  it('allows keyboard selection and does not offer an assessment for an unassessed area', async () => {
    const { snapshot, control } = await mapWithAssessments();
    await act(async () => root.render(<RiskMapBoundary control={control} onRequestAssessment={() => {}} />));
    const select = container.querySelector('select')!;
    await act(async () => {
      select.value = snapshot.subzones[3].subzoneId;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(container.querySelector('.map-summary .risk-pill')?.textContent).toBe('Very High');
    await act(async () => {
      select.value = snapshot.subzones[4].subzoneId;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(container.querySelector('.map-summary .risk-pill')?.textContent).toBe('Risk unavailable');
    expect(button('View Assessment').disabled).toBe(true);
  });

  it('draws all official subzone outlines and does not invent risk colours', async () => {
    const outlines = JSON.parse(officialOutlinesJson);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => outlines }));
    await act(async () => root.render(<StrictMode><RiskMapBoundary onRequestAssessment={() => {}} /></StrictMode>));
    expect(container.textContent).toContain('Official subzone outlines are shown');
    expect(container.querySelectorAll('.leaflet-container')).toHaveLength(1);
    const paths = [...container.querySelectorAll('path.leaflet-interactive')];
    expect(paths).toHaveLength(332);
    expect(container.querySelectorAll('select option')).toHaveLength(333);
    expect(paths.every((path) => path.getAttribute('fill') === '#d9d9d9')).toBe(true);
    expect(button('View Assessment').disabled).toBe(true);
    expect([...container.querySelectorAll('input[type="checkbox"]')].every((input) => (input as HTMLInputElement).disabled)).toBe(true);
  });

  it('connects assessAll results to the legend colours for all 332 official area IDs', async () => {
    const outlines = JSON.parse(officialOutlinesJson);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => outlines }));
    const boundaries = await loadSubzoneBoundaries();
    const snapshot = await new MockPublicDataService().retrievePublicData();
    // Test inputs only. The map must use returned levels rather than calculate its own.
    snapshot.subzones = boundaries.map((area) => ({
      ...area, clusterCasesNearby: 0, residentsPerKm2: 0, aedesOverlapRatio: 0,
    }));
    const levels = Object.values(RiskLevel);
    const assessmentControl = {
      assessAll: vi.fn(async () => snapshot.subzones.map((area, index) => assessment(area.subzoneId, levels[index % 4]))),
    };
    const control = new RiskMapControl(new MockPublicDataService(snapshot), assessmentControl);
    const onRequestAssessment = vi.fn();
    await act(async () => root.render(<RiskMapBoundary control={control} onRequestAssessment={onRequestAssessment} />));
    const paths = [...container.querySelectorAll('path.leaflet-interactive')];
    expect(paths).toHaveLength(332);
    expect(assessmentControl.assessAll).toHaveBeenCalledExactlyOnceWith(snapshot);
    for (const style of Object.values(riskLevelStyle)) {
      expect(paths.filter((path) => path.getAttribute('fill') === style.colour)).toHaveLength(83);
    }
    await act(async () => paths[0].dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(container.querySelector('.map-summary .risk-pill')?.textContent).toBe('Low');
    await act(async () => button('View Assessment').click());
    expect(onRequestAssessment).toHaveBeenCalledExactlyOnceWith(boundaries[0].subzoneId);
  });

  it('searches by area name and clears selection when no area matches', async () => {
    const { snapshot, control } = await mapWithAssessments();
    await act(async () => root.render(<RiskMapBoundary control={control} onRequestAssessment={() => {}} />));
    const input = container.querySelector('input:not([type="checkbox"])') as HTMLInputElement;
    // Use the native setter so React receives the same change as typing.
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    await act(async () => {
      setValue.call(input, '  tampines  ');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    expect(container.querySelector('.map-summary')?.textContent).toContain(snapshot.subzones[0].name);
    await act(async () => {
      setValue.call(input, 'no such area');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => button('Search').click());
    expect(container.textContent).toContain('No matching area');
    expect(container.querySelector('select')?.value).toBe('');
    expect(button('View Assessment').disabled).toBe(true);
  });

  it('shows a clear error when data cannot load', async () => {
    const service = { retrievePublicData: vi.fn().mockRejectedValue(new Error('Internal detail')) };
    const control = new RiskMapControl(service);
    await act(async () => root.render(<RiskMapBoundary control={control} onRequestAssessment={() => {}} />));
    expect(container.textContent).toContain('Area risk data could not be loaded');
    expect(container.textContent).not.toContain('Internal detail');
    expect(container.querySelectorAll('path.leaflet-interactive')).toHaveLength(0);
  });

  it('rejects a point used as an area boundary without crashing the screen', async () => {
    const snapshot = await new MockPublicDataService().retrievePublicData();
    snapshot.subzones = [{ ...snapshot.subzones[0], boundary: { type: 'Point', coordinates: [103.8, 1.3] } }];
    const control = new RiskMapControl(new MockPublicDataService(snapshot));
    await act(async () => root.render(<RiskMapBoundary control={control} onRequestAssessment={() => {}} />));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Area boundaries could not be displayed');
  });

  it('supports MultiPolygon boundaries and displays area names as plain text', async () => {
    const snapshot = await new MockPublicDataService().retrievePublicData();
    const zone = snapshot.subzones[0];
    if (zone.boundary.type !== 'Polygon') throw new Error('Expected a polygon fixture.');
    snapshot.subzones = [{ ...zone, name: '<img id="unsafe-name" src="x">', boundary: { type: 'MultiPolygon', coordinates: [zone.boundary.coordinates] } }];
    const control = new RiskMapControl(new MockPublicDataService(snapshot));
    await act(async () => root.render(<RiskMapBoundary control={control} onRequestAssessment={() => {}} />));
    const path = container.querySelector('path.leaflet-interactive')!;
    await act(async () => path.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })));
    expect(container.querySelector('.leaflet-tooltip')?.textContent).toContain('<img id="unsafe-name" src="x">');
    expect(container.querySelector('#unsafe-name')).toBeNull();
  });
});

describe('Shared result colours', () => {
  it.each(Object.values(RiskLevel))('uses the map colour for result level %s', async (level) => {
    const snapshot = await new MockPublicDataService().retrievePublicData();
    const style = getRiskLevelStyle(level);
    const html = renderToStaticMarkup(<RiskResultBoundary subzone={snapshot.subzones[0]} assessment={assessment(snapshot.subzones[0].subzoneId, level)} />);
    expect(html).toContain(`background-color:${style.colour}`);
    expect(html).toContain(style.label);
  });

  it('uses four different shades that get darker as risk increases', () => {
    const colours = Object.values(riskLevelStyle).map((style) => style.colour);
    expect(new Set(colours).size).toBe(4);
    const brightness = colours.map((colour) => {
      const [red, green, blue] = colour.match(/[0-9a-f]{2}/g)!.map((part) => parseInt(part, 16));
      return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    });
    for (let i = 1; i < brightness.length; i++) expect(brightness[i - 1] - brightness[i]).toBeGreaterThan(25);
  });
});
