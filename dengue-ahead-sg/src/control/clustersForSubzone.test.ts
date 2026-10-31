import { expect, test } from 'vitest'
import { processSubzoneSpatialJoin } from '../services/turf.ts'
import type { SubzoneItem } from '../services/turf.ts'
import { clusterOverlapsSubzone, clustersForSubzone } from './clustersForSubzone.ts'

const square = (x0: number, y0: number, x1: number, y1: number) => ({
  type: 'Polygon' as const,
  coordinates: [[[x0, y0], [x0, y1], [x1, y1], [x1, y0], [x0, y0]]],
})
const zone = (id: string, boundary: any): SubzoneItem => ({
  subzoneId: id, name: id, planningArea: 'T', residentCount: 1, areaKm2: 4, residentsPerKm2: 1, boundary,
})
const cluster = (id: string, subzoneId: string, geometry: any, caseCount: number) =>
  ({ clusterId: id, location: '', caseCount, geometry, retrievedAt: '', subzoneId })

test('a cluster straddling two subzones is listed under both, matching the score (#56)', () => {
  const subzones = [zone('A', square(0, 0, 2, 2)), zone('B', square(2, 0, 4, 2)), zone('C', square(10, 10, 12, 12))]
  const geometry = square(1, 0.5, 3, 1.5) // overlaps A and B only
  const geoJson = { features: [{ type: 'Feature', properties: { CASE_SIZE: 7 }, geometry }] }
  const metrics = processSubzoneSpatialJoin(subzones, geoJson, { features: [] })
  const clusters = [cluster('1', 'A', geometry, 7)] // the sync job tags it to A only

  for (const m of metrics) {
    const listed = clustersForSubzone(clusters, subzones.find((s) => s.subzoneId === m.subzoneId)!)
    // the list and the score agree for every subzone
    expect(listed.reduce((sum, c) => sum + c.caseCount, 0)).toBe(m.clusterCasesNearby)
  }
  expect(clustersForSubzone(clusters, subzones[1])).toHaveLength(1) // the old rule returned 0 here
  expect(clustersForSubzone(clusters, subzones[2])).toHaveLength(0)
})

test('clusterOverlapsSubzone is false for distant, touching-only or invalid geometry', () => {
  const a = square(0, 0, 2, 2)
  expect(clusterOverlapsSubzone(a, square(10, 10, 11, 11))).toBe(false)
  expect(clusterOverlapsSubzone(a, square(2, 0.2, 3, 1))).toBe(false)
  expect(clusterOverlapsSubzone(a, { type: 'Polygon', coordinates: [] })).toBe(false)
})

test('a cluster is always listed under its own subzoneId, even with unusable geometry', () => {
  const subzones = [zone('A', square(0, 0, 2, 2)), zone('B', square(2, 0, 4, 2))]
  const clusters = [cluster('2', 'A', {}, 3)]
  expect(clustersForSubzone(clusters, subzones[0])).toHaveLength(1)
  expect(clustersForSubzone(clusters, subzones[1])).toHaveLength(0)
})