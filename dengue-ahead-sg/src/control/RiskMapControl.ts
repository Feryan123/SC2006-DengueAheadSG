/**
 * Traces to: RiskMapControl (<<control>>) in class diagram
 * Related use case(s): UC-2 Explore Risk Map
 *
 * TO IMPLEMENT:
 * - loadRiskMap() — render the base map, planning subzones and legend
 * - selectSubzone() — search / select a planning subzone on the map
 * - updateOverlay() — show or hide dengue cluster / high-Aedes overlays
 * - handleUnavailableData() — handle risk map data being unavailable
 *
 * Relationships (dependencies):
 * - Called by RiskMapBoundary
 * - Uses RiskAssessmentControl (and LocationRiskControl, TODO(verify))
 * - Reads PlanningSubzone, DengueCluster, HighAedesArea
 */


/*
 * This file handles map data and user actions.
 * Data loading is a PLACEHOLDER until the data service is ready.
 */

import type { PlanningSubzone } from '../entity/PlanningSubzone.ts';
import type { DengueCluster } from '../entity/DengueCluster.ts';
import type { HighAedesArea } from '../entity/HighAedesArea.ts';
import type { RiskLevel } from '../entity/enums.ts';

// The two overlays that visitors can switch on or off.
export type OverlayName = 'dengueClusters' | 'highAedesAreas';

export type OverlayState = {
  dengueClusters: boolean;
  highAedesAreas: boolean;
};

// The information needed to display the map.
export type MapData = {
  subzones: PlanningSubzone[];
  dengueClusters: DengueCluster[];
  highAedesAreas: HighAedesArea[];
  riskLevels: Record<string, RiskLevel>;
};

// Loading either succeeds or returns an error.
export type MapResult =
  | { status: 'OK'; data: MapData }
  | { status: 'DATA_UNAVAILABLE'; message: string };

export class RiskMapControl {

  // Get the data needed for the Risk Map.
  async loadRiskMap(): Promise<MapResult> {
    // TODO: Call retrievePublicData() for subzones, clusters and high-Aedes areas.
    // TODO: Get a risk level for each subzone from RiskAssessmentControl.
    // TODO: Return { status: 'OK', data: ... } when ready.

    // PLACEHOLDER: Data is not connected yet.
    return this.handleUnavailableData();
  }

  // Find an area using its subzone ID.
  async selectSubzone(id: string, subzones: PlanningSubzone[]) {
    return subzones.find((zone) => zone.subzoneId === id) ?? null;
  }

  // Switch an overlay on or off.
  async updateOverlay(state: OverlayState, name: OverlayName) {
    return { ...state, [name]: !state[name] };
  }

  // Return a message when map data cannot be loaded.
  async handleUnavailableData(): Promise<MapResult> {
    // TODO: Show the real error when a data request fails.
    return {
      status: 'DATA_UNAVAILABLE',
      message: 'PLACEHOLDER: Map data has not been connected yet.',
    };
  }
}

