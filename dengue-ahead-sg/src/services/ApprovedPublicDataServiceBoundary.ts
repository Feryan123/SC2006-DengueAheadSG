// - Define the public data used by location assessment and the risk map.
// - The snapshot reader, cache Proxy and test mock use the same method.
// - ApprovedPublicDataServiceBoundary: UC-1, UC-2 and Retrieve / Refresh Public Data.

import type { DengueCluster } from '../entity/DengueCluster.ts';
import type { HighAedesArea } from '../entity/HighAedesArea.ts';
import type { PlanningSubzone } from '../entity/PlanningSubzone.ts';
import type { PopulationProfile } from '../entity/PopulationProfile.ts';
import type { WeatherProfile } from '../entity/WeatherProfile.ts';
import type { DatasetStatus } from '../entity/enums.ts';

/** Everything the app needs from the public data sources, fetched in one go. */
export interface PublicDataSnapshot {
  generatedAt: string;
  /** Ticket #58: set by the cache Proxy only when it returns the bundled backup. */
  isBundledFallback?: boolean;
  datasets: Record<string, { retrievedAt: string; status: DatasetStatus }>
  subzones: PlanningSubzone[];
  populationProfiles: PopulationProfile[];
  dengueClusters: DengueCluster[];
  highAedesAreas: HighAedesArea[];
  /** One national monthly profile (Option A) */
  weather: WeatherProfile;
}

export interface ApprovedPublicDataServiceBoundary {
  retrievePublicData(): Promise<PublicDataSnapshot>;
}
