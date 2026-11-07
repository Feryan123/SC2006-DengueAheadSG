/**
 * Traces to: PlanningSubzone (<<entity>>) in class diagram
 * Related use case(s): UC-5 Identify Planning Subzone, UC-2 Explore Risk Map, UC-1 Assess Location Risk
 *
 * ATTRIBUTES:
 * - subzoneId : String — unique identifier of the planning subzone
 * - name : String — display name of the planning subzone
 * - boundary : Geometry — polygon boundary of the subzone
 *
 * Relationships:
 * - PlanningSubzone 0..1 —— 0..* LocationQuery
 * - PlanningSubzone 1 —— 1 PopulationProfile
 * - PlanningSubzone 1 —— 0..* HighAedesArea (each area is tagged with one subzone; overlap with other subzones is measured in aedesOverlapRatio)
 * - PlanningSubzone 1 —— 0..* DengueCluster
 */

import type { Geometry } from './types.ts';

export interface PlanningSubzone {
  subzoneId: string;
  name: string;
  boundary: Geometry;
  clusterCasesNearby: number;
  residentsPerKm2: number;
  aedesOverlapRatio: number;
}
