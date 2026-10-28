/**
 * Traces to: LocationRiskControl (<<control>>) in class diagram
 * Related use case(s): UC-1 Assess Location Risk, UC-5 Identify Planning Subzone
 *
 * IMPLEMENTS:
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
import type { Geometry } from "../entity/types.ts"
import type { ApprovedPublicDataServiceBoundary, PublicDataSnapshot } from "../services/ApprovedPublicDataServiceBoundary.ts"
import type { RiskAssessmentControl } from "./RiskAssessmentControl.ts"
import { QueryType, ValidationStatus } from "../entity/enums.ts"
import { GeocodingMapServiceBoundary, GeocodingUnavailableError } from "../services/GeocodingMapServiceBoundary.ts"
import type { GeocodingResult } from "../services/GeocodingMapServiceBoundary.ts"

export type AssessLocationResult = 
| {
    status: "OK"
    query: LocationQuery
    subzone: PlanningSubzone
    assessment: RiskAssessment
    snapshot: PublicDataSnapshot
}
| {
    status: "INVALID_LOCATION"
    query: LocationQuery
}
| {
    status: "DATA_UNAVAILABLE"
    reason: string
}

export interface GeocodingService {
    geocodeLocation(queryText: string): Promise<GeocodingResult | null>
}
export type AssessmentGenerator = Pick<RiskAssessmentControl, "generateAssessment">

const SG_BOUNDS = { minLng: 103.55, maxLng: 104.1, minLat: 1.12, maxLat: 1.48}
const POSTAL_CODE_PATTERN = /^\d{6}$/
const MAX_QUERY_LENGTH = 200

function isInsideSingaporeBounds([lng, lat]: [number, number]): boolean {
    return lng >= SG_BOUNDS.minLng && lng <= SG_BOUNDS.maxLng
    && lat >= SG_BOUNDS.minLat && lat <= SG_BOUNDS.maxLat
}

function inRing(lng: number, lat: number, ring: [number,number][]): boolean
{
    let inside = false
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i]
        const [xj, yj] = ring[j]
        if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
            inside = !inside
        }
    }
    return inside
}

function inPolygon(lng: number, lat: number, rings: [number, number][][]): boolean 
{
    if (rings.length === 0 || !inRing(lng, lat, rings[0]))
        return false
    return !rings.slice(1).some((hole) => inRing(lng, lat, hole))
}

function geometryContains(geometry: Geometry, lng: number, lat: number): boolean 
{
    if (geometry.type === "Polygon") 
        return inPolygon(lng, lat, geometry.coordinates)
    if (geometry.type === "MultiPolygon") 
        return geometry.coordinates.some((polygon) => inPolygon(lng, lat, polygon))
    
    return false
}

export class LocationRiskControl {
    private readonly publicData?: ApprovedPublicDataServiceBoundary
    private readonly assessments?: AssessmentGenerator
    private readonly geocoder: GeocodingService
 
    constructor(
        publicData?: ApprovedPublicDataServiceBoundary,
        assessments?: AssessmentGenerator,
        geocoder: GeocodingService = new GeocodingMapServiceBoundary()
    ) {
        this.publicData = publicData
        this.assessments = assessments
        this.geocoder = geocoder
    }
    // assessLocation() - validate queryText -> geocode -> identify subzone -> generateAssessment
    public async assessLocation(queryText: string): Promise <AssessLocationResult> {
        const text = (queryText ?? "").trim()
        const query: LocationQuery = {
            queryText: text,
            queryType: POSTAL_CODE_PATTERN.test(text) ? QueryType.PostalCode : QueryType.Address,
            validationStatus: ValidationStatus.Pending
        }

        const withStatus = (status: ValidationStatus): LocationQuery => ({
            queryText: text,
            queryType: query.queryType,
            validationStatus: status,
})

        //Check if non-empty address or 6 digit postal code
        if (!text || text.length > MAX_QUERY_LENGTH)
            return this.handleUnavailableData(withStatus(ValidationStatus.Invalid))

        const publicData = this.publicData
        const assessments = this.assessments
        if(!publicData || !assessments)
            return this.handleUnavailableData("Risk data services are not connected yet.")
    
        //Geocode; null = no address; thrown error = service problem.
        let geocoded: GeocodingResult | null
        try {
            geocoded = await this.geocoder.geocodeLocation(text)
        } 
        catch (error) {
            const reason = error instanceof GeocodingUnavailableError 
            ? error.message : "Location search is unavailable."
            return this.handleUnavailableData(reason)
        }
        if (!geocoded)
            return this.handleUnavailableData(withStatus(ValidationStatus.Invalid))

        //Must be inside Singapore
        if (!isInsideSingaporeBounds(geocoded.coordinates))
            return this.handleUnavailableData(withStatus(ValidationStatus.OutsideSingapore))

        //Coordinates -> subzone. One snapshot reused for the assessment
        let snapshot: PublicDataSnapshot
        try {
            snapshot = await publicData.retrievePublicData()
        }
        catch {
            return this.handleUnavailableData("Public data could not be loaded.")
        }
        if (!snapshot.subzones || snapshot.subzones.length === 0)
            return this.handleUnavailableData("Planning subzone data is unavailable.")

        const subzone = await this.identifyPlanningSubzone(geocoded.coordinates, snapshot.subzones)
        
        if (!subzone)
            return this.handleUnavailableData("Area data unavailable for this location.")

        //Baseline Assessment
        let assessment: RiskAssessment | null
        try {
            assessment = await assessments.generateAssessment(subzone.subzoneId, snapshot)
        }
        catch {
            return this.handleUnavailableData("Risk assessment is unavailable.")
        }
        if (!assessment)
            return this.handleUnavailableData("Risk assessment is unavailable.")

        return {
            status: "OK",
            query: {
                queryText: query.queryText,
                queryType: query.queryType,
                validationStatus: ValidationStatus.Valid,
                subzoneId: subzone.subzoneId
            }, subzone, assessment, snapshot
        }
    }

    // identifyPlanningSubzone() - coordinates -> PlanningSubzone (point-in-polygon)
    public async identifyPlanningSubzone(
        coordinates: [number, number],
        subzones?: PlanningSubzone[]): Promise <PlanningSubzone | null> {
            const [lng, lat] = coordinates
            if (!Number.isFinite(lng) || !Number.isFinite(lat))
                return null
            const candidates = subzones ?? (await this.publicData?.retrievePublicData())?.subzones ?? []
            return candidates.find((s) => geometryContains(s.boundary, lng, lat)) ?? null
    }

    // handleUnavailableData() - returns INVALID_LOCATION / DATA_UNAVAILABLE instead of throwing
    public async handleUnavailableData(
        queryOrReason: LocationQuery | string): Promise <AssessLocationResult> {
            if (typeof queryOrReason === "string")
                return { status: "DATA_UNAVAILABLE", reason: queryOrReason}
            return { status: "INVALID_LOCATION", query: queryOrReason}
        }
}
