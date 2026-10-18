/**
 * Traces to: HomePageBoundary (<<boundary>>) in class diagram
 * Related use case(s): UC-1 Assess Location Risk
 *
 * TO IMPLEMENT:
 * - submitLocationQuery() — submit the entered Singapore address / postal code
 *
 * Calls: LocationRiskControl
 */

import type { LocationRiskControl } from "../control/LocationRiskControl.ts"
import type { PlanningSubzone } from "../entity/PlanningSubzone.ts"
import type { RiskAssessment } from "../entity/RiskAssessment.ts"

export interface HomePageBoundaryProps {
    control?: LocationRiskControl
    onAssessmentReady?: (subzone: PlanningSubzone, assessment: RiskAssessment) => void
    onDataUnavailable?:  (reason: string) => void
    onOpenMap?: () => void
    onOpenPrevention?: () => void
}

export function HomePageBoundary(props: HomePageBoundaryProps) {
    // submitLocationQuery() - submit the entered Singapore address / postal code
    const submitLocationQuery = async (): Promise <void> => {
        // TODO: Call LocationRiskControl.assessmentLocation() and handle OK/ INVALID_LOCATION / DATA_UNAVAILABLE
        void props
    }

return (
        <section>
            {/* TODO: Address/postal code input, submit button, "Invalid Location" state, and links to Risk Map & Prevention Checklist */}
            <button type="button" onClick={() => void submitLocationQuery()}>
                Submit Location Query
            </button>
        </section>
    )
}

export default HomePageBoundary
