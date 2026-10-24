/**
 * Traces to: ApprovedPublicDataServiceBoundary (<<boundary>>) in class diagram
 * Related use case(s): UC-1 Assess Location Risk (Generate Risk Assessment), UC-2 Explore Risk Map (overlays)
 *
 * TO IMPLEMENT:
 * - retrievePublicData() — fetch data from the approved public data sources (data.gov.sg):
 *     - Rainfall Data Source
 *     - HDB Population / Density Data Source
 *     - Dengue Clusters Data Source
 *     - High-Aedes areas (source TODO(verify): not a separate actor in the use case diagram)
 *   Until then, use MockPublicDataService.
 *
 * Relationships: called by LocationRiskControl, RiskAssessmentControl, RiskMapControl
 */

import type { DengueCluster } from '../entity/DengueCluster.ts';
import type { HighAedesArea } from '../entity/HighAedesArea.ts';
import type { PlanningSubzone } from '../entity/PlanningSubzone.ts';
import type { PopulationProfile } from '../entity/PopulationProfile.ts';
import type { WeatherProfile } from '../entity/WeatherProfile.ts';
import type { DatasetStatus } from '../entity/enums.ts';

/** Everything the app needs from the public data sources, fetched in one go. */
export interface PublicDataSnapshot {
  generatedAt: string;
  datasets: Record<string, { retrievedAt: string; status: DatasetStatus }>
  subzones: PlanningSubzone[];
  populationProfiles: PopulationProfile[];
  dengueClusters: DengueCluster[];
  highAedesAreas: HighAedesArea[];
  /** One national monthly profile (Option A) */
  weather: WeatherProfile;
}

export class ApprovedPublicDataServiceBoundary {
  async retrievePublicData(): Promise<PublicDataSnapshot> {
    throw new Error('ApprovedPublicDataServiceBoundary is not implemented yet — use MockPublicDataService');
  }
}
