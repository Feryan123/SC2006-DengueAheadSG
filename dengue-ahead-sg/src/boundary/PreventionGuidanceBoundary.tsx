/**
 * Traces to: PreventionGuidanceBoundary (<<boundary>>) in class diagram
 * Related use case(s): UC-5 View Prevention Guidance
 *
 * TO IMPLEMENT:
 * - selectTask() — handle the user selecting a task to view its details and source info
 *
 * Calls: PreventionGuidanceControl
 */

import { PreventionGuidanceControl } from "../control/PreventionGuidanceControl.ts"

export interface PreventionGuidanceBoundaryProps {
    control? : PreventionGuidanceControl
    onBack? : () => void
}

export function PreventionGuidanceBoundary(props: PreventionGuidanceBoundaryProps) {
    // SelectTask() - handles the user selecting a taskto view details and source info
    const SelectTask = async (taskId: string): Promise<void> => {
        // TODO: Call PreventionGuidanceControl.showTaskDetails(taskId) and display explanation + source info
        void props
        void taskId
    }

    return (
        <section>
            {/* TODO: Render PreventionChecklist tasks and call selectTask(taskId) on click */}
            <button type = "button" onClick = {
                () => void SelectTask("task_1")
            }>
                Select Task
            </button>
        </section>
    )
}

export default PreventionGuidanceBoundary