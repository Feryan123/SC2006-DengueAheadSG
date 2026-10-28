/**
 * Traces to: PreventionTask (<<entity>>) in class diagram
 * Related use case(s): UC-3 View Prevention Guidance (View Task Details & Source Info)
 *
* ATTRIBUTES:
 * - taskId : String — unique identifier of the task
 * - actionText : String — the preventive action the visitor should take
 * - explanation : String — why the action helps (official NEA guidance)
 * - riskLevels : RiskLevel[] — applicable risk levels (empty array = general tip for any level)
 * - triggerFactor : RiskFactorType (optional) — specific risk factor that triggers this tip
 * - minContributionLevel : ContributionLevel (optional) — minimum factor contribution level to trigger
 * - sourceUrl : String — official NEA source URL for attribution
 *
 * Relationships:
 * - PreventionTask 1..* —◆ 1 PreventionChecklist (part of a PreventionChecklist)
 */

import {
  ContributionLevel,
  RiskFactorType,
  RiskLevel
} from "./enums.ts"

export interface PreventionTask {
  taskId: string;
  actionText: string;
  explanation: string;
  riskLevels: RiskLevel[];
  triggerFactor?: RiskFactorType;
  minContributionLevel?: ContributionLevel;
  sourceUrl: string;
}
