/**
 * Traces to: DengueCluster (<<entity>>) in class diagram
 * Related use case(s): UC-2 Explore Risk Map (Toggle Dengue Cluster Overlay), UC-1 Assess Location Risk
 *
 * ATTRIBUTES:
 * - clusterId : String — unique identifier of the dengue cluster
 * - location : String — textual location description of the cluster
 * - caseCount : Integer — number of confirmed cases in the cluster
 * - geometry : Geometry — shape / location of the cluster
 * - retrievedAt : DateTime — when the data was retrieved from the Dengue Clusters Data Source
 *
 * Relationships:
 * - DengueCluster 0..* —— 1 PlanningSubzone
 */

import type { DateTime, Geometry, Integer } from './types.ts';

export interface DengueCluster {
  clusterId: string;
  location: string;
  caseCount: Integer;
  geometry: Geometry;
  retrievedAt: DateTime;
  /** 0..* —— 1 PlanningSubzone */
  subzoneId: string;
}
