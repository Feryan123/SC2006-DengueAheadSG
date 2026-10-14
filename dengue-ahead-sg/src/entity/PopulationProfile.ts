/**
 * Traces to: PopulationProfile (<<entity>>) in class diagram
 * Related use case(s): UC-1 Assess Location Risk (Generate Risk Assessment — HDB Population / Density Data Source)
 *
 * ATTRIBUTES:
 * - residentCount : Integer — number of residents in the subzone
 * - density : Decimal — population density of the subzone
 * - housingComposition : String — description of the housing mix (e.g. HDB share)
 *
 * Relationships:
 * - PopulationProfile 1 —— 1 PlanningSubzone
 */

import type { Decimal, Integer } from './types.ts';

export interface PopulationProfile {
  /** 1 —— 1 PlanningSubzone */
  subzoneId: string;
  residentCount: Integer;
  density: Decimal;
  housingComposition: string;
}
