# DengueAhead SG — Requirements Traceability Matrix

**Author:** Huajia (P5)  
**Ticket:** #26 — Traceability Matrix Started  
**Sprint:** Sprint 1 (22–28 October 2026)  
**Last updated:** 28 October 2026  
**Status:** Initial draft — revised following peer review

## 1. Purpose

This matrix traces functional requirements (FRs) to use cases (UCs), dialog states, implementation methods and tests. It also records the relevant Sprint 1 backlog items.

This is a living document. An existing class, method or test file does not automatically mean the corresponding use case is fully implemented or tested.

### Sources

- Latest `UseCase_Template.pdf` (confirmed 26 October 2026)
- `DengueAheadSG_Backlog_Checklist`
- Project source files available on the Ticket #26 branch
- Ticket #25 — `docs/black-box-test-design.md`
- Lab 5, Section 3.1.6 — Demonstrating traceability
- Reviewer feedback on Ticket #26

### Status Legend

- **Existing** — implementation was observed in the current source code; full integration is not implied.
- **Test exists** — a related automated test file exists; complete use-case coverage is not implied.
- **Pending** — method is a stub, implementation is incomplete, or required integration is not available.
- **Pending merge** — work was reported on another branch but is not available in the reviewed branch.
- **To verify** — linkage, implementation status or coverage needs further confirmation.

## 2. Functional Requirement Traceability

| FR | UC | Dialog State / Interaction | Class.method | Test ID / File | Status |
|---|---|---|---|---|---|
| FR-1.1–FR-1.4 | UC-1 Assess Location Risk | Home / Location Input | `LocationRiskControl.assessLocation()` | Pending dedicated location-flow test | Pending — stub throws `Not implemented` |
| FR-1.2–FR-1.4 | UC-5 Identify Planning Subzone | Location Input → Location Confirmation / correction | `LocationRiskControl.identifyPlanningSubzone()` | `SubzoneBoundaryService.test.ts` (related) | Pending — method currently returns `null` |
| FR-1.2–FR-1.4 | UC-5.1 / UC-5.2 | Location validation / subzone resolution | `LocationRiskControl.identifyPlanningSubzone()`; OneMap and boundary services | `SubzoneBoundaryService.test.ts`; `onemap-search.test.ts` | Partial supporting tests; control integration pending |
| FR-2.1–FR-2.7 | UC-1.2 Generate Risk Assessment | Risk Result | `RiskAssessmentControl.generateAssessment()`; `determineDataConfidence()` | ECP-05–ECP-12; `RiskAssessmentControl.test.ts` | Existing; related tests present |
| FR-2.1–FR-2.7 | UC-1.2 Generate Risk Assessment | Risk Result — factor contributions | `RiskAssessmentControl.calculateContributions()`; five factor calculators | ECP-09–ECP-10; `exposureCalculators.test.ts`; `weatherCalculators.test.ts` | Existing; related tests present |
| FR-2.1–FR-2.7 | UC-1.2 Generate Risk Assessment | Risk Result — risk index and level | `RiskAssessmentControl.calculateRiskIndex()`; `determineRiskLevel()` | ECP-01–ECP-04; ECP-13–ECP-15; BVA-01–BVA-06; BVA-11–BVA-12; `RiskAssessmentControl.test.ts` | Existing; some ECP inputs are design-only |
| FR-2.1–FR-2.7 | UC-1.2 Generate Risk Assessment | Risk Result — contribution levels | `RiskAssessmentControl.determineContributionLevel()` | BVA-07–BVA-10; BVA-13–BVA-14; `RiskAssessmentControl.test.ts` | Existing; parameterized tests present |
| FR-1.1, FR-3.1–FR-3.4 | UC-2 Explore Risk Map | Risk Map / legend | `RiskMapControl.loadRiskMap()` | `RiskMapControl.test.ts`; `RiskMapBoundary.test.tsx` | Existing; related tests present |
| FR-3.1–FR-3.4 | UC-2.2 Search Planning Subzone | Risk Map — search / selection | `RiskMapControl.selectSubzone()`; `getSelectedAssessment()` | `RiskMapControl.test.ts` | Existing; exact coverage to verify |
| FR-3.1–FR-3.4 | UC-2 Explore Risk Map | Risk Map — selected subzone details | `RiskMapControl.getTopFactors()`; `getTopSubzones()` | `RiskMapControl.test.ts`; `RiskMapBoundary.test.tsx` | Existing; exact coverage to verify |
| FR-3.1–FR-3.4 | UC-2.3 / UC-2.4 Overlay Toggles | Risk Map — overlay toggled | `RiskMapControl.updateOverlay()`; `RiskMapBoundary.tsx` | `RiskMapControl.test.ts`; `RiskMapBoundary.test.tsx` | Related methods/tests exist; final integration to verify |
| FR-1.1, FR-4.1 | UC-3 View Prevention Guidance | Prevention Checklist | `PreventionGuidanceControl.loadChecklist()` | Pending dedicated test | Pending — stub throws `Not implemented` |
| FR-4.1 | UC-3.1 View Task Details & Source Info | Task Selected / Task Details | `PreventionGuidanceControl.showTaskDetails()` | Pending dedicated test | Pending — implementation incomplete |
| FR-5.1–FR-5.10 | UC-4 Simulate Risk Scenario | Simulation Setup | `RiskSimulationControl.validateAdjustment()` | Ticket #23 tests / merge to verify | Pending verification of merged implementation |
| FR-5.1–FR-5.10 | UC-4.1 Recalculate & Compare | Simulation Comparison | `RiskSimulationControl.recalculateScenario()` | Ticket #23 tests / merge to verify | Pending verification of merged implementation |
| FR-5.1–FR-5.10 | UC-4.2 Reset Factors | Simulation Setup / Reset | `RiskSimulationControl.resetScenario()` | Ticket #23 tests / merge to verify | Pending verification of merged implementation |
| FR-1 / FR-2 / FR-3 (related) | UC-1 / UC-2 | Data Unavailable / error handling | `LocationRiskControl.handleUnavailableData()`; `RiskMapControl.handleUnavailableData()` | `RiskMapControl.test.ts` (related) | Location control pending — stub throws `Not implemented`; map handling requires separate verification |

