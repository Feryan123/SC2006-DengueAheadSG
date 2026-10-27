/**
 * Tests for #14: GeocodingMapServiceBoundary (OneMapAdapter) + LocationRiskControl
 * Traces to UC-1 / UC-3 / UC-5. Assumes Vitest; swap the import if the repo uses Jest.
 */
import { describe, it, expect, vi, afterEach } from "vitest"
import {
    GeocodingMapServiceBoundary,
    GeocodingUnavailableError,
} from "../services/GeocodingMapServiceBoundary.ts"
import { LocationRiskControl } from "../control/LocationRiskControl.ts"
import type { PlanningSubzone } from "../entity/PlanningSubzone.ts"
import type { RiskAssessment } from "../entity/RiskAssessment.ts"
import type { PublicDataSnapshot } from "../services/ApprovedPublicDataServiceBoundary.ts"

const PROXY = "http://localhost/api/onemap-search"

function mockFetch(body: unknown, status = 200) {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })))
}

afterEach(() => vi.unstubAllGlobals())

describe("GeocodingMapServiceBoundary", () => {
    const adapter = new GeocodingMapServiceBoundary(PROXY)

    it("calls the proxy (not OneMap) and parses string coordinates, using results[0]", async () => {
        mockFetch({
            found: 2, totalNumPages: 1, pageNum: 1,
            results: [
                { ADDRESS: "1 A ROAD", POSTAL: "123456", LATITUDE: "1.3521", LONGITUDE: "103.8198" },
                { ADDRESS: "2 B ROAD", LATITUDE: "1.4", LONGITUDE: "103.9" },
            ],
        })
        const result = await adapter.geocodeLocation("1 A Road")
        expect(result).toEqual({
            coordinates: [103.8198, 1.3521],
            matchedAddress: "1 A ROAD",
            postalCode: "123456",
        })
        const url = String(vi.mocked(fetch).mock.calls[0][0])
        expect(url.startsWith(PROXY)).toBe(true)
        expect(url).not.toContain("onemap.gov.sg")
    })

    it("returns null when OneMap finds nothing", async () => {
        mockFetch({ found: 0, totalNumPages: 0, pageNum: 1, results: [] })
        expect(await adapter.geocodeLocation("zzzz")).toBeNull()
    })

    it("returns null for non-numeric coordinates", async () => {
        mockFetch({ results: [{ ADDRESS: "X", LATITUDE: "abc", LONGITUDE: "103.8" }] })
        expect(await adapter.geocodeLocation("x")).toBeNull()
    })

    it("throws GeocodingUnavailableError on proxy 503", async () => {
        mockFetch({ error: "Location search is unavailable. Please try again." }, 503)
        await expect(adapter.geocodeLocation("x")).rejects.toBeInstanceOf(GeocodingUnavailableError)
    })

    it("throws GeocodingUnavailableError on network failure", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("network") }))
        await expect(adapter.geocodeLocation("x")).rejects.toBeInstanceOf(GeocodingUnavailableError)
    })
})

// ---- LocationRiskControl ----
// Only subzoneId + boundary matter here; the cast skips the other PlanningSubzone fields.
const square = (id: string, x: number, y: number): PlanningSubzone => ({
    subzoneId: id,
    boundary: {
        type: "Polygon",
        coordinates: [[[x, y], [x + 0.1, y], [x + 0.1, y + 0.1], [x, y + 0.1], [x, y]]],
    },
} as unknown as PlanningSubzone)

const SUBZONES = [square("A", 103.8, 1.3), square("B", 103.9, 1.3)]
const ASSESSMENT = { riskLevel: "LOW" } as unknown as RiskAssessment

