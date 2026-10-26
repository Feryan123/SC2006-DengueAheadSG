// - Load official subzone names, IDs and outlines for the risk map.
// - This file does not supply case counts or calculate risk.
// - Ticket #20: Explore Risk Map.

import type { FeatureCollection, Polygon, MultiPolygon } from 'geojson';
import type { PlanningSubzone } from '../entity/PlanningSubzone.ts';
import boundaryFileUrl from '../assets/subzones.geojson?url';

export type SubzoneBoundary = Pick<PlanningSubzone, 'subzoneId' | 'name' | 'boundary'>;

export async function loadSubzoneBoundaries(): Promise<SubzoneBoundary[]> {
  const response = await fetch(boundaryFileUrl);
  if (!response.ok) throw new Error('Subzone outlines could not be loaded.');

  const data: FeatureCollection<Polygon | MultiPolygon, { SUBZONE_C: string; SUBZONE_N: string }> = await response.json();
  if (data?.type !== 'FeatureCollection' || !Array.isArray(data.features) || data.features.length === 0) {
    throw new Error('The subzone file is invalid.');
  }

  const ids = new Set<string>();
  return data.features.map((feature) => {
    const id = feature?.properties?.SUBZONE_C;
    const name = feature?.properties?.SUBZONE_N;
    const geometry = feature?.geometry;
    if (typeof id !== 'string' || !id.trim() || ids.has(id) || typeof name !== 'string' || !name.trim()
      || (geometry?.type !== 'Polygon' && geometry?.type !== 'MultiPolygon') || !Array.isArray(geometry.coordinates) || geometry.coordinates.length === 0) {
      throw new Error('A subzone boundary is invalid.');
    }
    ids.add(id);
    return { subzoneId: id, name, boundary: geometry as PlanningSubzone['boundary'] };
  });
}
