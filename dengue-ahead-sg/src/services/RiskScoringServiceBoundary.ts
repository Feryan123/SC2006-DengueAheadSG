/**
 * Traces to: TODO(verify) — external scoring API, will be added later in the class diagram (add as <<boundary>>)
 * Related use case(s): UC-1 Assess Location Risk (Generate Risk Assessment), UC-4 Simulate Risk Scenario
 *
 * METHODS:
 * - scoreFactors() — send one subzone's raw inputs to the scoring API, get a score per risk factor
 *
 * Relationships: called by RiskAssessmentControl
 */

import type { ContributionLevel, RiskFactorType } from '../entity/enums.ts';
import type { Decimal, Integer } from '../entity/types.ts';

// Raw inputs for one subzone. undefined = the data source had no data.
export interface RiskInputs {
  rainfallMm: Decimal | undefined;
  density: Decimal | undefined;
  dengueCaseCount: Integer;
  dengueClusterCount: Integer;
  highAedesAreaCount: Integer;
}

// TODO(verify) response shape once the API is defined
export interface FactorScore {
  factorType: RiskFactorType;
  contribution: Decimal; // points this factor adds to the 0–100 risk index
  contributionLevel: ContributionLevel;
}

export class RiskScoringServiceBoundary {
  async scoreFactors(_inputs: RiskInputs): Promise<FactorScore[]> {
    // TODO: call the scoring API
    throw new Error('Not implemented');
  }
}