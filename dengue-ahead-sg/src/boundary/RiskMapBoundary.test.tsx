// @vitest-environment jsdom
// - Draw the real Leaflet layers using test data, without network requests.
// - Check colours, area selection, errors and safe area names.
// - Check background-map failures and recovery (Ticket #57).
// - Ticket #20: Explore Risk Map / Assess Location Risk.

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import RiskResultBoundary from './RiskResultBoundary.tsx';
import { getRiskLevelStyle, riskLevelStyle } from './riskLevelStyle.ts';
import { RiskMapControl } from '../control/RiskMapControl.ts';
import { MockPublicDataService } from '../services/mocks/MockPublicDataService.ts';
import { AssessmentType, ContributionLevel, DataConfidence, RiskFactorType, RiskLevel } from '../entity/enums.ts';
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
  return { snapshot, assessments, control: new RiskMapControl(new MockPublicDataService(snapshot), { assessAll: async () => assessments }) };
}

function button(label: string) {
  const found = [...container.querySelectorAll('button')].find((item) => item.textContent === label);
  if (!found) throw new Error(`Button not found: ${label}`);
  return found;
}

// Open the map and return its background images for simulated load/error events.
async function openBackgroundMap() {
  const { control } = await mapWithAssessments();
  await act(async () => root.render(<RiskMapBoundary control={control} onRequestAssessment={() => {}} />));
  const tiles = container.querySelectorAll<HTMLImageElement>('img.leaflet-tile');
  expect(tiles.length).toBeGreaterThan(1);
  return tiles;
}

const baseMapWarning = 'The base map is unavailable. Area boundaries can still be viewed.';

describe('Background map warning (Ticket #57)', () => {
  it('keeps the warning hidden while loading and after successful loading', async () => {
    const tiles = await openBackgroundMap();
    expect(container.textContent).not.toContain(baseMapWarning);

    await act(async () => {
      for (const tile of tiles) tile.dispatchEvent(new Event('load'));
    });

    expect(container.textContent).not.toContain(baseMapWarning);
  });

  it('does not report a map outage when one tile fails after other tiles load', async () => {
    const tiles = await openBackgroundMap();
    await act(async () => {
      for (let index = 0; index < tiles.length - 1; index++) {
        tiles[index].dispatchEvent(new Event('load'));
      }
      tiles[tiles.length - 1].dispatchEvent(new Event('error'));
    });

    expect(container.textContent).not.toContain(baseMapWarning);
  });

  it('clears a failed tile warning when later tiles load', async () => {
    const tiles = await openBackgroundMap();
    await act(async () => tiles[0].dispatchEvent(new Event('error')));
    await act(async () => {
      for (let index = 1; index < tiles.length; index++) {
        tiles[index].dispatchEvent(new Event('load'));
      }
    });

    expect(container.textContent).not.toContain(baseMapWarning);
  });

  it('waits for loading to finish, reports a complete outage, and clears on recovery', async () => {
    const tiles = await openBackgroundMap();
    await act(async () => tiles[0].dispatchEvent(new Event('error')));
    expect(container.textContent).not.toContain(baseMapWarning);

    await act(async () => {
      for (let index = 1; index < tiles.length; index++) {
        tiles[index].dispatchEvent(new Event('error'));
      }
    });
    expect(container.textContent).toContain(baseMapWarning);
    expect(container.querySelectorAll('path.leaflet-interactive').length).toBeGreaterThan(0);

    await act(async () => tiles[0].dispatchEvent(new Event('load')));
    expect(container.textContent).not.toContain(baseMapWarning);
  });
});

