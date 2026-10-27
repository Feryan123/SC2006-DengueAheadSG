/**
 * Traces to: PreventionGuidanceBoundary (<<boundary>>) in class diagram
 * Related use case(s): UC-5 View Prevention Guidance
 *
* IMPLEMENTED:
 * - Loads and renders PreventionChecklist tasks via PreventionGuidanceControl.loadChecklist()
 * - selectTask(taskId) — fetches and displays task explanation and clickable NEA source links
 *
 * Calls: PreventionGuidanceControl
 */

import { useEffect, useMemo, useState } from "react"
import { PreventionGuidanceControl, type TaskDetails } from "../control/PreventionGuidanceControl.ts"
import type { PreventionChecklist } from "../entity/PreventionChecklist.ts"

export interface PreventionGuidanceBoundaryProps {
    control? : PreventionGuidanceControl
    onBack? : () => void
}

export function PreventionGuidanceBoundary({control, onBack}: PreventionGuidanceBoundaryProps){
    const guidanceControl = useMemo(
        () => control ?? new PreventionGuidanceControl(), [control]
    )

    const [checklist, setChecklist] = useState<PreventionChecklist | null>(null)
    const [selectedDetails, setSelectedDetails] = useState<TaskDetails | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [taskError, setTaskError] = useState<string | null>(null)

    useEffect(() => {
        let isMounted = true
        guidanceControl.loadChecklist().then((data) => {
            if (isMounted){
                setChecklist(data)
                setLoadError(null)
        }
    })
    .catch(() => {
        if (isMounted)
            setLoadError('Prevention guidance is currently unavailable. Please use the navigation menu to return to Home or the Risk Map.')
    })

    return () => {
        isMounted = false
    }
}, [guidanceControl])

    // SelectTask() - handles the user selecting a taskto view details and source info
    const selectTask = async (taskId: string): Promise<void> => {
        if (selectedDetails?.task.taskId === taskId) {
            setSelectedDetails(null)
            setTaskError(null)
            return
        }


        try {
            setTaskError(null)
            const details = await guidanceControl.showTaskDetails(taskId)
            if (!details) {
                setSelectedDetails(null)
                setTaskError('Details for the selected task are unavailable. Please select another task.')
                return
            }
            setSelectedDetails(details)        
        } catch {
            setSelectedDetails(null)
            setTaskError('Details for the selected task are unavailable. Please select another task.')
        }
    }

 if (loadError) {
    return (
      <section aria-labelledby="prevention-heading" className="prevention-guidance-boundary">
        <h2 id="prevention-heading">Dengue Prevention Guidance</h2>
        <div role="alert">{loadError}</div>
        {onBack && (
          <button type="button" onClick={onBack}>
            Back
          </button>
        )}
      </section>
    )
  }

  return (
    <section aria-labelledby="prevention-heading" className="prevention-guidance-boundary">
      <header>
        <h2 id="prevention-heading">Official Dengue Prevention Checklist</h2>

        <p>
          Public dengue prevention guidance based on the National Environment Agency (NEA)
          B-L-O-C-K and S-A-W steps. Select any task below to view its full explanation and
          official source.
        </p>

        {onBack && (
          <button type="button" onClick={onBack}>
            Back
          </button>
        )}
      </header>

      {taskError && <div role="alert">{taskError}</div>}

      {!checklist && <p role="status">Loading prevention guidance…</p>}

      {checklist && (
        <ul>
          {checklist.tasks.map((task) => {
            const isSelected = selectedDetails?.task.taskId === task.taskId

            return (
              <li key={task.taskId}>
                <button
                  type="button"
                  aria-expanded={isSelected}
                  onClick={() => void selectTask(task.taskId)}
                >
                  <span aria-hidden="true">✓ </span>
                  {task.actionText}
                </button>

                {isSelected && selectedDetails && (
                  <div className="task-details-panel">
                    <p>{selectedDetails.task.explanation}</p>
                    <p>
                      <strong>Source:</strong> {selectedDetails.sourceName} (
                      {selectedDetails.sourceVersion}) —{' '}
                      <a
                        href={selectedDetails.sourceReference}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View Official NEA Guidance
                      </a>
                    </p>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default PreventionGuidanceBoundary