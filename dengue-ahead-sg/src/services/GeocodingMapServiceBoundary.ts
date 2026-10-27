/**
 * Traces to: GeocodingMapServiceBoundary (<<boundary>>) in class diagram
 * (the "OneMapAdapter" in backlog #14)
 * Related use case(s): UC-1 Assess Location Risk, UC-5 Identify Planning Subzone,
 * UC-5 (Handle Unavailable Data / Invalid Location)
 *
 * IMPLEMENTS:
 * - geocodeLocation() — convert an address / postal code into [longitude, latitude]
 *   by calling OUR token proxy (#55). Never calls OneMap directly, so the OneMap
 *   login and token stay on the server.
 *
 * Contract (so the caller can tell "bad address" from "service down"):
 * - returns GeocodingResult  -> first OneMap result, coordinates parsed to numbers
 * - returns null             -> OneMap answered but found nothing usable (invalid address)
 * - throws GeocodingUnavailableError -> proxy/network/shape failure (NOT an invalid address)
 *
 * Relationships: called by LocationRiskControl; external actor Geocoding / Map Services
 */

export interface GeocodingResult {
    coordinates: [number, number]
    matchedAddress: string
    postalCode?: string
}

export class GeocodingUnavailableError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "GeocodingUnavailableError"
    }
}

// Route of P3's serverless proxy, served from api/onemap-search.ts
export const ONEMAP_PROXY_PATH = "/api/onemap-search"
const REQUEST_TIMEOUT_MS = 12_000

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

export class GeocodingMapServiceBoundary {
    private readonly proxyUrl: string

    // proxyUrl is overridable so tests / non-browser callers can pass an absolute URL
    constructor(proxyUrl: string = ONEMAP_PROXY_PATH) {
        this.proxyUrl = proxyUrl
    }

    // geocodeLocation() - convert an address / postal code into coordinates via the OneMap proxy
    public async geocodeLocation(queryText: string): Promise<GeocodingResult | null> {
        const searchVal = queryText.trim()
        if (!searchVal) return null

        let data: unknown
        try {
            const response = await fetch(
                `${this.proxyUrl}?searchVal=${encodeURIComponent(searchVal)}`,
                { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }
            )
            if (!response.ok) {
                throw new GeocodingUnavailableError(`Proxy responded with ${response.status}.`)
            }
            data = await response.json()
        } catch (error) {
            if (error instanceof GeocodingUnavailableError) throw error
            throw new GeocodingUnavailableError("Could not reach the location search service.")
        }

        if (!isObject(data) || !Array.isArray(data.results)) {
            throw new GeocodingUnavailableError("Location search returned unexpected data.")
        }

        // found === 0 -> empty results -> genuinely no such address
        const first: unknown = data.results[0]
        if (first === undefined) return null
        if (!isObject(first)) {
            throw new GeocodingUnavailableError("Location search returned unexpected data.")
        }

        // OneMap sends LATITUDE / LONGITUDE as strings.
        const latitude = typeof first.LATITUDE === "string" ? Number(first.LATITUDE) : NaN
        const longitude = typeof first.LONGITUDE === "string" ? Number(first.LONGITUDE) : NaN
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return null // result exists but has no usable coordinates
        }

        const matchedAddress =
            typeof first.ADDRESS === "string" && first.ADDRESS.trim()
                ? first.ADDRESS.trim()
                : searchVal
        const result: GeocodingResult = {
            coordinates: [longitude, latitude],
            matchedAddress,
        }
        // OneMap returns "NIL" when a result has no postal code.
        if (typeof first.POSTAL === "string" && /^\d{6}$/.test(first.POSTAL)) {
            result.postalCode = first.POSTAL
        }
        return result
    }
}