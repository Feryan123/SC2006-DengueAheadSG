/**
 * Traces to: PreventionGuidanceControl (<<control>>) in class diagram
 * Related use case(s): UC-5 View Prevention Guidance
 *
 * TO IMPLEMENT:
 * - loadChecklist() — load the PreventionChecklist and its tasks
 * - showTaskDetails() — return the task explanation and source information
 *
 * Relationships (dependencies):
 * - Called by PreventionGuidanceBoundary
 * - Reads PreventionChecklist, PreventionTask
 * - Dashed link toward RiskAssessmentControl in diagram (TODO(verify))
 */

import type { PreventionChecklist } from '../entity/PreventionChecklist.ts'
import type { PreventionTask } from '../entity/PreventionTask.ts'

export interface TaskDetails {
    task: PreventionTask
    sourceName: string
    sourceVersion: string
    sourceReference: string
}

export class PreventionGuidanceControl {
    //Loads the PreventionChecklist and its tasks
    public async loadChecklist(): Promise<PreventionChecklist> {
        // TODO: return bundled PreventionChecklist data
        throw new Error('Not implemented: loadChecklist()')
    }

    //Returns the selected task's explanation and source information.
    public async showTaskDetails(taskId: string): Promise<TaskDetails | null> {
        // TODO: Find task by taskId in the checklist and return task + source info
        void taskId
        return null
    }
}
