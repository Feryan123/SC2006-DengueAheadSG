import * as turf from '@turf/turf';
import type { Polygon, MultiPolygon, Feature, FeatureCollection } from 'geojson';
import type { PlanningSubzone } from '../entity/PlanningSubzone.ts';

export interface SubzoneItem extends Omit<PlanningSubzone, 'clusterCasesNearby' | 'aedesOverlapRatio'> {
  planningArea: string;
  residentCount: number;
  areaKm2: number;
}

/**
 * Performs a spatial join between dengue clusters / high-Aedes areas and subzone boundaries.
 * Natively supports both Polygon and MultiPolygon GeoJSON geometries and returns PlanningSubzone entities.
 */
export function processSubzoneSpatialJoin(
  subzonesData: SubzoneItem[],
  dengueClustersGeoJson: FeatureCollection<Polygon | MultiPolygon> | { features: any[] },
  highAedesGeoJson: FeatureCollection<Polygon | MultiPolygon> | { features: any[] }
): PlanningSubzone[] {
  
  // Normalize feature collections safely
  const dengueFeatures = (dengueClustersGeoJson?.features || []) as Feature<Polygon | MultiPolygon>[];
  const aedesFeatures = (highAedesGeoJson?.features || []) as Feature<Polygon | MultiPolygon>[];

  return subzonesData.map(subzone => {
    let clusterCasesNearby = 0;
    let aedesOverlapRatio = 0;

    try {
      const subzonePolygon = turf.feature(subzone.boundary as any);

      // 1. Calculate clusterCasesNearby via polygon overlap summing CASE_SIZE
      for (const cluster of dengueFeatures) {
        try {
          const clusterPolygon = turf.feature(cluster.geometry);
          const intersection = turf.intersect(
            turf.featureCollection([subzonePolygon, clusterPolygon]) as any
          );

          if (intersection) {
            const caseSize = Number(cluster.properties?.CASE_SIZE || cluster.properties?.case_size || 0);
            clusterCasesNearby += caseSize;
          }
        } catch {
          // Skip invalid cluster geometry intersections
        }
      }

      // 2. Calculate aedesOverlapRatio (high-Aedes area overlap ÷ subzone area)
      let totalAedesOverlapForSubzone = 0;
      for (const aedesArea of aedesFeatures) {
        try {
          const aedesPolygon = turf.feature(aedesArea.geometry);
          const intersection = turf.intersect(
            turf.featureCollection([subzonePolygon, aedesPolygon]) as any
          );

          if (intersection) {
            const overlapAreaKm2 = turf.area(intersection) / 1_000_000; // Convert sq meters to sq km
            totalAedesOverlapForSubzone += overlapAreaKm2;
          }
        } catch {
          // Skip invalid aedes geometry intersections
        }
      }

      // Compute ratio, capped at 1.0 (100%)
      const subzoneArea = subzone.areaKm2 > 0 ? subzone.areaKm2 : 1;
      aedesOverlapRatio = Math.min(1.0, totalAedesOverlapForSubzone / subzoneArea);

    } catch (error) {
      console.error(`Spatial join error for subzone ${subzone.subzoneId}:`, error);
      aedesOverlapRatio = 0;
    }

    return {
      subzoneId: subzone.subzoneId,
      name: subzone.name,
      boundary: subzone.boundary,
      residentsPerKm2: subzone.residentsPerKm2,
      clusterCasesNearby,
      aedesOverlapRatio: Number(aedesOverlapRatio.toFixed(4)),
    };
  });
}