/**
 * Traces to: LocationRiskControl (<<control>>) in class diagram
 * Related use case(s): UC-1 Assess Location Risk, UC-3 Identify Planning Subzone
 *
 * TO IMPLEMENT:
 * - assessLocation() — validate the LocationQuery and orchestrate the baseline risk assessment
 * - identifyPlanningSubzone() — geocode the query and map coordinates to a PlanningSubzone
 * - handleUnavailableData() — handle an invalid location or missing assessment data
 *
 * Relationships (dependencies):
 * - Called by HomePageBoundary, RiskResultBoundary
 * - Uses GeocodingMapServiceBoundary, ApprovedPublicDataServiceBoundary, RiskAssessmentControl
 * - Reads/writes LocationQuery, PlanningSubzone
 */

import type { LocationQuery } from "../entity/LocationQuery.ts"
import type { PlanningSubzone } from "../entity/PlanningSubzone.ts"
import type { RiskAssessment } from "../entity/RiskAssessment.ts"

export type AssessLocationResult = 
| {
    status: "OK"
    query: LocationQuery
    subzone: PlanningSubzone
    assessment: RiskAssessment
}
| {
    status: "INVALID_LOCATION"
    query: LocationQuery
}
| {
    status: "DATA_UNAVAILABLE"
    reason: string
}

export class LocationRiskControl {
    // assessLocation() - validate queryText -> geocode -> identify subzone -> generateAssessment
    public async assessLocation(queryText: string): Promise <AssessLocationResult> {
        // TODO: Validate queryText, geocode, identify subzone and call generateAssessment(subzoneId)
        void queryText
        throw new Error("Not implemented: assessLocation()")
    }

    // identifyPlanningSubzone() - coordinates -> PlanningSubzone (point-in-polygon)
    public async identifyPlanningSubzone(
        coordinates: [number, number],
        subzones?: PlanningSubzone[]
    ): Promise <PlanningSubzone | null> {
        // TODO: Map [Longitude, Latitude] coordinates to a PlanningSubzone boundary
        void coordinates
        void subzones
        return null
    }

    // handleUnavailableData() - returns INVALID_LOCATION / DATA_UNAVAILABLE instead of throwing
    public async handleUnavailableData(
        queryOrReason: LocationQuery | string): Promise <AssessLocationResult> {
            // TODO: Return INAVLID_LOCATION or DATA_UNAVAILABLE result value
            void queryOrReason
            throw new Error("Not implemented: handleUnavailableData()")
        }
}
