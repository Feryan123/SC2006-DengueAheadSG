/**
 * Traces to: RiskResultBoundary, RiskMapBoundary (data freshness shown to visitors)
 * Related use case(s): UC-1 Assess Location Risk, UC-2 Explore Risk Map · Backlog #30
 *
 * IMPLEMENTS:
 * - Stale-data banner: shown when any dataset in the snapshot is stale or failed.
 * - "Last updated" line: shown whenever the snapshot has a valid time.
 * - Compact dashboard: put the date beside the totals and expand warning details on request.
 *
 * When the bundled backup snapshot is in use, BundledFallbackNotice (#58) already warns the visitor,
 * so this component only adds the "Last updated" line and skips the banner (no double warning).
 */

import type { PublicDataSnapshot } from "../services/ApprovedPublicDataServiceBoundary.ts"
import { describeDataFreshness, formatLastUpdated } from "../control/dataFreshness.ts"

type Props = {
    snapshot?: PublicDataSnapshot | null
    /** Only for tests: the time to compare against. */
    now?: number
    compact?: boolean
}

export default function DataFreshnessNotice({ snapshot, now, compact = false }: Props) {
    if (!snapshot) return null

    const freshness = describeDataFreshness(snapshot, now)
    const showBanner = freshness.isStale && !freshness.isBundledFallback

    return (
        <>
            {showBanner && (compact ? (
                <details className="notice freshness-details">
                    <summary>Some source data may be out of date. <span>Details</span></summary>
                    <p>
                        {freshness.staleDatasets.join(", ")}.
                        {" "}Risk levels may not show the latest situation.
                    </p>
                </details>
            ) : (
                <p className="notice">
                    Some data may be out of date: {freshness.staleDatasets.join(", ")}.
                    {" "}Risk levels may not show the latest situation.
                </p>
            ))}
            {freshness.lastUpdated && (
                <p className={compact ? "snapshot-updated" : "muted small"}>
                    {compact ? "Data updated: " : "Last updated: "}
                    <time dateTime={freshness.lastUpdated}>{formatLastUpdated(freshness.lastUpdated)}</time> SGT
                </p>
            )}
        </>
    )
}
