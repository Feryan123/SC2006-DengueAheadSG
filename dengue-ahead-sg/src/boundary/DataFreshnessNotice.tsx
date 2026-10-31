/**
 * Traces to: RiskResultBoundary, RiskMapBoundary (data freshness shown to visitors)
 * Related use case(s): UC-1 Assess Location Risk, UC-2 Explore Risk Map · Backlog #30
 *
 * IMPLEMENTS:
 * - Stale-data banner: shown when any dataset in the snapshot is stale or failed.
 * - "Last updated" line: shown whenever the snapshot has a valid time.
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
}

export default function DataFreshnessNotice({ snapshot, now }: Props) {
    if (!snapshot) return null

    const freshness = describeDataFreshness(snapshot, now)
    const showBanner = freshness.isStale && !freshness.isBundledFallback

    return (
        <>
            {showBanner && (
                <p className="notice">
                    Some data may be out of date: {freshness.staleDatasets.join(", ")}.
                    {" "}Risk levels may not show the latest situation.
                </p>
            )}
            {freshness.lastUpdated && (
                <p className="muted small">
                    Last updated: <time dateTime={freshness.lastUpdated}>{formatLastUpdated(freshness.lastUpdated)}</time>
                </p>
            )}
        </>
    )
}
