/**
 * Traces to: GeocodingMapServiceBoundary (<<boundary>>) in class diagram
 * Related use case(s): UC-3 Identify Planning Subzone (Geocode & Validate Location Query, Map Coordinates to Subzone Boundary)
 *
 * TO IMPLEMENT:
 * - geocodeLocation() — convert an address / postal code into coordinates via the external Geocoding / Map Service
 *
 * Relationships: called by LocationRiskControl; external actor Geocoding / Map Services
 */

export interface GeocodingResult {
    coordinates: [number, number]
    matchedAddress: string
    postalCode?: string
}

export class GeocodingMapServiceBoundary {
    // geocodeLocation() - convert an address / postal code into coordinations via OneMap API
    public async geocodeLocation(queryText: string): Promise <GeocodingResult | null> {
        // TODO: Implement real OneMap API call
        void queryText
        return null
    }
}