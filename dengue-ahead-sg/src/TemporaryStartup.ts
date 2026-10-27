/**
 * TEMPORARY start-up wiring for #15, until P5's start-up class (#8) exists.
 * Builds the LocationRiskControl with its real dependencies in one place.
 * Delete this file when #8 lands and let the start-up class build the controls.
 *
 * Traces to: LocationRiskControl, ApprovedPublicDataServiceBoundary, RiskAssessmentControl
 * Related use case(s): UC-1 Assess Location Risk
 */

import { LocationRiskControl } from "./control/LocationRiskControl.ts"
import { RiskAssessmentControl } from "./control/RiskAssessmentControl.ts"
import type { ApprovedPublicDataServiceBoundary } from "./services/ApprovedPublicDataServiceBoundary.ts"
import { MockPublicDataService } from "./services/mocks/MockPublicDataService.ts"

// publicData defaults to the mock snapshot (#9). Swap in the cached data service (#13)
// when ready, e.g. createTemporaryLocationControl(new CachedPublicDataServiceProxy(...)).
export function createTemporaryLocationControl(
    publicData: ApprovedPublicDataServiceBoundary = new MockPublicDataService()
): LocationRiskControl {
    return new LocationRiskControl(publicData, new RiskAssessmentControl())
}