**Dialog-state note:** State names above are working labels based on the use-case flows and current boundary components. They must be reconciled with the team's latest dialog map before final submission.

**Requirement note:** The FR ranges are taken from the traceability notes in the latest use-case descriptions. Exact individual FR-to-method mappings must be checked against the final SRS.

### 2.1 FR-2 Risk Assessment Test References

Ticket #25 provides the following black-box test design IDs:

| Test IDs | Coverage Area | Implementation / Test Reference |
|---|---|---|
| ECP-01–ECP-04 | Valid risk classification classes | `determineRiskLevel()`; `RiskAssessmentControl.test.ts` |
| ECP-05–ECP-08 | Assessment generation, unknown subzone and missing core data | `generateAssessment()`; `RiskAssessmentControl.test.ts` |
| ECP-09–ECP-12 | Missing factors, confidence and stale datasets | `generateAssessment()`; `determineDataConfidence()`; `RiskAssessmentControl.test.ts` |
| ECP-13–ECP-14 | Out-of-range classification inputs | `determineRiskLevel()`; documented design cases, not separately automated |
| ECP-15 | Risk index clamping above 100 | `calculateRiskIndex()`; `RiskAssessmentControl.test.ts` |
| BVA-01–BVA-06 | Risk level thresholds | `determineRiskLevel()`; parameterized tests |
| BVA-07–BVA-10 | Contribution level thresholds | `determineContributionLevel()`; parameterized tests |
| BVA-11–BVA-12 | Risk index range edges: 0 and 100 | `determineRiskLevel()`; parameterized tests |
| BVA-13–BVA-14 | Factor score range edges: 0 and 100 | `determineContributionLevel()`; parameterized tests |

