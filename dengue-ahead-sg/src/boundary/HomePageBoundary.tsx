/**
 * Traces to: HomePageBoundary (<<boundary>>) in class diagram
 * Related use case(s): UC-1 Assess Location Risk
 *
 * IMPLEMENTS:
 * - submitLocationQuery() — submit the entered Singapore address / postal code to
 *   LocationRiskControl and show the outcome:
 *     OK               -> onAssessmentReady(subzone, assessment, snapshot)
 *     INVALID_LOCATION -> inline message (the visitor can fix the input)
 *     DATA_UNAVAILABLE -> onDataUnavailable(reason) (a service problem, not a bad address)
 *
 * Calls: LocationRiskControl
 */

import { useRef, useState, type SubmitEvent } from "react"
import type { LocationRiskControl } from "../control/LocationRiskControl.ts"
import type { PlanningSubzone } from "../entity/PlanningSubzone.ts"
import type { RiskAssessment } from "../entity/RiskAssessment.ts"
import type { PublicDataSnapshot } from "../services/ApprovedPublicDataServiceBoundary.ts"
import { ValidationStatus } from "../entity/enums.ts"

export interface HomePageBoundaryProps {
    control?: LocationRiskControl
    onAssessmentReady?: (
        subzone: PlanningSubzone, 
        assessment: RiskAssessment,
        snapshot?: PublicDataSnapshot
    ) => void
    onDataUnavailable?:  (reason: string) => void
    onOpenMap?: () => void
    onOpenPrevention?: () => void
}

const EMPTY_MESSAGE = "Enter an address or a 6-digit Singapore postal code."
const NOT_FOUND_MESSAGE = "We couldn't find that address or postal code. Check it and try again."
const OUTSIDE_MESSAGE = "That doesn't look like a location in Singapore. Enter a Singapore address or 6-digit postal code."
const UNAVAILABLE_MESSAGE = "Location search is unavailable right now. Please try again later."

export function HomePageBoundary(props: HomePageBoundaryProps) {
    const [query, setQuery] = useState("")
    const [searching, setSearching] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const inFlight = useRef(false)

    // Service problem is handed to the app, if no handler we show it
    const reportUnavailable = (reason: string): void => {
        if (props.onDataUnavailable)
            props.onDataUnavailable(reason)
        else
            setMessage(UNAVAILABLE_MESSAGE)
    }

    // submitLocationQuery() - submit the entered Singapore address / postal code
    const submitLocationQuery = async (): Promise <void> => {
        if (inFlight.current)
            return

        const text = query.trim()
        if (!text){
            setMessage(EMPTY_MESSAGE)
            return
        }

        const control = props.control
        if (!control){
            reportUnavailable("Location search is not connected.")
            return
        }
        inFlight.current = true
        setSearching(true)
        setMessage(null)
        try {
            const result = await control.assessLocation(text)
            if (result.status === "OK")
                props.onAssessmentReady?.(result.subzone, result.assessment, result.snapshot)
            else if (result.status === "INVALID_LOCATION")
                setMessage(result.query.validationStatus === ValidationStatus.OutsideSingapore ? OUTSIDE_MESSAGE : NOT_FOUND_MESSAGE)
            else
                reportUnavailable(result.reason)
        }
        catch {
            // Control returns results instead of throwing but never leave the form stack
            reportUnavailable("Location search failed unexpectedly.")
        }
        finally {
            inFlight.current = false
            setSearching(false)
        }
    }

    const handleSubmit = (event: SubmitEvent<HTMLFormElement>): void => {
        event.preventDefault()
        void submitLocationQuery()
    }

    return (
        <section aria-labelledby="home-heading">
            <h1 id="home-heading">Check dengue risk in your area</h1>
            <p>Enter a Singapore address or postal code to see the dengue risk for your area.</p>

            <form onSubmit={handleSubmit} noValidate>
                <label htmlFor="location-query">Address or postal code</label>
                <input
                    id="location-query"
                    name="location"
                    type="text"
                    autoComplete="off"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    aria-invalid={message !== null}
                    aria-describedby={message ? "location-hint location-error" : "location-hint"}
                />
                <p id="location-hint">For example: 680123</p>
                <div className="actions">
                    <button type="submit" className="primary" disabled={searching} aria-busy={searching}>
                        {searching ? "Searching…" : "Check risk"}
                    </button>
                </div>
            </form>

            {message && <p id="location-error" role="alert">{message}</p>}

            <div className="actions">
                <button type="button" className="secondary" onClick={props.onOpenMap}>
                    View risk map
                </button>
                <button type="button" className="secondary" onClick={props.onOpenPrevention}>
                    Prevention guidance
                </button>
            </div>
        </section>
    )
}

export default HomePageBoundary