function makeControl(opts: {
    geocode?: () => Promise<{ coordinates: [number, number]; matchedAddress: string } | null>
    subzones?: () => Promise<PlanningSubzone[]>
    assess?: () => Promise<RiskAssessment | null>
} = {}) {
    return new LocationRiskControl(
        {
            retrievePublicData: async () => ({
                subzones: await (opts.subzones ?? (async () => SUBZONES))(),
            }) as unknown as PublicDataSnapshot,
        },
        { generateAssessment: opts.assess ?? (async () => ASSESSMENT) },
        { geocodeLocation: opts.geocode ?? (async () => ({ coordinates: [103.85, 1.35], matchedAddress: "X" })) }
    )
}

describe("LocationRiskControl.assessLocation", () => {
    it("valid query returns OK with the containing subzone", async () => {
        const result = await makeControl().assessLocation("680123")
        expect(result.status).toBe("OK")
        if (result.status === "OK") {
            expect(result.subzone.subzoneId).toBe("A")
            expect(result.query.queryType).toBe("POSTAL_CODE")
            expect(result.query.validationStatus).toBe("VALID")
            expect(result.query.subzoneId).toBe("A")
            expect(result.snapshot.subzones).toHaveLength(2)
        }
    })

    it("empty query returns INVALID_LOCATION", async () => {
        expect((await makeControl().assessLocation("   ")).status).toBe("INVALID_LOCATION")
    })

    it("geocoder finding nothing returns INVALID_LOCATION", async () => {
        const result = await makeControl({ geocode: async () => null }).assessLocation("nowhere")
        expect(result.status).toBe("INVALID_LOCATION")
    })

    it("coordinates outside Singapore return INVALID_LOCATION", async () => {
        const result = await makeControl({
            geocode: async () => ({ coordinates: [101.69, 3.14], matchedAddress: "KL" }),
        }).assessLocation("Kuala Lumpur")
        expect(result.status).toBe("INVALID_LOCATION")
    })

    it("point inside bounds but in no subzone returns INVALID_LOCATION", async () => {
        const result = await makeControl({
            geocode: async () => ({ coordinates: [104.0, 1.2], matchedAddress: "sea" }),
        }).assessLocation("somewhere")
        expect(result.status).toBe("INVALID_LOCATION")
    })

    it("geocoder outage returns DATA_UNAVAILABLE, not INVALID_LOCATION", async () => {
        const result = await makeControl({
            geocode: async () => { throw new GeocodingUnavailableError("down") },
        }).assessLocation("1 A Road")
        expect(result).toEqual({ status: "DATA_UNAVAILABLE", reason: "down" })
    })

    it("subzone load failure or empty list returns DATA_UNAVAILABLE", async () => {
        const failed = await makeControl({ subzones: async () => { throw new Error("x") } }).assessLocation("1 A Road")
        const empty = await makeControl({ subzones: async () => [] }).assessLocation("1 A Road")
        expect(failed.status).toBe("DATA_UNAVAILABLE")
        expect(empty.status).toBe("DATA_UNAVAILABLE")
    })

    it("assessment unavailable returns DATA_UNAVAILABLE", async () => {
        const result = await makeControl({ assess: async () => null }).assessLocation("1 A Road")
        expect(result.status).toBe("DATA_UNAVAILABLE")
    })
})

describe("LocationRiskControl.identifyPlanningSubzone", () => {
    it("respects polygon holes and MultiPolygon", async () => {
        const donut = {
            subzoneId: "D",
            boundary: {
                type: "MultiPolygon",
                coordinates: [[
                    [[103.0, 1.0], [104.0, 1.0], [104.0, 2.0], [103.0, 2.0], [103.0, 1.0]],
                    [[103.4, 1.4], [103.6, 1.4], [103.6, 1.6], [103.4, 1.6], [103.4, 1.4]],
                ]],
            },
        } as unknown as PlanningSubzone
        const control = makeControl()
        expect((await control.identifyPlanningSubzone([103.2, 1.2], [donut]))?.subzoneId).toBe("D")
        expect(await control.identifyPlanningSubzone([103.5, 1.5], [donut])).toBeNull()
    })
})