**Coverage note:** These IDs refer to test design cases, not necessarily individual automated test names. The detailed Test ID-to-test-name mapping is maintained in Ticket #25. The exact inputs for ECP-01, ECP-02 and ECP-04 are not separately automated.

### 2.2 Risk Factor Calculators and Supporting Tests

The risk model includes five factor types:

| Factor | Supporting Implementation / Tests |
|---|---|
| Dengue Clusters | `src/control/calculators/`; `exposureCalculators.test.ts`; `percentileScore.test.ts` |
| High-Aedes Area | `src/control/calculators/`; `exposureCalculators.test.ts`; `percentileScore.test.ts` |
| Population Density | `src/control/calculators/`; `exposureCalculators.test.ts`; `percentileScore.test.ts` |
| Humidity | `src/control/calculators/`; `weatherCalculators.test.ts`; `anomalyScore.test.ts` |
| Lagged Rainfall | `src/control/calculators/`; `weatherCalculators.test.ts`; `anomalyScore.test.ts` |

The four calculator test files are present in the reviewed branch. Their existence supports factor-level traceability but does not independently prove complete UC-1 coverage.

## 3. Sprint 1 Backlog Coverage

Every Sprint 1 backlog item is recorded below, including user stories, supporting tasks, documentation and process items.

| Ticket | Backlog Item | Related UC / FR | Implementation or Evidence | Traceability Status |
|---|---|---|---|---|
| #1 | Sprint 1 planning | Cross-cutting | Notion planning decisions | Process evidence |
| #2 | Verify datasets | Public Data / UC-1 | Dataset verification checklist | Supporting evidence |
| #3 | Confirm UC numbering and reservoirs | UC-1–UC-5 | TA clarification | Pending confirmation |
| #4 | Shared contracts and risk model configuration | UC-1 / FR-2 | `riskModelConfig.ts`, entity contracts | Existing |
| #5 | Cluster, density and Aedes calculators | UC-1 / FR-2 | `src/control/calculators/`; `percentileScore.test.ts`; `exposureCalculators.test.ts` | Existing; tests present |
| #6 | Humidity and rainfall calculators | UC-1 / FR-2 | `src/control/calculators/`; `anomalyScore.test.ts`; `weatherCalculators.test.ts` | Existing; tests present |
| #7 | RiskAssessmentControl | UC-1 / FR-2 | `generateAssessment()`, `calculateRiskIndex()`, `assessAll()`; `RiskAssessmentControl.test.ts` | Existing; tests present |
| #8 | Start-up wiring | UC-1–UC-4 | Start-up class / application wiring | Pending verification |
| #9 | Mock snapshot with real subzone IDs | Public Data / UC-1–UC-2 | `MockPublicDataService.ts` | PR #21 under review; merge to verify |
| #10 | DataGovSgAdapter | Public Data / UC-1 | `src/services/DataGovSgAdapter.ts`; `scripts/sync-data.ts` | Existing; hourly sync integration reported by reviewer |
| #11 | Static census, boundaries and baselines | Public Data / UC-1 | `data/derived/`, build scripts | Supporting evidence |
| #12 | Hourly sync job | Public Data / UC-1 | `scripts/sync-data.ts`; `scripts/sync-data.test.ts` | Existing; test file present |
| #13 | Cached service and fallback | Public Data / UC-1–UC-2 | `CachedPublicDataServiceProxy.test.ts` | Test file present |
| #14 | OneMapAdapter and LocationRiskControl | UC-1 / UC-5 / FR-1 | `LocationRiskControl.assessLocation()`, `identifyPlanningSubzone()` | Current branch has stubs; teammate implementation pending merge |
| #15 | HomePageBoundary wiring | UC-1 / FR-1 | `HomePageBoundary.tsx` | Integration to verify |
| #16 | Prevention tip content | UC-3 / FR-4 | Prevention guidance content | Content to verify |
| #17 | Personalised tips | UC-1 / FR-2; related guidance | Tip generation implementation | To verify; separate from public UC-3 checklist |
| #18 | RiskResultBoundary redesign | UC-1 / FR-2 | `RiskResultBoundary.tsx` | UI integration to verify |
| #19 | App screen wiring | UC-1–UC-4 | `App.tsx`; `App.test.tsx` | Test file present |
| #20 | Leaflet risk map | UC-2 / FR-3 | `RiskMapBoundary.tsx`; `riskLevelStyle.ts` | Existing files |
| #21 | Map overlay toggles | UC-2.3 / UC-2.4 / FR-3 | `RiskMapControl.updateOverlay()`; `RiskMapBoundary.tsx` | PR under review; merge to verify |
| #22 | Subzone popup and top-10 list | UC-2 / FR-3 | `SubzonePopup.ts`; `RiskMapControl.getTopSubzones()` | Existing files/method |
| #23 | RiskSimulationControl | UC-4 / FR-5 | `RiskSimulationControl.ts` | PR under review; merged implementation to verify |
| #24 | SimulationBoundary update | UC-4 / FR-5 | `SimulationBoundary.tsx` | Pending verification |
| #25 | Black-box test design | UC-1 / FR-2 | `docs/black-box-test-design.md` | PR #22 updated; under review |
| #26 | Traceability matrix | UC-1–UC-5 | `lab5/traceability-matrix.md` | In review — changes requested |
| #27 | Integration and internal demo | UC-1–UC-4 | Integrated application and demo evidence | Pending |
| #28 | Sprint review and retrospective | Cross-cutting | Notion meeting notes | Pending |
| #53 | Architecture diagram draft | Public Data / cross-cutting | Architecture diagram | Review pending |
| #54 | Pipeline handover | Public Data / UC-1 | Runbook and walkthrough | Pending verification |
| #55 | OneMap token proxy | UC-1 / UC-5 / FR-1 | Serverless token proxy | Implementation and test records to verify |

