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
 * - HighAedesArea 0..* —— 1 PlanningSubzone (multiplicity TODO(verify))
 */

import type { DateTime, Geometry } from './types.ts';

export interface HighAedesArea {
  areaId: string;
  geometry: Geometry;
  retrievedAt: DateTime;
  /** 0..* —— 1 PlanningSubzone — TODO(verify) multiplicity */
  subzoneId: string;
}
