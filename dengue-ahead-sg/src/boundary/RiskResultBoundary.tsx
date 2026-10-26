/**
 * Traces to: RiskResultBoundary (<<boundary>>) in class diagram
 * Related use case(s): UC-1 Assess Location Risk
 *
 * TO IMPLEMENT:
 * - showAssessment() — display risk level, 14-day prediction, contributions, data confidence and disclaimer
 *
 * Calls: LocationRiskControl
 */

import type { ReactNode } from "react"
import type { DengueCluster } from "../entity/DengueCluster.ts"
import type { PlanningSubzone } from "../entity/PlanningSubzone.ts"
import type { RiskAssessment } from "../entity/RiskAssessment.ts"
import { getRiskLevelStyle } from './riskLevelStyle.ts'

export interface RiskResultBoundaryProps {
    subzone : PlanningSubzone
    assessment : RiskAssessment
    clusters? : DengueCluster[]
    onSimulate? : (baselineAssessment: RiskAssessment) => void
    onBack? : () => void
}

export function RiskResultBoundary(props: RiskResultBoundaryProps) {
    // showAssessment() - display risk level, 14-day prediction, assessment time, data confidence, 
    // factor contributions + explanations, cluster info, disclaimer, and "Simulate" button
    const showAssessment = () : ReactNode => {
        // The full result screen is ticket #18. Keep its risk colour shared with the map.
        const style = getRiskLevelStyle(props.assessment.riskLevel)
        return <span className="risk-pill" style={{ backgroundColor: style.colour, color: style.textColour }}>{style.label}</span>
    }
    return <section>{showAssessment()}</section>
}   

export default RiskResultBoundary
