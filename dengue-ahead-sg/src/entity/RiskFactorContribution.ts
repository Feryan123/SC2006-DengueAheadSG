/**
 * Traces to: RiskFactorContribution (<<entity>>) in class diagram
 * Related use case(s): UC-1 Assess Location Risk (show risk factor contributions and explanations)
 *
 * ATTRIBUTES:
 * - factorType : RiskFactorType — which risk factor this contribution is for (enum, see enums.ts)
 * - inputValue : Decimal — raw input value of the factor (e.g. rainfall mm, density)
 * - contribution : Decimal — how much this factor contributes to the risk index
 * - /contributionLevel : ContributionLevel — DERIVED (UML "/") from contribution; computed, not input (enum, see enums.ts)
 * - explanation : String — human-readable explanation of the contribution (diagram spells it "explaination")
 *
 * Relationships:
 * - RiskFactorContribution 1..* —◆ 1 RiskAssessment (part of a RiskAssessment)
 */

import type { ContributionLevel, RiskFactorType } from './enums.ts';
import type { Decimal } from './types.ts';

export interface RiskFactorContribution {
  factorType: RiskFactorType;
  inputValue: Decimal;
  contribution: Decimal;
  /** Derived (UML "/"): computed from `contribution` by RiskAssessmentControl.calculateContributions() */
  contributionLevel: ContributionLevel;
  explanation: string;
}
