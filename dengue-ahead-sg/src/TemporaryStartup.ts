/**
 * TEMPORARY start-up helper, until P5's start-up class (#8) exists.
 * Builds the LocationRiskControl with its real dependencies. There is no default data
 * source: the caller supplies one (the real snapshot service once #8 and snapshot hosting land).
 * Delete this file when #8 lands.
 *
 * Traces to: LocationRiskControl, ApprovedPublicDataServiceBoundary, RiskAssessmentControl
 * Related use case(s): UC-1 Assess Location Risk
 */

import { LocationRiskControl } from "./control/LocationRiskControl.ts"
import { RiskAssessmentControl } from "./control/RiskAssessmentControl.ts"
import type { ApprovedPublicDataServiceBoundary } from "./services/ApprovedPublicDataServiceBoundary.ts"

export function createTemporaryLocationControl(
    publicData: ApprovedPublicDataServiceBoundary
): LocationRiskControl {
    return new LocationRiskControl(publicData, new RiskAssessmentControl())
}