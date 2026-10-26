
// Loads areas and their assessed risk levels for RiskMapBoundary (UC-2).

import type { DengueCluster } from '../entity/DengueCluster.ts';
import type { HighAedesArea } from '../entity/HighAedesArea.ts';
import { RiskLevel } from '../entity/enums.ts';
import type { RiskAssessment } from '../entity/RiskAssessment.ts';
import type { ApprovedPublicDataServiceBoundary, PublicDataSnapshot } from '../services/ApprovedPublicDataServiceBoundary.ts';
import { loadSubzoneBoundaries, type SubzoneBoundary } from '../services/SubzoneBoundaryService.ts';

// The two overlays that visitors can switch on or off.
export type OverlayName = 'dengueClusters' | 'highAedesAreas';

export type OverlayState = {
  dengueClusters: boolean;
  highAedesAreas: boolean;
};

// The information needed to display the map.
export type MapData = {
  subzones: SubzoneBoundary[];
  dengueClusters: DengueCluster[];
  highAedesAreas: HighAedesArea[];
  riskLevels: Record<string, RiskLevel>;
};

// Loading either succeeds or returns an error.
export type MapResult =
  | { status: 'OK'; data: MapData }
  | { status: 'DATA_UNAVAILABLE'; message: string };

// The method this map needs from P1's RiskAssessmentControl.
export interface MapAssessmentControl {
  assessAll(snapshot: PublicDataSnapshot): Promise<RiskAssessment[]>;
}

export class RiskMapControl {
  private readonly dataService?: ApprovedPublicDataServiceBoundary;
  private readonly assessmentControl?: MapAssessmentControl;

  constructor(
    dataService?: ApprovedPublicDataServiceBoundary,
    assessmentControl?: MapAssessmentControl,
  ) {
    this.dataService = dataService;
    this.assessmentControl = assessmentControl;
  }

  // Get the data needed for the Risk Map.
  async loadRiskMap(): Promise<MapResult> {
    try {
      if (!this.dataService) {
        // Show real outlines while the team's risk calculations are still pending.
        const subzones = await loadSubzoneBoundaries();
        return { status: 'OK', data: { subzones, dengueClusters: [], highAedesAreas: [], riskLevels: {} } };
      }
      const snapshot = await this.dataService.retrievePublicData();
      if (snapshot.subzones.length === 0) return this.handleUnavailableData();

      const riskLevels: Record<string, RiskLevel> = {};
      const assessments = this.assessmentControl ? await this.assessmentControl.assessAll(snapshot) : [];
      for (const assessment of assessments) {
        if (Object.values(RiskLevel).includes(assessment.riskLevel)) {
          riskLevels[assessment.subzoneId] = assessment.riskLevel;
        }
      }

      return {
        status: 'OK',
        data: {
          subzones: snapshot.subzones,
          dengueClusters: snapshot.dengueClusters,
          highAedesAreas: snapshot.highAedesAreas,
          riskLevels,
        },
      };
    } catch {
      return this.handleUnavailableData();
    }
  }

  // Find an area using its subzone ID.
  async selectSubzone(id: string, subzones: SubzoneBoundary[]) {
    return subzones.find((zone) => zone.subzoneId === id) ?? null;
  }

  // Switch an overlay on or off.
  async updateOverlay(state: OverlayState, name: OverlayName) {
    return { ...state, [name]: !state[name] };
  }

  // Return a message when map data cannot be loaded.
  async handleUnavailableData(): Promise<MapResult> {
    return {
      status: 'DATA_UNAVAILABLE',
      message: 'Area risk data could not be loaded. Please try again later.',
    };
  }
}
