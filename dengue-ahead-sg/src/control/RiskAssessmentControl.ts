/**
 * Traces to: RiskAssessmentControl (<<control>>) in class diagram
 * Related use case(s): UC-1 Assess Location Risk (Generate Risk Assessment), UC-4 Simulate Risk Scenario
 *
 * METHODS:
 * - generateAssessment() — build a RiskAssessment for a planning subzone
 * - calculateRiskIndex() — risk index (0–100) = sum of the factor contributions
 * - determineRiskLevel() — map the risk index to a risk level (LOW < 50 ≤ MODERATE < 80 ≤ HIGH)
 *                          NOTE: This threshold is to be discussed again later, for constants MODERATE_THRESHOLD & HIGH_THREHSOLD
 * - calculateContributions() — get factor scores from the scoring API and add explanations
 * - collectInputs() — helper (not in diagram): pull one subzone's raw inputs out of a PublicDataSnapshot
 *
 * The scoring model itself lives behind RiskScoringServiceBoundary.
 *
 * Relationships (dependencies):
 * - Called by LocationRiskControl, RiskMapControl, RiskSimulationControl (PreventionGuidanceControl TODO(verify))
 * - Uses RiskScoringServiceBoundary (TODO(verify) not in diagram)
 * - Creates RiskAssessment and RiskFactorContribution
 * - Reads PlanningSubzone, PopulationProfile, HighAedesArea, DengueCluster
 */

import type { AssessmentType, RiskLevel } from '../entity/enums.ts';
import type { RiskAssessment } from '../entity/RiskAssessment.ts';
import type { RiskFactorContribution } from '../entity/RiskFactorContribution.ts';
import type { Decimal } from '../entity/types.ts';
import type { PublicDataSnapshot } from '../services/ApprovedPublicDataServiceBoundary.ts';
import type { RiskInputs, RiskScoringServiceBoundary } from '../services/RiskScoringServiceBoundary.ts';

// Constants, to be agreed upon
export const HORIZON_DAYS = 14;         // how far ahead the risk prediction looks
export const MODERATE_THRESHOLD = 50;   // below this is considered LOW
export const HIGH_THRESHOLD = 80;       // equal or above this is considered HIGH
                                        // other is considered MODERATE

export interface GenerateAssessmentOptions {
  // For simulations: use these inputs instead of reading them from the snapshot
  inputs?: RiskInputs;
  // Defaults to BASELINE
  assessmentType?: AssessmentType;
}

export class RiskAssessmentControl {
  readonly scoringService: RiskScoringServiceBoundary;

  constructor(scoringService: RiskScoringServiceBoundary) {
    this.scoringService = scoringService;
  }

  async generateAssessment(
    _subzoneId: string,
    _snapshot: PublicDataSnapshot,
    _options: GenerateAssessmentOptions = {},
  ): Promise<RiskAssessment> {
    // TODO: get inputs (options.inputs, otherwise collectInputs)
    // TODO: calculateContributions -> calculateRiskIndex -> determineRiskLevel
    // TODO: set dataConfidence (rainfall missing = LOW, density missing = MEDIUM, otherwise HIGH)
    // TODO: return a RiskAssessment (horizonDays = HORIZON_DAYS, dataTimeStamp = snapshot.retrievedAt)
    throw new Error('Not implemented');
  }

  collectInputs(_subzoneId: string, _snapshot: PublicDataSnapshot): RiskInputs {
    // TODO: throw if the subzone isn't in the snapshot
    // TODO: rainfall, density, dengue case + cluster count, high-Aedes area count for this subzone
    throw new Error('Not implemented');
  }

  async calculateContributions(_inputs: RiskInputs): Promise<RiskFactorContribution[]> {
    // TODO: call this.scoringService.scoreFactors(inputs)
    // TODO: add inputValue + a human-readable explanation to each score
    throw new Error('Not implemented');
  }

  calculateRiskIndex(_contributions: RiskFactorContribution[]): Decimal {
    // TODO: sum the contributions, clamp to 0–100, round to 1 decimal place
    throw new Error('Not implemented');
  }

  determineRiskLevel(_riskIndex: Decimal): RiskLevel {
    // TODO: LOW below MODERATE_THRESHOLD, HIGH at or above HIGH_THRESHOLD, otherwise MODERATE
    throw new Error('Not implemented');
  }
}
