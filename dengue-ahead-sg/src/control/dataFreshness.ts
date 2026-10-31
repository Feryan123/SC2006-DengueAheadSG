/**
 * Traces to: ApprovedPublicDataServiceBoundary (data freshness shown to visitors)
 * Related use case(s): UC-1 Assess Location Risk, UC-2 Explore Risk Map · Backlog #30
 *
 * IMPLEMENTS:
 * - describeDataFreshness() — says whether any dataset in a snapshot is stale and when the snapshot was last updated
 * - formatLastUpdated() — formats that time for display (Singapore time)
 *
 * A dataset counts as stale when:
 * - its status is STALE or FAILED (set by the hourly sync job or by the cache proxy), or
 * - for the hourly datasets, it was fetched longer ago than MAX_FETCH_AGE_MIN in riskModelConfig.
 * No risk calculations here.
 */

import { DatasetStatus } from "../entity/enums.ts"
import type { PublicDataSnapshot } from "../services/ApprovedPublicDataServiceBoundary.ts"
import { MAX_FETCH_AGE_MIN } from "./riskModelConfig.ts"

const MS_PER_MINUTE = 60_000

// Age limits come from riskModelConfig. Only the hourly datasets have one;
// the monthly datasets rely on the status set when the snapshot was built.
const MAX_AGE_MS: Record<string, number> = {
    dengueClusters: MAX_FETCH_AGE_MIN.clusters * MS_PER_MINUTE,
    highAedesAreas: MAX_FETCH_AGE_MIN.aedes * MS_PER_MINUTE,
}

const DATASET_LABELS: Record<string, string> = {
    dengueClusters: "Dengue clusters",
    highAedesAreas: "High-Aedes areas",
}

export interface DataFreshness {
    isStale: boolean
    /** Display names of the datasets that are stale or failed. */
    staleDatasets: string[]
    /** ISO time the snapshot was generated, or null if it is missing or invalid. */
    lastUpdated: string | null
    /** True when the app is showing the bundled backup snapshot. */
    isBundledFallback: boolean
}

function datasetLabel(key: string): string {
    const known: string | undefined = DATASET_LABELS[key]
    if (known) return known
    // "someNewDataset" -> "Some New Dataset"
    return key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (first) => first.toUpperCase())
}

function isDatasetStale(
    key: string,
    dataset: { retrievedAt: string, status: DatasetStatus },
    now: number,
): boolean {
    if (dataset.status === DatasetStatus.Stale || dataset.status === DatasetStatus.Failed) return true

    const limit: number | undefined = MAX_AGE_MS[key]
    if (limit === undefined) return false

    const retrieved = Date.parse(dataset.retrievedAt)
    if (Number.isNaN(retrieved)) return true // cannot prove it is fresh
    return now - retrieved > limit
}

export function describeDataFreshness(snapshot: PublicDataSnapshot, now: number = Date.now()): DataFreshness {
    const staleDatasets: string[] = []
    for (const [key, dataset] of Object.entries(snapshot.datasets ?? {})) {
        if (isDatasetStale(key, dataset, now)) staleDatasets.push(datasetLabel(key))
    }

    return {
        isStale: staleDatasets.length > 0,
        staleDatasets,
        lastUpdated: Number.isNaN(Date.parse(snapshot.generatedAt)) ? null : snapshot.generatedAt,
        isBundledFallback: snapshot.isBundledFallback === true,
    }
}

export function formatLastUpdated(iso: string): string {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return iso
    return new Intl.DateTimeFormat("en-SG", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Singapore",
    }).format(date)
}
