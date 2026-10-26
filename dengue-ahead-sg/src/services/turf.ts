import * as turf from '@turf/turf';
import type { Polygon, MultiPolygon} from 'geojson';

export interface SubzoneItem {
  subzoneId: string;
  name: string;
  planningArea: string;
  residentCount: number;
  areaKm2: number;
  residentsPerKm2: number;
  boundary: Polygon | MultiPolygon;
}

export interface SubzoneProcessedMetric extends SubzoneItem {
  caseCount: number;
  dengueRiskLevel: 'Low' | 'Moderate' | 'High';
}

/**
 * Performs a spatial join between raw incident points and subzone boundaries.
 * Natively supports both Polygon and MultiPolygon GeoJSON geometries.
 */
export function processSubzoneSpatialJoin(
  subzonesData: SubzoneItem[],
  rawIncidentPoints: Array<{ lat: number; lng: number }>
): SubzoneProcessedMetric[] {
  // 1. Convert raw incident points into a Turf FeatureCollection of Points
  // Note: Turf.js expects coordinates as [longitude, latitude]
  const pointFeatures = rawIncidentPoints.map(pt =>
    turf.point([pt.lng, pt.lat])
  );
  const pointsCollection = turf.featureCollection(pointFeatures);

  // 2. Map over each subzone and perform the spatial join
  return subzonesData.map(subzone => {
    let caseCount = 0;

    try {
      // Create a Turf feature for the subzone boundary (handles Polygon & MultiPolygon)
      const subzoneFeature = turf.feature(subzone.boundary, {
        subzoneId: subzone.subzoneId,
        name: subzone.name,
      });

      // turf.pointsWithinPolygon checks all rings/polygons inside the boundary natively
      const pointsWithin = turf.pointsWithinPolygon(pointsCollection, subzoneFeature);
      caseCount = pointsWithin.features.length;
    } catch (error) {
      console.error(`Spatial join error for subzone ${subzone.subzoneId}:`, error);
    }

    // Determine simple risk category based on case count
    const riskLevel: 'Low' | 'Moderate' | 'High' = 
      caseCount > 5 ? 'High' : caseCount > 2 ? 'Moderate' : 'Low';

    return {
      ...subzone,
      caseCount,
      dengueRiskLevel: riskLevel,
    };
  });
}