// - Check the official outlines and their stable subzone IDs.
// - Reject missing, broken or duplicate area records.
// - Ticket #20: Explore Risk Map. These tests do not use the network.

import { afterEach, describe, expect, it, vi } from 'vitest';
import officialOutlinesJson from '../assets/subzones.geojson?raw';
import { loadSubzoneBoundaries } from './SubzoneBoundaryService.ts';

function officialData() {
  return JSON.parse(officialOutlinesJson);
}

function reply(data: unknown) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => data }));
}

afterEach(() => vi.unstubAllGlobals());

describe('Official subzone outlines', () => {
  it('loads all 332 official areas with unique IDs and unchanged geometry', async () => {
    const source = officialData();
    reply(source);
    const areas = await loadSubzoneBoundaries();
    expect(areas).toHaveLength(332);
    expect(new Set(areas.map((area) => area.subzoneId)).size).toBe(332);
    expect(areas.filter((area) => area.boundary.type === 'Polygon')).toHaveLength(321);
    expect(areas.filter((area) => area.boundary.type === 'MultiPolygon')).toHaveLength(11);
    for (let i = 0; i < areas.length; i++) {
      expect(areas[i].boundary).toEqual(source.features[i].geometry);
      expect(areas[i].subzoneId).toBe(source.features[i].properties.SUBZONE_C);
    }
    expect(areas[0].name).toBe('DEPOT ROAD');
    const firstOutline = areas[0].boundary;
    if (firstOutline.type !== 'Polygon') throw new Error('Expected the first official area to be a polygon.');
    expect(firstOutline.coordinates[0].length).toBeGreaterThan(5);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('reports a failed download', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(loadSubzoneBoundaries()).rejects.toThrow('could not be loaded');
  });

  it('reports an offline request', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(loadSubzoneBoundaries()).rejects.toThrow();
  });

  it.each([null, {}, { type: 'FeatureCollection', features: [] }])('rejects an empty or invalid file: %j', async (data) => {
    reply(data);
    await expect(loadSubzoneBoundaries()).rejects.toThrow('file is invalid');
  });

  it('rejects duplicate subzone IDs', async () => {
    const data = officialData();
    data.features[1].properties.SUBZONE_C = data.features[0].properties.SUBZONE_C;
    reply(data);
    await expect(loadSubzoneBoundaries()).rejects.toThrow('boundary is invalid');
  });

  it('rejects an area with no ID', async () => {
    const data = officialData();
    data.features[0].properties.SUBZONE_C = '';
    reply(data);
    await expect(loadSubzoneBoundaries()).rejects.toThrow('boundary is invalid');
  });

  it('rejects a point instead of an area outline', async () => {
    const data = officialData();
    data.features[0].geometry = { type: 'Point', coordinates: [103.8, 1.3] };
    reply(data);
    await expect(loadSubzoneBoundaries()).rejects.toThrow('boundary is invalid');
  });
});