describe('Risk map', () => {
  it('toggles dengue cluster and high-Aedes overlays without recreating the map', async () => {
    const { control } = await mapWithAssessments();

    await act(async () => {
      root.render(
        <RiskMapBoundary
          control={control}
          onRequestAssessment={() => {}}
        />,
      );
    });

    const mapElement = container.querySelector('.leaflet-container');
    const checkboxes = [
      ...container.querySelectorAll<HTMLInputElement>(
        'input[type="checkbox"]',
      ),
    ];

    expect(checkboxes).toHaveLength(2);
    expect(checkboxes[0].disabled).toBe(false);
    expect(checkboxes[1].disabled).toBe(false);

    const countOverlayPaths = (colour: string) =>
      container.querySelectorAll(`path[stroke="${colour}"]`).length;

    expect(countOverlayPaths('#dc2626')).toBe(0);
    expect(countOverlayPaths('#d97706')).toBe(0);

    await act(async () => {
      checkboxes[0].click();
    });

    expect(checkboxes[0].checked).toBe(true);
    expect(countOverlayPaths('#dc2626')).toBeGreaterThan(0);

    await act(async () => {
      checkboxes[1].click();
    });

    expect(checkboxes[1].checked).toBe(true);
    expect(countOverlayPaths('#d97706')).toBeGreaterThan(0);

    await act(async () => {
      checkboxes[0].click();
    });

    expect(checkboxes[0].checked).toBe(false);
    expect(countOverlayPaths('#dc2626')).toBe(0);
    expect(countOverlayPaths('#d97706')).toBeGreaterThan(0);

    await act(async () => {
      checkboxes[1].click();
    });

    expect(checkboxes[1].checked).toBe(false);
    expect(countOverlayPaths('#d97706')).toBe(0);

    expect(container.querySelector('.leaflet-container')).toBe(mapElement);
  });
  it('keeps the map and view when the parent supplies a new result callback', async () => {
    const leaflet = await import('leaflet');
    const fitBounds = vi.spyOn(leaflet.Map.prototype, 'fitBounds');
    const { snapshot, control } = await mapWithAssessments();
    const firstAction = vi.fn();
    const latestAction = vi.fn();
    await act(async () => root.render(<RiskMapBoundary control={control} onRequestAssessment={firstAction} />));
    const path = container.querySelector('path.leaflet-interactive')!;
    await act(async () => path.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    firstAction.mockClear();
    const viewChanges = fitBounds.mock.calls.length;
    await act(async () => root.render(<RiskMapBoundary control={control} onRequestAssessment={latestAction} />));
    expect(container.querySelector('path[stroke="#e600a9"]')).toBe(path);
    expect(fitBounds).toHaveBeenCalledTimes(viewChanges);
    await act(async () => path.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(firstAction).not.toHaveBeenCalled();
    expect(latestAction).toHaveBeenCalledExactlyOnceWith(snapshot.subzones[0].subzoneId,
      expect.objectContaining({ subzone: snapshot.subzones[0], snapshot }));
  });

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

  it('selects a clicked area and immediately passes its assessment to the dashboard', async () => {
    const { snapshot, control } = await mapWithAssessments();
    const onRequestAssessment = vi.fn();
    await act(async () => root.render(<RiskMapBoundary control={control} onRequestAssessment={onRequestAssessment} />));
    const path = container.querySelector('path.leaflet-interactive')!;
    await act(async () => path.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(container.querySelector('select')?.value).toBe(snapshot.subzones[0].subzoneId);
    expect(path.getAttribute('stroke-width')).toBe('3');
    expect(path.getAttribute('stroke')).toBe('#e600a9');
    expect(path.getAttribute('stroke-dasharray')).toBeNull();
    expect(onRequestAssessment).toHaveBeenCalledExactlyOnceWith(snapshot.subzones[0].subzoneId,
      expect.objectContaining({ assessment: expect.objectContaining({ riskLevel: RiskLevel.Low }), snapshot }));
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

  it('allows keyboard selection and reports an unassessed area without inventing a score', async () => {
    const { snapshot, control } = await mapWithAssessments();
    const selected = vi.fn();
    await act(async () => root.render(<RiskMapBoundary control={control} onRequestAssessment={selected} />));
    const select = container.querySelector('select')!;
    await act(async () => { select.value = snapshot.subzones[3].subzoneId; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(selected).toHaveBeenLastCalledWith(snapshot.subzones[3].subzoneId,
      expect.objectContaining({ assessment: expect.objectContaining({ riskLevel: RiskLevel.VeryHigh }) }));
    await act(async () => { select.value = snapshot.subzones[4].subzoneId; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(selected).toHaveBeenLastCalledWith(snapshot.subzones[4].subzoneId, undefined);
  });

  it('draws all official subzone outlines and does not invent risk colours', async () => {
    const outlines = JSON.parse(officialOutlinesJson);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => outlines }));
    await act(async () => root.render(<StrictMode><RiskMapBoundary onRequestAssessment={() => {}} /></StrictMode>));
    expect(container.textContent).toContain('Official outlines are shown');
    expect(container.querySelectorAll('.leaflet-container')).toHaveLength(1);
    const paths = [...container.querySelectorAll('path.leaflet-interactive')];
    expect(paths).toHaveLength(332);
    expect(container.querySelectorAll('select option')).toHaveLength(333);
    expect(paths.every((path) => path.getAttribute('fill') === '#d9d9d9')).toBe(true);
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
    expect(onRequestAssessment).toHaveBeenCalledExactlyOnceWith(boundaries[0].subzoneId,
      expect.objectContaining({ subzone: snapshot.subzones[0], snapshot }));
  });

  it('searches by area name and keeps a valid selection when the next search fails', async () => {
    const { snapshot, control } = await mapWithAssessments();
    await act(async () => root.render(<RiskMapBoundary control={control} onRequestAssessment={() => {}} />));
    const input = container.querySelector('input[type="search"]') as HTMLInputElement;
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    await act(async () => { setValue.call(input, '  tampines  '); input.dispatchEvent(new Event('input', { bubbles: true })); });
    await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(container.querySelector('select')?.value).toBe(snapshot.subzones[0].subzoneId);
    await act(async () => { setValue.call(input, 'no such area'); input.dispatchEvent(new Event('input', { bubbles: true })); });
    await act(async () => button('Search area').click());
    expect(container.textContent).toContain('No matching area');
    expect(container.querySelector('select')?.value).toBe(snapshot.subzones[0].subzoneId);
    expect(container.querySelector('.leaflet-popup')).toBeNull();
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
    await act(async () => path.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(container.querySelector('select option:checked')?.textContent).toBe('<img id="unsafe-name" src="x">');
    expect(container.querySelector('#unsafe-name')).toBeNull();
  });
});

describe('Map details (ticket #22)', () => {
  it('passes the full assessment directly without a popup clipping the map', async () => {
    const { snapshot, assessments, control } = await mapWithAssessments();
    assessments[0].contributions = Object.values(RiskFactorType).map((factorType, index) => ({
      factorType, inputValue: 1, contribution: (index + 1) * 5,
      contributionLevel: ContributionLevel.Moderate, explanation: '',
    }));
    const selected = vi.fn();
    await act(async () => root.render(<RiskMapBoundary control={control} onRequestAssessment={selected} />));
    await act(async () => container.querySelector('path.leaflet-interactive')!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(container.querySelector('.leaflet-popup')).toBeNull();
    expect(selected).toHaveBeenCalledExactlyOnceWith(snapshot.subzones[0].subzoneId,
      expect.objectContaining({ assessment: assessments[0], subzone: snapshot.subzones[0], snapshot }));
  });

  it('reports unavailable assessment context for an unassessed area', async () => {
    const { snapshot, control } = await mapWithAssessments();
    const selected = vi.fn();
    await act(async () => root.render(<RiskMapBoundary control={control} onRequestAssessment={selected} />));
    await act(async () => container.querySelectorAll('path.leaflet-interactive')[4].dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(selected).toHaveBeenCalledExactlyOnceWith(snapshot.subzones[4].subzoneId, undefined);
    expect(container.querySelector('.leaflet-popup')).toBeNull();
  });

  it('shows the top three initially, expands all ten and selects directly from the ranking', async () => {
    const { snapshot, assessments, control } = await mapWithAssessments();
    assessments.forEach((item, index) => { item.riskIndex = (index + 1) * 20; });
    const selected = vi.fn();
    await act(async () => root.render(<RiskMapBoundary control={control} onRequestAssessment={selected} />));
    expect(container.querySelectorAll('.top-risk-list button')).toHaveLength(3);
    await act(async () => button('View all 10').click());
    const items = [...container.querySelectorAll<HTMLButtonElement>('.top-risk-list button')];
    expect(items.map((item) => item.querySelector('strong')?.textContent?.replace(/^\d+\. /, ''))).toEqual(snapshot.subzones.slice(0, 4).reverse().map((zone) => zone.name));
    expect(items[0].style.backgroundColor).toBe('rgb(33, 113, 181)');
    expect(items[0].style.color).toBe('rgb(255, 255, 255)');
    await act(async () => items[0].click());
    expect(container.querySelector('select')?.value).toBe(snapshot.subzones[3].subzoneId);
    expect(selected).toHaveBeenLastCalledWith(snapshot.subzones[3].subzoneId, expect.objectContaining({ snapshot }));
    expect(container.querySelector('.leaflet-popup')).toBeNull();
  });

  it('shows an empty ranking instead of inventing risk scores', async () => {
    const control = new RiskMapControl(new MockPublicDataService());
    await act(async () => root.render(<RiskMapBoundary control={control} onRequestAssessment={() => {}} />));
    expect(container.querySelector('.map-ranking')?.textContent).toContain('No assessed areas are available yet.');
    expect(container.querySelectorAll('.top-risk-list li')).toHaveLength(0);
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
