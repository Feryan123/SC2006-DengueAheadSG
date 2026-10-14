/**
 * Traces to: PreventionChecklist (<<entity>>) in class diagram
 * Related use case(s): UC-5 View Prevention Guidance
 *
 * ATTRIBUTES:
 * - checklistId : String — unique identifier of the checklist
 * - sourceName : String — name of the guidance source
 * - sourceVersion : String — version of the guidance source
 * - sourceReference : String — reference / link to the guidance source
 *
 * Relationships:
 * - PreventionChecklist 1 ◆—— 1..* PreventionTask (composition)
 * - Dashed dependency with SimulationScenario (direction/meaning TODO(verify))
 */

import type { PreventionTask } from './PreventionTask.ts';

export interface PreventionChecklist {
  checklistId: string;
  sourceName: string;
  sourceVersion: string;
  sourceReference: string;
  /** composition 1 ◆—— 1..* */
  tasks: PreventionTask[];
}
