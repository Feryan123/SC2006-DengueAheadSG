
// - Load areas and their supplied risk assessments for the map.
// - Sort the top areas and factors without calculating risk (UC-2).

import type { DengueCluster } from '../entity/DengueCluster.ts';
import type { HighAedesArea } from '../entity/HighAedesArea.ts';
import { RiskLevel } from '../entity/enums.ts';
import type { RiskAssessment } from '../entity/RiskAssessment.ts';
import type { RiskFactorContribution } from '../entity/RiskFactorContribution.ts';
import type { PlanningSubzone } from '../entity/PlanningSubzone.ts';
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
  assessments: Record<string, RiskAssessment>;
  snapshot?: PublicDataSnapshot;
};

export type MapAssessmentSelection = {
  subzone: PlanningSubzone;
  assessment: RiskAssessment;
  snapshot: PublicDataSnapshot;
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
        return { status: 'OK', data: { subzones, dengueClusters: [], highAedesAreas: [], riskLevels: {}, assessments: {} } };
      }
      const snapshot = await this.dataService.retrievePublicData();
      if (snapshot.subzones.length === 0) return this.handleUnavailableData();

      const riskLevels: Record<string, RiskLevel> = {};
      const assessmentsBySubzone: Record<string, RiskAssessment> = {};
      const subzoneIds = new Set(snapshot.subzones.map((zone) => zone.subzoneId));
      const assessments = this.assessmentControl ? await this.assessmentControl.assessAll(snapshot) : [];
      for (const assessment of assessments) {
        if (subzoneIds.has(assessment.subzoneId) && Object.values(RiskLevel).includes(assessment.riskLevel)
          && Number.isFinite(assessment.riskIndex) && assessment.riskIndex >= 0 && assessment.riskIndex <= 100) {
          riskLevels[assessment.subzoneId] = assessment.riskLevel;
          assessmentsBySubzone[assessment.subzoneId] = assessment;
        }
      }

      return {
        status: 'OK',
        data: {
          subzones: snapshot.subzones,
          dengueClusters: snapshot.dengueClusters,
          highAedesAreas: snapshot.highAedesAreas,
          riskLevels,
          assessments: assessmentsBySubzone,
          snapshot,
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

  // Open the result using the exact assessment and data already shown on the map.
  getSelectedAssessment(id: string, data: MapData): MapAssessmentSelection | null {
    const subzone = data.snapshot?.subzones.find((zone) => zone.subzoneId === id);
    const assessment = data.assessments[id];
    if (!subzone || !assessment || !data.snapshot) return null;
    return { subzone, assessment, snapshot: data.snapshot };
  }

  // Ticket #22: display the largest contributions, without changing P1's scores.
  getTopFactors(assessment?: RiskAssessment): RiskFactorContribution[] {
    const factors = assessment?.contributions ?? [];
    return factors
      .filter((factor) => Number.isFinite(factor.contribution) && factor.contribution >= 0)
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 3);
  }

  // Ticket #22: rank only areas with a valid assessment.
  getTopSubzones(data: MapData) {
    const ranked: { subzone: SubzoneBoundary; assessment: RiskAssessment }[] = [];
    for (const subzone of data.subzones) {
      const assessment = data.assessments[subzone.subzoneId];
      if (assessment) ranked.push({ subzone, assessment });
    }
    ranked.sort((a, b) => {
      if (a.assessment.riskIndex !== b.assessment.riskIndex) return b.assessment.riskIndex - a.assessment.riskIndex;
      return a.subzone.subzoneId.localeCompare(b.subzone.subzoneId);
    });
    return ranked.slice(0, 10);
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
