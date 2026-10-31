/**
 * Tests for backlog #30: describeDataFreshness and formatLastUpdated.
 * Thresholds are read from riskModelConfig, so the tests follow them if they change.
 */
import { describe, expect, it } from 'vitest'
import { describeDataFreshness, formatLastUpdated } from './dataFreshness.ts'
import { MAX_FETCH_AGE_MIN } from './riskModelConfig.ts'
import { DatasetStatus } from '../entity/enums.ts'
import type { PublicDataSnapshot } from '../services/ApprovedPublicDataServiceBoundary.ts'

const MINUTE = 60_000
const NOW = Date.parse('2026-10-31T03:00:00.000Z')
const minutesAgo = (minutes: number) => new Date(NOW - minutes * MINUTE).toISOString()

type Dataset = { retrievedAt: string, status: DatasetStatus }
const fresh = (minutes = 10): Dataset => ({ retrievedAt: minutesAgo(minutes), status: DatasetStatus.Fresh })

function makeSnapshot(
    datasets: Record<string, Dataset>,
    extra: { generatedAt?: string, isBundledFallback?: boolean } = {},
): PublicDataSnapshot {
    return { generatedAt: minutesAgo(10), datasets, ...extra } as unknown as PublicDataSnapshot
}

describe('describeDataFreshness', () => {
    it('is not stale when every dataset is fresh and recently fetched', () => {
        const result = describeDataFreshness(makeSnapshot({ dengueClusters: fresh(), highAedesAreas: fresh() }), NOW)
        expect(result.isStale).toBe(false)
        expect(result.staleDatasets).toEqual([])
    })

    it('reports the snapshot time as lastUpdated', () => {
        const generatedAt = minutesAgo(25)
        const result = describeDataFreshness(makeSnapshot({ dengueClusters: fresh() }, { generatedAt }), NOW)
        expect(result.lastUpdated).toBe(generatedAt)
    })

    it('is stale when a dataset status is STALE, and names it', () => {
        const result = describeDataFreshness(makeSnapshot({
            dengueClusters: fresh(),
            highAedesAreas: { retrievedAt: minutesAgo(5), status: DatasetStatus.Stale },
        }), NOW)
        expect(result.isStale).toBe(true)
        expect(result.staleDatasets).toEqual(['High-Aedes areas'])
    })

    it('is stale when a dataset status is FAILED', () => {
        const result = describeDataFreshness(makeSnapshot({
            dengueClusters: { retrievedAt: minutesAgo(5), status: DatasetStatus.Failed },
        }), NOW)
        expect(result.isStale).toBe(true)
        expect(result.staleDatasets).toEqual(['Dengue clusters'])
    })

    it('uses the cluster age limit from riskModelConfig (exactly at the limit is fine, just over is stale)', () => {
        const limit = MAX_FETCH_AGE_MIN.clusters
        const atLimit = describeDataFreshness(makeSnapshot({ dengueClusters: fresh(limit) }), NOW)
        const overLimit = describeDataFreshness(makeSnapshot({
            dengueClusters: { retrievedAt: new Date(NOW - limit * MINUTE - 1).toISOString(), status: DatasetStatus.Fresh },
        }), NOW)
        expect(atLimit.isStale).toBe(false)
        expect(overLimit.isStale).toBe(true)
    })

    it('uses the Aedes age limit from riskModelConfig', () => {
        const result = describeDataFreshness(makeSnapshot({ highAedesAreas: fresh(MAX_FETCH_AGE_MIN.aedes + 1) }), NOW)
        expect(result.isStale).toBe(true)
        expect(result.staleDatasets).toEqual(['High-Aedes areas'])
    })

    it('does not age-check datasets that have no limit (monthly data relies on its status)', () => {
        const result = describeDataFreshness(makeSnapshot({ humidityMonthly: fresh(60 * 24 * 40) }), NOW)
        expect(result.isStale).toBe(false)
    })

    it('treats an unreadable fetch time on an hourly dataset as stale', () => {
        const result = describeDataFreshness(makeSnapshot({
            dengueClusters: { retrievedAt: 'not a date', status: DatasetStatus.Fresh },
        }), NOW)
        expect(result.isStale).toBe(true)
    })

    it('does not call a fetch time in the future stale', () => {
        const result = describeDataFreshness(makeSnapshot({ dengueClusters: fresh(-30) }), NOW)
        expect(result.isStale).toBe(false)
    })

    it('lists every stale dataset and gives unknown datasets a readable name', () => {
        const result = describeDataFreshness(makeSnapshot({
            dengueClusters: { retrievedAt: minutesAgo(5), status: DatasetStatus.Stale },
            someNewDataset: { retrievedAt: minutesAgo(5), status: DatasetStatus.Stale },
        }), NOW)
        expect(result.staleDatasets).toEqual(['Dengue clusters', 'Some New Dataset'])
    })

    it('handles an empty dataset list and an invalid snapshot time', () => {
        const result = describeDataFreshness(makeSnapshot({}, { generatedAt: 'nonsense' }), NOW)
        expect(result.isStale).toBe(false)
        expect(result.lastUpdated).toBeNull()
    })

    it('passes the bundled-fallback flag through', () => {
        expect(describeDataFreshness(makeSnapshot({}, { isBundledFallback: true }), NOW).isBundledFallback).toBe(true)
        expect(describeDataFreshness(makeSnapshot({}), NOW).isBundledFallback).toBe(false)
    })
})

describe('formatLastUpdated', () => {
    it('formats an ISO time in Singapore time', () => {
        const text = formatLastUpdated('2026-10-31T01:00:00.000Z')
        expect(text).toContain('2026')
        expect(text).toContain('9:00')
    })

    it('returns the original text for an invalid date', () => {
        expect(formatLastUpdated('nonsense')).toBe('nonsense')
    })
})
