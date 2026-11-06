# DengueAhead SG — Requirements Traceability Matrix

**Author:** Huajia (P5)  
**Ticket:** #26 — Traceability Matrix Started  
**Sprint:** Sprint 1 (22–28 October 2026)  
**Last updated:** 7 November 2026  
**Status:** Sprint 1 baseline with final Lab 4 test-ID traceability update (Ticket #26)

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
- Ticket #41 — final black-box and white-box test case inventory (`testing-section-plan.md`)
- PR #51 — GitHub Actions Vitest execution (36 files / 446 tests passed)

### Status Legend

- **Existing** — implementation was observed in the current source code; full integration is not implied.
- **Test exists** — a related automated test file exists; complete use-case coverage is not implied.
- **Pending** — method is a stub, implementation is incomplete, or required integration is not available.
- **Pending merge** — work was reported on another branch but is not available in the reviewed branch.
- **To verify** — linkage, implementation status or coverage needs further confirmation.

## 2. Functional Requirement Traceability

| FR | UC | Dialog State / Interaction | Class.method | Test ID / File | Status |
|---|---|---|---|---|---|
| FR-1.1–FR-1.4 | UC-1 Assess Location Risk | Home / Location Input | `LocationRiskControl.assessLocation()` | LOC-ECP-01–LOC-ECP-08; LOC-BVA-01–LOC-BVA-04 (location-flow cases) | Pending — stub throws `Not implemented` |
| FR-1.2–FR-1.4 | UC-5 Identify Planning Subzone | Location Input → Location Confirmation / correction | `LocationRiskControl.identifyPlanningSubzone()` | LOC-ECP-01–LOC-ECP-08; `SubzoneBoundaryService.test.ts` (related) | Pending — method currently returns `null` |
| FR-1.2–FR-1.4 | UC-5.1 / UC-5.2 | Location validation / subzone resolution | `LocationRiskControl.identifyPlanningSubzone()`; OneMap and boundary services | LOC-ECP-01–LOC-ECP-08; LOC-BVA-01–LOC-BVA-04; `SubzoneBoundaryService.test.ts`; `onemap-search.test.ts` | Partial supporting tests; control integration pending |
| FR-2.1–FR-2.7 | UC-1.2 Generate Risk Assessment | Risk Result | `RiskAssessmentControl.generateAssessment()`; `determineDataConfidence()` | RA-ECP-10–RA-ECP-14; DC-P1–DC-P4; DC-X1; `RiskAssessmentControl.test.ts` | Existing; related tests present |
| FR-2.1–FR-2.7 | UC-1.2 Generate Risk Assessment | Risk Result — factor contributions | `RiskAssessmentControl.calculateContributions()`; five factor calculators | RA-ECP-07–RA-ECP-09; RA-ECP-14; `exposureCalculators.test.ts`; `weatherCalculators.test.ts` | Existing; related tests present |
| FR-2.1–FR-2.7 | UC-1.2 Generate Risk Assessment | Risk Result — risk index and level | `RiskAssessmentControl.calculateRiskIndex()`; `determineRiskLevel()` | RA-ECP-01–RA-ECP-09; RA-BVA-01–RA-BVA-08; `RiskAssessmentControl.test.ts` | Existing; some ECP inputs are design-only |
| FR-2.1–FR-2.7 | UC-1.2 Generate Risk Assessment | Risk Result — contribution levels | `RiskAssessmentControl.determineContributionLevel()` | `RiskAssessmentControl.test.ts` (contribution-level cases; no dedicated final 98-case ID) | Existing; parameterized tests present |
| FR-1.1, FR-3.1–FR-3.4 | UC-2 Explore Risk Map | Risk Map / legend | `RiskMapControl.loadRiskMap()` | MAP-ECP-01–MAP-ECP-03; `RiskMapControl.test.ts`; `RiskMapBoundary.test.tsx` | Existing; related tests present |
| FR-3.1–FR-3.4 | UC-2.2 Search Planning Subzone | Risk Map — search / selection | `RiskMapControl.selectSubzone()`; `getSelectedAssessment()` | MAP-ECP-06; `RiskMapControl.test.ts` | Existing; exact coverage to verify |
| FR-3.1–FR-3.4 | UC-2 Explore Risk Map | Risk Map — selected subzone details | `RiskMapControl.getTopFactors()`; `getTopSubzones()` | MAP-ECP-04–MAP-ECP-05; MAP-ECP-07; MAP-BVA-01–MAP-BVA-02; `RiskMapControl.test.ts`; `RiskMapBoundary.test.tsx` | Existing; exact coverage to verify |
| FR-3.1–FR-3.4 | UC-2.3 / UC-2.4 Overlay Toggles | Risk Map — overlay toggled | `RiskMapControl.updateOverlay()`; `RiskMapBoundary.tsx` | MAP-ECP-08; `RiskMapControl.test.ts`; `RiskMapBoundary.test.tsx` | Related methods/tests exist; final integration to verify |
| FR-1.1, FR-4.1 | UC-3 View Prevention Guidance | Prevention Checklist | `PreventionGuidanceControl.loadChecklist()` | PG-ECP-01–PG-ECP-02; `PreventionGuidanceControl` cases | Pending — stub throws `Not implemented` |
| FR-4.1 | UC-3.1 View Task Details & Source Info | Task Selected / Task Details | `PreventionGuidanceControl.showTaskDetails()` | PG-ECP-03–PG-ECP-04; PG-BVA-01; `PreventionGuidanceControl` cases | Pending — implementation incomplete |
| FR-5.1–FR-5.10 | UC-4 Simulate Risk Scenario | Simulation Setup | `RiskSimulationControl.validateAdjustment()` | SIM-ECP-01–SIM-ECP-08; SIM-BVA-01–SIM-BVA-09 | Pending verification of merged implementation |
| FR-5.1–FR-5.10 | UC-4.1 Recalculate & Compare | Simulation Comparison | `RiskSimulationControl.recalculateScenario()` | SIM-REC-01–SIM-REC-04 | Pending verification of merged implementation |
| FR-5.1–FR-5.10 | UC-4.2 Reset Factors | Simulation Setup / Reset | `RiskSimulationControl.resetScenario()` | RiskSimulationControl tests (resetScenario coverage to verify) | Pending verification of merged implementation |
| FR-1 / FR-2 / FR-3 (related) | UC-1 / UC-2 | Data Unavailable / error handling | `LocationRiskControl.handleUnavailableData()`; `RiskMapControl.handleUnavailableData()` | LOC-ECP-05–LOC-ECP-08; MAP-ECP-02–MAP-ECP-03; `RiskMapControl.test.ts` (related) | Location control pending — stub throws `Not implemented`; map handling requires separate verification |

**Dialog-state note:** State names above are working labels based on the use-case flows and current boundary components. They must be reconciled with the team's latest dialog map before final submission.

**Requirement note:** The FR ranges are taken from the traceability notes in the latest use-case descriptions. Exact individual FR-to-method mappings must be checked against the final SRS.

### 2.1 Final Test IDs from Tickets #37 and #41

The final Lab 4 case IDs use prefixes to distinguish them from the earlier Ticket #25 design IDs. The earlier unprefixed `ECP-xx` and `BVA-xx` identifiers are **not** interchangeable with `RA-ECP-xx` or `RA-BVA-xx`. The full test tables, expected outputs, recorded actual outputs and pass/fail results are maintained in the Lab 4 testing report.

| Area / traced UC | Final test IDs | Count | Coverage |
|---|---|---:|---|
| Risk assessment / UC-1, UC-1.2 | `RA-ECP-01`–`RA-ECP-14`; `RA-BVA-01`–`RA-BVA-08` | 22 | Risk classes, index bounds, calculation, assessment availability and missing factors |
| Risk simulation / UC-4, UC-4.1, UC-4.2 | `SIM-ECP-01`–`SIM-ECP-08`; `SIM-BVA-01`–`SIM-BVA-09`; `SIM-CLAMP-01`–`SIM-CLAMP-04`; `SIM-REC-01`–`SIM-REC-04` | 25 | Adjustment validation, input limits, clamping, recalculation and immutability |
| Location / UC-1, UC-5 | `LOC-ECP-01`–`LOC-ECP-08`; `LOC-BVA-01`–`LOC-BVA-04` | 12 | Postal/address search, invalid/outside locations, unavailable data and input length |
| Risk map / UC-2 | `MAP-ECP-01`–`MAP-ECP-08`; `MAP-BVA-01`–`MAP-BVA-02` | 10 | Map load, empty data, selection, top-10 ranking, factors and overlay |
| Prevention guidance / UC-3 | `PG-ECP-01`–`PG-ECP-04`; `PG-BVA-01` | 5 | Checklist and task detail retrieval |
| Data confidence white-box / UC-1.2 | `DC-P1`–`DC-P4`; `DC-X1` | 5 | Missing/stale dataset decisions and confidence outcomes |
| Personalised tips white-box / UC-1 (related guidance) | `GT-P1`–`GT-P10`; `GT-X1`–`GT-X5`; `GT-LVL-LOW`; `GT-LVL-MODERATE`; `GT-LVL-HIGH`; `GT-LVL-VERY_HIGH` | 19 | Basis paths, deduplication, factor selection and risk-level cases |
| **Total** | | **98** | **98 documented designed cases** |

**Traceability note:** These are case IDs from the Lab 4 test report, not a one-to-one list of Vitest test names. The 446 automated tests are a separate suite. For the original Ticket #25 black-box design IDs (`ECP-01`–`ECP-15`, `BVA-01`–`BVA-14`), refer to `docs/black-box-test-design.md`; this revision uses the final Lab 4 IDs for Ticket #41 traceability. The 98 recorded case results should be independently checked before final sign-off.

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
| #26 | Traceability matrix | UC-1–UC-5 | `lab5/traceability-matrix.md` | Sprint 1 baseline merged; final test-ID update awaiting review |
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

The reviewer confirmed that `testing/tests/` exists at the repository root, not inside `dengue-ahead-sg/`.

The following test records are available: `testing/tests/ticket-13.md`, `testing/tests/ticket-19.md`, `testing/tests/ticket-20.md`, `testing/tests/ticket-22.md`, and `testing/tests/ticket-55.md`.

These records provide additional supporting test documentation. Their exact coverage and relationship to the final Lab 4 test IDs should be verified separately.

### 4.3 Ticket #41 — Final Automated Test Execution

| Field | Recorded result |
|---|---|
| Date | 7 November 2026 (Singapore time; GitHub run on 6 November UTC) |
| Test command | `npm test -- --reporter=verbose` (Vitest) |
| Execution platform | GitHub Actions, PR #51 (`test/vitest-ticket-41`) |
| Test files | **36 passed / 36** |
| Automated tests | **446 passed / 446; 0 failed** |
| Vitest duration | **29.99 seconds** |
| Workflow | `Run Vitest Tests` — successful |
| Review / merge | PR #51 approved and merged into `master` (merge commit `0be82fa`) |
| Additional verification | Reviewer reported 446/446 passing on a clean copy of `master` |

**Evidence:** [PR #51](https://github.com/Feryan123/SC2006-DengueAheadSG/pull/51) and its GitHub Actions run logs. The PR workflow execution occurred before merge; the separate clean-`master` verification is supported by the reviewer comment. This automated result is distinct from the 98 documented Lab 4 manual/design cases.

## 5. Known Gaps and Follow-up Actions

1. **UC numbering:** Latest use-case documentation defines UC-3 as Prevention Guidance and UC-5 as Identify Planning Subzone. Older README or source comments may use different numbering. Confirm through Ticket #3.
2. **Dialog map:** Verify exact screen and transition labels against the team's latest dialog map.
3. **Location control:** `assessLocation()` and `handleUnavailableData()` are stubs; `identifyPlanningSubzone()` currently returns `null`. Recheck after Ticket #14 merges.
4. **Prevention guidance:** `loadChecklist()` and `showTaskDetails()` remain pending implementation.
5. **Simulation:** Recheck Ticket #23's implementation and automated tests after its PR merges; update Ticket #24 integration status separately.
6. **Test coverage:** Final Lab 4 test IDs from Tickets #37/#41 are mapped in Sections 2 and 2.1; confirm actual-output evidence for each of the 98 cases before final sign-off. Automated Vitest execution is separately recorded in Section 4.3.
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
- [x] Final Ticket #37/#41 test IDs mapped to relevant FR/UC rows and documented in Section 2.1.
- [x] No UC-6 rows included.
- [x] Ticket #41 Vitest execution recorded: 36 files, 446 tests passed (PR #51).
- [ ] Exact dialog-state names checked against final dialog map.
- [x] Additional `testing/tests/` records linked in Section 4.2.
- [ ] This final Test ID update reviewed and accepted by at least one other team member.
- [ ] Common documentation folder agreed with the team.
- [ ] Product Owner acceptance and sign-off obtained.

**Important:** Sprint 1 implementation statuses above are a historical baseline from 28 October 2026 and have not been re-audited against the latest master. The final test-ID mapping and Vitest execution evidence were updated on 7 November 2026. Neither test-file existence nor a passing automated suite alone proves every use case is fully implemented.