### Sprint 1 Story-Specific Coverage

The following Sprint 1 items are explicitly treated as user stories in the backlog or provide user-facing behaviour:

- **#5, #6, #7:** Risk factor scoring and confidence — UC-1.
- **#12, #13:** Fresh public data and fallback availability — supporting UC-1 and UC-2.
- **#14, #15:** Address/postal-code assessment flow — UC-1 and UC-5.
- **#17, #18:** Risk result and personalised guidance — UC-1.
- **#20, #21, #22:** Risk map, overlays and subzone information — UC-2.
- **#23, #24:** Hypothetical risk simulation — UC-4.

All 31 Sprint 1 backlog items are represented in the coverage table. The final reviewer should confirm which entries are formally classified as Stories in Notion.

## 4. Test Evidence and Records

### 4.1 Automated Test Files Confirmed in the Reviewed Branch

| Area | Test File |
|---|---|
| Risk assessment | `src/control/RiskAssessmentControl.test.ts` |
| Risk map control | `src/control/RiskMapControl.test.ts` |
| Risk map boundary | `src/boundary/RiskMapBoundary.test.tsx` |
| Risk model configuration | `src/control/riskModelConfig.test.ts` |
| Exposure calculators | `src/control/calculators/exposureCalculators.test.ts` |
| Percentile scoring | `src/control/calculators/percentileScore.test.ts` |
| Weather calculators | `src/control/calculators/weatherCalculators.test.ts` |
| Anomaly scoring | `src/control/calculators/anomalyScore.test.ts` |
| Cached public data service | `src/services/CachedPublicDataServiceProxy.test.ts` |
| Planning subzone boundary service | `src/services/SubzoneBoundaryService.test.ts` |
| Turf geometry | `src/services/turf.test.ts` |
| OneMap search | `tests/onemap-search.test.ts` |
| App screen wiring | `src/App.test.tsx` |
| Data sync | `scripts/sync-data.test.ts` |
| Baselines | `scripts/lib/baselines.test.ts` |
| Census | `scripts/lib/census.test.ts` |
| Subzone output | `scripts/lib/subzone.output.test.ts` |

