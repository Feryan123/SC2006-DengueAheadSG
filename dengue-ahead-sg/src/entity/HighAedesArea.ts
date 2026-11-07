/**
 * Traces to: HighAedesArea (<<entity>>) in class diagram
 * Related use case(s): UC-2 Explore Risk Map (Toggle High-Aedes Area Overlay), UC-1 Assess Location Risk
 *
 * ATTRIBUTES:
 * - areaId : String — unique identifier of the high-Aedes area
 * - geometry : Geometry — shape / location of the area
 * - retrievedAt : DateTime — when the data was retrieved from the public data source
 *
 * Relationships:
 * - HighAedesArea 0..* —— 1 PlanningSubzone (each area is tagged with the one subzone the sync job assigns it to)
 */

import type { DateTime, Geometry } from './types.ts';

export interface HighAedesArea {
  areaId: string;
  geometry: Geometry;
  retrievedAt: DateTime;
  /** 0..* —— 1 PlanningSubzone */
  subzoneId: string;
}
