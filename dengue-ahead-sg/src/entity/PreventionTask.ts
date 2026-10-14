/**
 * Traces to: PreventionTask (<<entity>>) in class diagram
 * Related use case(s): UC-5 View Prevention Guidance (View Task Details & Source Info)
 *
 * ATTRIBUTES:
 * - taskId : String — unique identifier of the task
 * - actionText : String — the preventive action the visitor should take
 * - explanation : String — why the action helps
 *
 * Relationships:
 * - PreventionTask 1..* —◆ 1 PreventionChecklist (part of a PreventionChecklist)
 */

export interface PreventionTask {
  taskId: string;
  actionText: string;
  explanation: string;
}