### 4.2 Additional Testing Records to Reconcile

The reviewer identified test documentation associated with Tickets #13, #19, #20, #22 and #55 under `testing/tests/`.

However, the `testing/tests/` directory was not found in the reviewed Ticket #26 branch, and no files under that path appeared in the tracked-file listing.

These records should be linked when their exact paths and merge status are confirmed. They are not presented here as verified local files.

## 5. Known Gaps and Follow-up Actions

1. **UC numbering:** Latest use-case documentation defines UC-3 as Prevention Guidance and UC-5 as Identify Planning Subzone. Older README or source comments may use different numbering. Confirm through Ticket #3.
2. **Dialog map:** Verify exact screen and transition labels against the team's latest dialog map.
3. **Location control:** `assessLocation()` and `handleUnavailableData()` are stubs; `identifyPlanningSubzone()` currently returns `null`. Recheck after Ticket #14 merges.
4. **Prevention guidance:** `loadChecklist()` and `showTaskDetails()` remain pending implementation.
5. **Simulation:** Recheck Ticket #23's implementation and automated tests after its PR merges; update Ticket #24 integration status separately.
6. **Test coverage:** Ticket #25 IDs now provide more detailed FR-2 traceability. Some ECP cases remain design-only. Additional test records under `testing/tests/` still need to be located and linked.
7. **Public data:** Data retrieval and refresh support UC-1 and UC-2 rather than forming a separately numbered use case in the current UC-1–UC-5 descriptions.
8. **Prevention scope:** UC-3 describes a public bundled prevention checklist. Personalised tips in Ticket #17 must be traced separately.
9. **Pending PRs:** Recheck after Ticket #9, #14, #21, #23 and #25 changes merge into `master`.
10. **Documentation folders:** `docs/`, `lab5/` and `testing/tests/` are referenced across team documentation. Agree on a common structure before moving files.
11. **Final SRS:** Validate each individual FR identifier against the final SRS and replace range-level mappings where needed.

## 6. Lab 5 Demonstration Trace Examples

### Example A — UC-1 Assess Location Risk

FR-1 / FR-2 → UC-1 and UC-5 → Home / Location Input → `LocationRiskControl.assessLocation()` → `RiskAssessmentControl.generateAssessment()` → Risk Result → `RiskAssessmentControl.test.ts`.

Demonstrate a valid location, resulting risk level and factors, and a related test after the location control is implemented and integrated. The current `assessLocation()` stub cannot demonstrate the full flow.

### Example B — UC-2 Explore Risk Map

FR-3 → UC-2 → Risk Map → `RiskMapControl.loadRiskMap()` → `RiskMapBoundary.tsx` → `RiskMapControl.test.ts` / `RiskMapBoundary.test.tsx`.

Demonstrate selecting a subzone and, once the overlay feature is merged, toggling an available overlay.

## 7. Review and Definition of Done

- [x] Initial FR / UC / dialog state / class.method / test mapping drafted.
- [x] All 31 Sprint 1 backlog items included.
- [x] Author identified.
- [x] Existing calculator tests and DataGovSgAdapter recorded.
- [x] Pending location and prevention stubs identified.
- [x] Ticket #25 ECP/BVA test IDs linked to FR-2.
- [ ] Exact dialog-state names checked against final dialog map.
- [ ] Additional `testing/tests/` records linked after their paths are confirmed.
- [ ] Reviewed and accepted by at least one other team member.
- [ ] Common documentation folder agreed with the team.
- [ ] Product Owner acceptance and sign-off obtained.

**Important:** This is an initial traceability matrix, not a declaration that every use case or Sprint 1 story is finished.