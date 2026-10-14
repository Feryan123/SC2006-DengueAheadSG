/**
 * Traces to: RiskAssessment (<<entity>>) in class diagram
 * Related use case(s): UC-1 Assess Location Risk (Generate Risk Assessment), UC-4 Simulate Risk Scenario
 *
 * ATTRIBUTES:
 * - assessmentId : String — unique identifier of the assessment
 * - generatedAt : DateTime — when the assessment was generated
 * - dataTimeStamp : DateTime — timestamp of the underlying data
 * - horizonDays : Integer — prediction horizon in days (14-day prediction)
 * - riskIndex : Decimal — computed numeric risk index
 * - riskLevel : RiskLevel — risk category derived from riskIndex (enum, see enums.ts; diagram spells the type "Risklevel")
 * - dataConfidence : DataConfidence — confidence in the input data (enum, see enums.ts)
 * - assessmentType : AssessmentType — baseline vs simulated assessment (enum, see enums.ts)
 *
 * Relationships:
 * - RiskAssessment 1 ◆—— 1..* RiskFactorContribution (composition)
 * - RiskAssessment 1 —— 0..* SimulationScenario, role "Baseline Assessment" (multiplicity TODO(verify))
 * - RiskAssessment 1 —— 0..1 SimulationScenario, role "Simulated Assessment" (multiplicity TODO(verify))
 * - Created by RiskAssessmentControl (dependency)
 */

import type { AssessmentType, DataConfidence, RiskLevel } from './enums.ts';
import type { RiskFactorContribution } from './RiskFactorContribution.ts';
import type { DateTime, Decimal, Integer } from './types.ts';

export interface RiskAssessment {
  assessmentId: string;
  generatedAt: DateTime;
  dataTimeStamp: DateTime;
  horizonDays: Integer;
  riskIndex: Decimal;
  riskLevel: RiskLevel;
  dataConfidence: DataConfidence;
  assessmentType: AssessmentType;
  subzoneId: string;
  /** composition 1 ◆—— 1..* */
  contributions: RiskFactorContribution[];
}
