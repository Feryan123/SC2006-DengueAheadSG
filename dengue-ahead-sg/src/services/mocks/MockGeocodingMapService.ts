/**
 * Traces to: GeocodingMapServiceBoundary (<<boundary>>) in class diagram (mock implementation)
 * Related use case(s): UC-3 Identify Planning Subzone
 *
 * Mock implementation returning fake data, to be swapped for the real
 * GeocodingMapServiceBoundary implementation later.
 *
 * TO IMPLEMENT:
 * - geocodeLocation() — return fake coordinates for a given query
 *
 * Relationships: implements GeocodingMapServiceBoundary
 */

import type { GeocodingResult } from '../GeocodingMapServiceBoundary.ts'

export class MockGeocodingMapService {
    // geocodeLocation() - return fake coordinates for a few addresses/postal codes
    public async geocodeLocation(queryText: string): Promise <GeocodingResult | null> {
        // TODO: return fake [Longitude, Latitude] coordinates for test addresses/postal codes
        void queryText
        return null
    }
}
