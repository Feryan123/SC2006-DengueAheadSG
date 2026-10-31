/**
 * The result screen's cluster list uses the same rule as the cluster score.
 * The score (processSubzoneSpatialJoin in turf.ts) counts a cluster for every subzone it overlaps,
 * so the list shows a cluster for every subzone it overlaps. A cluster is also always listed under
 * its own subzoneId, which keeps older data and tests with placeholder geometry working.
 */
import * as turf from '@turf/turf'
import type { DengueCluster } from '../entity/DengueCluster.ts'
import type { PlanningSubzone } from '../entity/PlanningSubzone.ts'

// Same overlap test as turf.ts: the polygons must share more than an edge
export function clusterOverlapsSubzone(subzoneBoundary: unknown, clusterGeometry: unknown): boolean {
  try {
    const subzonePolygon = turf.feature(subzoneBoundary as any)
    const clusterPolygon = turf.feature(clusterGeometry as any)
    return turf.intersect(turf.featureCollection([subzonePolygon, clusterPolygon]) as any) !== null
  } catch {
    return false // invalid geometry never counts, as in turf.ts
  }
}

export function clustersForSubzone(
  clusters: DengueCluster[],
  subzone: Pick<PlanningSubzone, 'subzoneId' | 'boundary'>
): DengueCluster[] {
  return clusters.filter(
    (cluster) =>
      cluster.subzoneId === subzone.subzoneId ||
      clusterOverlapsSubzone(subzone.boundary, cluster.geometry)
  )
}