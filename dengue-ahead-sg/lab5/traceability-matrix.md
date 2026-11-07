# DengueAhead SG — Requirements Traceability Matrix

**Author:** Huajia (P5); final update with Feryan (P1)  
**Ticket:** #26 — Traceability Matrix  
**Last updated:** 7 November 2026  
**Status:** Final. Statuses re-checked against `master` on 7 November 2026; FR IDs follow SRS v1.1; dialog states follow the dialog map (#44).

## 1. Purpose

This matrix traces each functional requirement (FR) and key non-functional requirement (NFR) in the SRS to its use case (UC), the dashboard part (dialog state) where it appears, the class and method that implement it, and the tests that check it. It also records every Sprint 1 backlog item and the Sprint 2 code items.

Read each row as: **FR → UC → dialog state → class.method → test**.

### Sources

- SRS v1.1 (FR-n.m numbering: FR-n belongs to UC-n)
- Use case model UC-1 to UC-5 (UC-6 was removed on 4 November 2026; the data refresh is covered by NFR-REL and NFR-FRS)
- `DengueAheadSG_Backlog_Checklist`
- Ticket #25 — `docs/black-box-test-design.md` (original black-box IDs)
- Ticket #37 — `lab4/testing/test-design.md` (final black-box and white-box cases, with actual outputs)
- Ticket #34 — `lab4/testing/ticket-34.md` (failure-mode cases, with actual outputs)
- Ticket #41 — GitHub Actions run of the full Vitest suite (PR #51)
- Lab 5, Section 3.1.6 — Demonstrating traceability

### Status Legend

- **Implemented; tested** — the behaviour exists on `master` and is covered by automated tests and/or the Lab 4 test cases listed in the row.
- **Implemented; manual check** — the behaviour exists on `master` and was checked by hand (recorded in `testing/tests/`), not by an automated test.
- **Known limitation** — the behaviour differs from the ideal in a recorded way; see Section 5.

### Dialog states

The application is a single dashboard. The dialog states are those of the team's dialog map (#44). The table shows which dashboard parts in SRS §3.1 each state displays.

| Dialog map state | SRS §3.1 dashboard parts |
|---|---|
| Dashboard — No Area Selected | Dashboard Overview, Location Search, Risk Map, Prevention Guidance (general tips), Footer |
| Dashboard — Area Selected | Area Result (with personalised prevention guidance), "How is this calculated?" Popup |
| Dashboard — Invalid Location | Messages (location error) |
| Risk Assessment Unavailable | Messages (data unavailable) |
| Risk Map Unavailable | Messages (data unavailable) |
| Full NEA Checklist — Expanded | Prevention Guidance (full checklist) |
| Simulate Risk Scenario — Setup | Simulate Risk Panel |
| Simulate Risk Scenario — Comparison | Simulate Risk Panel |
| Simulation Validation Error | Simulate Risk Panel (input error) |

Transition names from the dialog map are given in brackets, for example *(searchOrSelectArea)*.

## 2. Functional Requirement Traceability

All paths are relative to `dengue-ahead-sg/` unless stated otherwise.

### 2.1 UC-1 Assess Location Risk and UC-5 Identify Planning Subzone

| FR | UC | Dialog state | Class.method | Test ID / File | Status |
|---|---|---|---|---|---|
| FR-1.1, FR-1.2 | UC-1 | Dashboard — No Area Selected → Dashboard — Area Selected *(searchOrSelectArea)* / Dashboard — Invalid Location *(submitQuery [invalid location])* | `LocationRiskControl.assessLocation()` | LOC-ECP-01–LOC-ECP-04; LOC-BVA-01–LOC-BVA-04; `src/control/LocationRiskControl.test.ts` | Implemented; tested |
| FR-5.1 | UC-5 | Dashboard — No Area Selected → Dashboard — Area Selected *(searchOrSelectArea)* | `RiskMapBoundary` search (subzone-name match before geocoding) | `src/App.test.tsx` ("searches local subzone names without calling the address service"); `testing/tests/ui-dashboard.md` | Implemented; tested |
| FR-5.2, FR-5.3, FR-5.6 | UC-5 (UC-5.1) | Dashboard — No Area Selected → Dashboard — Area Selected / Dashboard — Invalid Location (search service unavailable: see Section 5, item 9) | `GeocodingMapServiceBoundary.geocodeLocation()`; `api/onemap-search.ts` | LOC-ECP-05; `tests/onemap-search.test.ts` | Implemented; tested |
| FR-5.4, FR-5.5 | UC-5 (UC-5.2) | Dashboard — No Area Selected → Dashboard — Area Selected / Dashboard — Invalid Location | `LocationRiskControl.identifyPlanningSubzone()` | LOC-ECP-01–LOC-ECP-04; LOC-ECP-06; `src/control/LocationRiskControl.test.ts`; `src/services/SubzoneBoundaryService.test.ts` | Implemented; tested |
| FR-1.3, FR-1.8, FR-1.9 | UC-1 (UC-1.2) | Dashboard — Area Selected; Risk Assessment Unavailable *(selectArea [assessment unavailable])* | `RiskAssessmentControl.generateAssessment()`; `determineDataConfidence()` | RA-ECP-10–RA-ECP-13; DC-P1–DC-P4; DC-X1; DC-X2; `src/control/RiskAssessmentControl.test.ts` | Implemented; tested (DC-X2: known limitation) |
| FR-1.4, FR-1.7 | UC-1 (UC-1.2) | Dashboard — Area Selected (factor breakdown) | `RiskAssessmentControl.calculateContributions()`; the five `RiskFactorCalculator` classes | RA-ECP-14; FM-RW-01–FM-RW-08; `src/control/calculators/exposureCalculators.test.ts`; `src/control/calculators/weatherCalculators.test.ts` | Implemented; tested |
| FR-1.4, FR-1.5 | UC-1 (UC-1.2) | Dashboard — Area Selected (risk index and level) | `RiskAssessmentControl.calculateRiskIndex()`; `determineRiskLevel()` | RA-ECP-01–RA-ECP-09; RA-BVA-01–RA-BVA-08; `src/control/RiskAssessmentControl.test.ts` | Implemented; tested |
| FR-1.6 | UC-1 (UC-1.2) | Dashboard — Area Selected (factor breakdown) | `RiskAssessmentControl.determineContributionLevel()` | `src/control/RiskAssessmentControl.test.ts` (bands 34 / 67) | Implemented; tested |
| FR-1.10, FR-1.11 | UC-1 | Dashboard — Area Selected; Dashboard — No Area Selected (footer) | `RiskResultBoundary`; `RiskFactorBreakdown` (factors sorted largest first) | `src/boundary/RiskResultBoundary.test.tsx`; `src/App.test.tsx` | Implemented; tested |
| FR-1.12 | UC-1 → UC-3, UC-4 | Dashboard — Area Selected → Simulate Risk Scenario — Setup *(openSimulation)* / Full NEA Checklist — Expanded *(expandFullChecklist)* | `App` (selection state); `SelectedAreaPreview` | `src/App.test.tsx` | Implemented; tested |
| FR-1.9, FR-5.5, FR-5.6 | UC-1, UC-5 | Dashboard — Invalid Location; Risk Assessment Unavailable | `LocationRiskControl.handleUnavailableData()` | LOC-ECP-03–LOC-ECP-08; `src/control/LocationRiskControl.test.ts` | Implemented; tested |

### 2.2 UC-2 Explore Risk Map

| FR | UC | Dialog state | Class.method | Test ID / File | Status |
|---|---|---|---|---|---|
| FR-2.1, FR-2.2, FR-2.7, FR-2.9 | UC-2 (UC-2.1) | Dashboard — No Area Selected | `RiskMapControl.loadRiskMap()`; `RiskMapBoundary` | MAP-ECP-01–MAP-ECP-03; `src/control/RiskMapControl.test.ts`; `src/boundary/RiskMapBoundary.test.tsx` | Implemented; tested |
| FR-2.5, FR-2.6 | UC-2 (UC-2.2) | Dashboard — No Area Selected → Dashboard — Area Selected *(searchOrSelectArea)*; Dashboard — Area Selected *(searchOrSelectArea / updateSelectedArea)* | `RiskMapControl.selectSubzone()`; `getSelectedAssessment()`; `RiskMapBoundary` (tooltip and selection) | MAP-ECP-06; `src/control/RiskMapControl.test.ts`; `src/boundary/RiskMapBoundary.test.tsx` | Implemented; tested |
| FR-2.8 | UC-2 | Dashboard — No Area Selected; Dashboard — Area Selected | `RiskMapBoundary` (Leaflet pan/zoom and clean-up) | `src/boundary/RiskMapUnmount.test.tsx`; manual browser check (Ticket #59: 0/20 errors) | Implemented; tested |
| FR-2.3, FR-2.4 | UC-2 (UC-2.3, UC-2.4) | Dashboard — No Area Selected; Dashboard — Area Selected *(toggleOverlay [available] / updateMap)* | `RiskMapControl.updateOverlay()`; `RiskMapBoundary` | MAP-ECP-08; `src/control/RiskMapControl.test.ts`; `src/boundary/RiskMapBoundary.test.tsx` | Implemented; tested |
| — (supports UC-2; no SRS FR) | UC-2 | Dashboard — No Area Selected (highest-risk list); Dashboard — Area Selected (top factors) | `RiskMapControl.getTopSubzones()`; `getTopFactors()` | MAP-ECP-04; MAP-ECP-05; MAP-ECP-07; MAP-BVA-01–MAP-BVA-02; `src/control/RiskMapControl.test.ts` | Implemented; tested |
| FR-1.9 | UC-2 | Risk Map Unavailable *(loadRiskMap [data unavailable])* | `RiskMapControl.handleUnavailableData()` | MAP-ECP-02–MAP-ECP-03; `src/control/RiskMapControl.test.ts` | Implemented; tested |

### 2.3 UC-3 View Prevention Guidance

| FR | UC | Dialog state | Class.method | Test ID / File | Status |
|---|---|---|---|---|---|
| FR-3.1, FR-3.2, FR-3.5, FR-3.6 | UC-3 | Dashboard — Area Selected (personalised prevention recommendations) | `PreventionGuidanceControl.generateTips()` | GT-P1–GT-P10; GT-X1–GT-X5; GT-LVL-LOW, GT-LVL-MODERATE, GT-LVL-HIGH, GT-LVL-VERY_HIGH; `src/control/PreventionGuidanceControl.generatetips.test.ts`; `src/control/PreventionTasksContent.test.ts` | Implemented; tested |
| FR-3.3, FR-3.4, FR-3.7 | UC-3 | Dashboard — No Area Selected (general NEA guidance); Full NEA Checklist — Expanded | `PreventionGuidanceControl.loadChecklist()`; `PreventionGuidanceBoundary` | PG-ECP-01–PG-ECP-02; `src/control/PreventionGuidanceControl.test.ts`; `src/boundary/PreventionGuidanceBoundary.test.tsx` | Implemented; tested |
| FR-3.4 | UC-3 (UC-3.1) | Full NEA Checklist — Expanded *(selectTask / displayTaskDetails)* | `PreventionGuidanceControl.showTaskDetails()` | PG-ECP-03–PG-ECP-04; PG-BVA-01; `src/control/PreventionGuidanceControl.test.ts` | Implemented; tested |

### 2.4 UC-4 Simulate Risk Scenario

| FR | UC | Dialog state | Class.method | Test ID / File | Status |
|---|---|---|---|---|---|
| FR-4.2, FR-4.3, FR-4.4 | UC-4 | Simulate Risk Scenario — Setup → Comparison *(changeFactor [valid])* / Simulation Validation Error *(changeFactor [invalid])* | `RiskSimulationControl.validateAdjustment()` | SIM-ECP-01–SIM-ECP-08; SIM-BVA-01–SIM-BVA-09; `src/control/RiskSimulationControl.test.ts` | Implemented; tested |
| FR-4.1, FR-4.5, FR-4.6, FR-4.8, FR-4.9 | UC-4 (UC-4.1) | Simulate Risk Scenario — Comparison | `RiskSimulationControl.recalculateScenario()`; `adjustedValue()`; `SimulationBoundary` | SIM-REC-01–SIM-REC-04; SIM-CLAMP-01–SIM-CLAMP-04; `src/control/RiskSimulationControl.test.ts`; `src/boundary/SimulationBoundary.test.tsx` | Implemented; tested |
| FR-4.7 | UC-4 (UC-4.2) | Simulate Risk Scenario — Comparison → Setup *(reset)* | `RiskSimulationControl.resetScenario()`; `SimulationBoundary` reset | `src/control/RiskSimulationControl.test.ts`; `src/boundary/SimulationBoundary.test.tsx` | Implemented; tested |

### 2.5 Key non-functional requirements

| NFR | Supports | Dialog state | Class / file | Test ID / File | Status |
|---|---|---|---|---|---|
| NFR-REL.1, NFR-REL.2 | UC-1, UC-2 | Dashboard — No Area Selected; Dashboard — Area Selected (backup notice; see Section 5, item 8) | `CachedPublicDataServiceProxy`; `BundledFallbackNotice`; `Startup.ts` | FM-E2E-01–FM-E2E-03; FM-REC-01; FM-VAL-01–FM-VAL-02; `src/services/CachedPublicDataServiceProxy.test.ts`; `src/services/Datapipelinefailuremodes.test.ts`; `src/Startup.fallback.test.tsx`; `testing/tests/ticket-13.md`, `ticket-58.md` | Implemented; tested |
| NFR-FRS.2, NFR-SAF.2 | UC-1, UC-2 | Dashboard — No Area Selected; Dashboard — Area Selected (stale-data notice; see Section 5, item 8) | `dataFreshness.ts`; `DataFreshnessNotice` | `src/control/dataFreshness.test.ts`; `src/boundary/DataFreshnessNotice.test.tsx` | Implemented; tested (45-day Aedes rule: known limitation) |
| NFR-FRS.1, NFR-FRS.4 | UC-1, UC-2 | — | `.github/workflows/sync-data.yml`; `scripts/sync-data.ts` | `scripts/sync-data.test.ts` | Implemented; tested (schedule reliability: known limitation) |
| NFR-SEC.3 | UC-1, UC-5 | — | `api/snapshot.ts`; `api/onemap-search.ts` | `tests/snapshot.test.ts`; `tests/onemap-search.test.ts`; `testing/tests/ticket-55.md` | Implemented; tested |
| NFR-ACC.1, NFR-USA.2 | All UCs | All states | Boundary components; `style.css` | `testing/tests/ticket-32.md`; `testing/tests/ui-dashboard.md` | Implemented; manual check |
| NFR-MNT.1 | UC-1, UC-4 | — | `src/control/riskModelConfig.ts` | `src/control/riskModelConfig.test.ts`; `scripts/lib/weightSchemes.test.ts` | Implemented; tested |

### 2.6 Final Lab 4 test case IDs

The prefixed IDs come from Ticket #37 (`lab4/testing/test-design.md`) and Ticket #34 (`lab4/testing/ticket-34.md`). They are not the same as the original Ticket #25 IDs (`ECP-xx`, `BVA-xx` in `docs/black-box-test-design.md`); `test-design.md` gives the cross-reference.

| Area / traced UC | Test IDs | Count | Passed | Source |
|---|---|---:|---:|---|
| Risk assessment / UC-1 | `RA-ECP-01`–`RA-ECP-14`; `RA-BVA-01`–`RA-BVA-08` | 22 | 22 | test-design.md |
| Risk simulation / UC-4 | `SIM-ECP-01`–`SIM-ECP-08`; `SIM-BVA-01`–`SIM-BVA-09`; `SIM-CLAMP-01`–`SIM-CLAMP-04`; `SIM-REC-01`–`SIM-REC-04` | 25 | 25 | test-design.md |
| Location search / UC-1, UC-5 | `LOC-ECP-01`–`LOC-ECP-08`; `LOC-BVA-01`–`LOC-BVA-04` | 12 | 12 | test-design.md |
| Risk map / UC-2 | `MAP-ECP-01`–`MAP-ECP-08`; `MAP-BVA-01`–`MAP-BVA-02` | 10 | 10 | test-design.md |
| Prevention checklist / UC-3 | `PG-ECP-01`–`PG-ECP-04`; `PG-BVA-01` | 5 | 5 | test-design.md |
| Data confidence, white-box / UC-1 | `DC-P1`–`DC-P4`; `DC-X1`; `DC-X2` | 6 | 5 | test-design.md (DC-X2 records a known limitation) |
| Personalised tips, white-box / UC-3 | `GT-P1`–`GT-P10`; `GT-X1`–`GT-X5`; `GT-LVL-LOW`, `GT-LVL-MODERATE`, `GT-LVL-HIGH`, `GT-LVL-VERY_HIGH` | 19 | 19 | test-design.md |
| **Subtotal (Ticket #37)** | | **99** | **98** | |
| Data pipeline failure modes / NFR-REL | `FM-FB-01`–`FM-FB-07`; `FM-E2E-01`–`FM-E2E-03`; `FM-REC-01`; `FM-VAL-01`–`FM-VAL-02`; `FM-RW-01`–`FM-RW-08` | 21 | 21 | ticket-34.md |
| **Total** | | **120** | **119** | |

These are designed test cases with recorded actual outputs, not a one-to-one list of Vitest test names. The automated suite is recorded separately in Section 4.3.

### 2.7 Risk Factor Calculators

| Factor (rank) | Class | Tests |
|---|---|---|
| Dengue clusters (1) | `DengueClusterCalculator` | `exposureCalculators.test.ts`; `percentileScore.test.ts`; `clustersForSubzone.test.ts` |
| High-Aedes area (2) | `HighAedesAreaCalculator` | `exposureCalculators.test.ts`; `percentileScore.test.ts` |
| Population density (3) | `PopulationDensityCalculator` | `exposureCalculators.test.ts`; `percentileScore.test.ts` |
| Humidity (4) | `HumidityCalculator` | `weatherCalculators.test.ts`; `anomalyScore.test.ts` |
| Lagged rainfall (5) | `LaggedRainfallCalculator` | `weatherCalculators.test.ts`; `anomalyScore.test.ts` |

All are in `src/control/calculators/` and implement the `RiskFactorCalculator` interface (Strategy pattern).

## 3. Backlog Coverage

### 3.1 Sprint 1 (22–28 October 2026)

| Ticket | Backlog Item | Related UC / FR | Implementation or Evidence | Status |
|---|---|---|---|---|
| #1 | Sprint 1 planning | Cross-cutting | Notion planning decisions D1–D7 | Done (process) |
| #2 | Verify datasets | NFR-FRS; Table 3-1 | Dataset verification checklist | Done |
| #3 | Confirm UC numbering and reservoirs | UC-1–UC-5 | TA clarification | Done (process) |
| #4 | Shared contracts and risk model configuration | UC-1 / FR-1.4–FR-1.6; NFR-MNT.1 | `riskModelConfig.ts`; `src/entity/` | Done; tested |
| #5 | Cluster, density and Aedes calculators | UC-1 / FR-1.4 | `src/control/calculators/`; `percentileScore.test.ts`; `exposureCalculators.test.ts` | Done; tested |
| #6 | Humidity and rainfall calculators | UC-1 / FR-1.4 | `src/control/calculators/`; `anomalyScore.test.ts`; `weatherCalculators.test.ts` | Done; tested |
| #7 | RiskAssessmentControl | UC-1 / FR-1.3–FR-1.9 | `RiskAssessmentControl.ts`; `RiskAssessmentControl.test.ts` | Done; tested |
| #8 | Start-up wiring | UC-1–UC-4 | `src/Startup.ts`; `Startup.test.ts` | Done; tested |
| #9 | Mock snapshot with real subzone IDs | UC-1, UC-2 (tests) | `src/services/mocks/MockPublicDataService.ts` | Done |
| #10 | DataGovSgAdapter | NFR-FRS.1 | `src/services/DataGovSgAdapter.ts`; `scripts/sync-data.ts` | Done |
| #11 | Static census, boundaries and baselines | FR-1.4; Table 3-1 | `scripts/build-static.ts`; `data/derived/`; `scripts/lib/*.test.ts` | Done; tested |
| #12 | Hourly sync job | NFR-FRS.1–FRS.3 | `scripts/sync-data.ts`; `.github/workflows/sync-data.yml`; `sync-data.test.ts` | Done; tested |
| #13 | Cached service and fallback | NFR-REL.2 | `CachedPublicDataServiceProxy.ts` and its tests; `testing/tests/ticket-13.md` | Done; tested |
| #14 | OneMap adapter and LocationRiskControl | UC-1, UC-5 / FR-1.1–FR-1.2, FR-5.2–FR-5.6 | `LocationRiskControl.ts`; `GeocodingMapServiceBoundary.ts`; `LocationRiskControl.test.ts` | Done; tested |
| #15 | Home page wiring | UC-1 / FR-1.1 | Originally `HomePageBoundary.tsx`; replaced by the dashboard search in `RiskMapBoundary` (Sprint 2) | Done; superseded |
| #16 | Prevention tip content | UC-3 / FR-3.2, FR-3.5 | `PreventionGuidanceControl.ts` (bundled tasks); `PreventionTasksContent.test.ts` | Done; tested |
| #17 | Personalised tips | UC-3 / FR-3.1 | `PreventionGuidanceControl.generateTips()`; `PreventionGuidanceControl.generatetips.test.ts` | Done; tested |
| #18 | RiskResultBoundary redesign | UC-1 / FR-1.3, FR-1.10, FR-1.11 | `RiskResultBoundary.tsx`; `RiskResultBoundary.test.tsx` | Done; tested |
| #19 | App screen wiring | UC-1–UC-4 | `App.tsx`; `App.test.tsx`; `testing/tests/ticket-19.md` | Done; tested (layout later changed to the single dashboard) |
| #20 | Leaflet risk map | UC-2 / FR-2.1, FR-2.2 | `RiskMapBoundary.tsx`; `riskLevelStyle.ts`; `testing/tests/ticket-20.md` | Done; tested |
| #21 | Map overlay toggles | UC-2 / FR-2.3, FR-2.4 | `RiskMapControl.updateOverlay()`; `RiskMapBoundary.tsx` | Done; tested |
| #22 | Subzone popup and top-10 list | UC-2 / FR-2.5, FR-2.6 | `RiskMapControl.getTopSubzones()`, `getTopFactors()`; `testing/tests/ticket-22.md`. The popup was replaced by the hover tooltip and the side card (Sprint 2). | Done; popup superseded |
| #23 | RiskSimulationControl | UC-4 / FR-4.2–FR-4.9 | `RiskSimulationControl.ts`; `RiskSimulationControl.test.ts` | Done; tested |
| #24 | SimulationBoundary update | UC-4 / FR-4.1, FR-4.6, FR-4.7 | `SimulationBoundary.tsx`; `SimulationBoundary.test.tsx` | Done; tested |
| #25 | Black-box test design | UC-1 | `docs/black-box-test-design.md` | Done |
| #26 | Traceability matrix | UC-1–UC-5 | `lab5/traceability-matrix.md` (this document) | Done |
| #28 | Sprint 1 review and retrospective | Cross-cutting | Notion meeting notes | Process item |
| #53 | Architecture diagram draft | Cross-cutting | Architecture diagram (finalised in #45) | Done |
| #54 | Pipeline handover | NFR-FRS.4 | README runbook | Done |
| #55 | OneMap token proxy | UC-5 / FR-5.2; NFR-SEC.3 | `api/onemap-search.ts`; `tests/onemap-search.test.ts`; `testing/tests/ticket-55.md` | Done; tested |
| #61 | Simulation sliders (5 steps, live update) | UC-4 / FR-4.5 | `RiskSimulationControl.adjustedValue()`; `ADJUSTMENT_STEPS` | Done; tested (UI later changed to exact values) |

### 3.2 Sprint 2 and Closure code items

| Ticket | Item | Related UC / FR / NFR | Implementation or Evidence | Status |
|---|---|---|---|---|
| #27 | Integration on real data; snapshot hosting | NFR-REL; UC-1, UC-2 | `api/snapshot.ts`; `tests/snapshot.test.ts`; bugs logged as #56–#60 | Done; tested |
| #30 | Stale-data banner, "Last updated" | NFR-FRS.2, NFR-SAF.2; FR-2.9 | `dataFreshness.ts`; `DataFreshnessNotice.tsx` and their tests | Done; tested |
| #31 | Prevention page with NEA links | UC-3 / FR-3.4 | `PreventionGuidanceBoundary.tsx` and its test | Done; tested |
| #32 | Keyboard access and phone layout | NFR-ACC.1, NFR-USA.2 | `testing/tests/ticket-32.md` | Done; manual check |
| #34 | Failure-mode tests for the data pipeline | NFR-REL | `lab4/testing/ticket-34.md`; `Datapipelinefailuremodes.test.ts` | Done; tested |
| #35 | Sensitivity analysis of the weights | FR-1.4; NFR-MNT.1 | `lab4/sensitivity-analysis.md`; `scripts/sensitivity-analysis.ts`; `weightSchemes.test.ts` | Done; tested |
| #37 | Test case design for every control | All UCs | `lab4/testing/test-design.md` | Done |
| #41 | Execute tests and record actual outputs | All UCs | Section 4.3; actual outputs in `test-design.md` and `ticket-34.md` | Done |
| #56 | Cluster list uses the score's rule | UC-1 (cluster summary in Area Result); FR-3.6 | `clustersForSubzone.ts`; `clustersForSubzone.test.ts` | Done; tested |
| #57 | False base-map warning | UC-2 / FR-2.1 | `RiskMapBoundary.tsx`; `RiskMapBoundary.test.tsx`; `testing/tests/ticket-57.md` | Done; tested |
| #58 | Bundled fallback wired | NFR-REL.2 | `Startup.ts`; `BundledFallbackNotice.tsx`; `Startup.fallback.test.tsx`; `testing/tests/ticket-58.md` | Done; tested |
| #59 | Leaflet error when leaving the map | UC-2 / FR-2.8 | `RiskMapBoundary.tsx`; `RiskMapUnmount.test.tsx` | Done; tested |
| #60 | Navigation highlight; Prevention heading | UC-3 | Superseded by the single-dashboard layout (no navigation bar) | Done; superseded |
| #62 | Aedes simulation rule and rainfall step size | UC-4 / FR-4.2 | `riskModelConfig.ts` (`SIMULATION_STEP_SD`); `RiskSimulationControl.test.ts` | Done; tested |
| — | Single-page dashboard redesign | UC-1–UC-4; UI-4 | `App.tsx`; `RiskMapBoundary.tsx`; `SelectedAreaPreview.tsx`; `RiskFactorBreakdown.tsx`; `testing/tests/ui-dashboard.md` | Done; tested |

## 4. Test Evidence and Records

### 4.1 Automated test files on `master`

| Area | Test files |
|---|---|
| Risk engine | `src/control/RiskAssessmentControl.test.ts`; `src/control/riskModelConfig.test.ts`; `src/control/calculators/*.test.ts` (4 files) |
| Location | `src/control/LocationRiskControl.test.ts`; `tests/onemap-search.test.ts`; `src/services/SubzoneBoundaryService.test.ts`; `src/services/turf.test.ts` |
| Map | `src/control/RiskMapControl.test.ts`; `src/boundary/RiskMapBoundary.test.tsx`; `src/boundary/RiskMapUnmount.test.tsx`; `src/control/clustersForSubzone.test.ts` |
| Prevention | `src/control/PreventionGuidanceControl.test.ts`; `src/control/PreventionGuidanceControl.generatetips.test.ts`; `src/control/PreventionTasksContent.test.ts`; `src/boundary/PreventionGuidanceBoundary.test.tsx`; `src/boundary/PreventionHeadings.test.tsx` |
| Simulation | `src/control/RiskSimulationControl.test.ts`; `src/boundary/SimulationBoundary.test.tsx` |
| Result and app | `src/boundary/RiskResultBoundary.test.tsx`; `src/App.test.tsx`; `src/Startup.test.ts`; `src/Startup.fallback.test.tsx`; `src/boundary/HomePageBoundary.test.tsx` |
| Data and freshness | `src/services/CachedPublicDataServiceProxy.test.ts`; `src/services/Datapipelinefailuremodes.test.ts`; `src/control/dataFreshness.test.ts`; `src/boundary/DataFreshnessNotice.test.tsx`; `tests/snapshot.test.ts` |
| Pipeline scripts | `scripts/sync-data.test.ts`; `scripts/lib/baselines.test.ts`; `scripts/lib/census.test.ts`; `scripts/lib/subzone.output.test.ts`; `scripts/lib/weightSchemes.test.ts` |

### 4.2 Manual test records

At the repository root, `testing/tests/` holds feature test tables with actual results: `ticket-13.md`, `ticket-19.md`, `ticket-20.md`, `ticket-22.md`, `ticket-32.md`, `ticket-55.md`, `ticket-57.md`, `ticket-58.md` and `ui-dashboard.md`. The Lab 4 test design and failure-mode records are in `lab4/testing/`.

### 4.3 Ticket #41 — Automated test execution

| Field | Recorded result |
|---|---|
| Date | 7 November 2026 (Singapore time; GitHub run on 6 November UTC) |
| Command | `npm test -- --reporter=verbose` (Vitest) |
| Platform | GitHub Actions, PR #51 (`test/vitest-ticket-41`) |
| Test files | **36 passed / 36** |
| Automated tests | **446 passed / 446; 0 failed** |
| Duration | 29.99 seconds |
| Workflow | `Run Vitest Tests` (`.github/workflows/run-tests.yml`), now run on every pull request to `master` |
| Merge | PR #51 merged into `master` (merge commit `0be82fa`) |
| Additional check | 446/446 also passed on a clean copy of `master` |

Evidence: [PR #51](https://github.com/Feryan123/SC2006-DengueAheadSG/pull/51) and its GitHub Actions log. This automated suite is separate from the 120 designed test cases in Section 2.6.

## 5. Known Limitations

These were found by testing and are recorded rather than fixed, because the code freeze passed on 2 November 2026. The risk model spec (#42) describes them in full.

1. **DC-X2 (Data Confidence):** missing factors are counted against the configured calculators, not all five factors. Not reachable in the deployed app, which always configures all five.
2. **FM-RW-07 (Data Confidence):** a FAILED non-core dataset does not lower Data Confidence.
3. **FM-VAL-02 (sync job):** a dengue cluster without a locality would make the published snapshot fail browser validation, so visitors would see the backup data. It doesn't occur in current data.
4. **NFR-FRS.2:** the 45-day high-Aedes age rule is defined in `riskModelConfig.ts` but not applied.
5. **NFR-FRS.1:** GitHub Actions does not always start the hourly run on time; the refresh can be triggered by hand (NFR-FRS.4).
6. **Unused classes:** `HomePageBoundary`, `DataUnavailableBoundary` and `SubzonePopup` remain in `src/boundary/` from Sprint 1 but are not used by the dashboard. They are left out of the class diagram and will be removed in the final clean-up.
7. **Top-10 list:** the highest-risk list (`getTopSubzones()`) has no FR of its own in the SRS.
8. **Dialog map — stale or backup data:** the app shows a stale-data notice and a backup-data notice (NFR-FRS.2, NFR-SAF.2, NFR-REL.2) inside the dashboard states, but the dialog map has no separate state or activity for them.
9. **Dialog map — search service unavailable:** when OneMap cannot be reached, the app shows "Location search is unavailable" (FR-5.6). The dialog map does not show this separately from Dashboard — Invalid Location.

## 6. Lab 5 Demonstration Trace Examples

### Example A — UC-1 Assess Location Risk

FR-1.1, FR-1.3–FR-1.5 → UC-1 (includes UC-5) → Dashboard — No Area Selected → Dashboard — Area Selected *(searchOrSelectArea)* → `LocationRiskControl.assessLocation()` → `GeocodingMapServiceBoundary.geocodeLocation()` → `LocationRiskControl.identifyPlanningSubzone()` → `RiskAssessmentControl.generateAssessment()` → tests LOC-ECP-01, RA-BVA-02/03 (`LocationRiskControl.test.ts`, `RiskAssessmentControl.test.ts`).

Demonstrate: search `680123`, show TECK WHYE's Risk Level and score breakdown, then show the matching test cases and run them.

### Example B — UC-2 Explore Risk Map

FR-2.1, FR-2.3–FR-2.6 → UC-2 → Dashboard — No Area Selected → Dashboard — Area Selected *(searchOrSelectArea)* → `RiskMapControl.loadRiskMap()`, `updateOverlay()`, `getSelectedAssessment()` → tests MAP-ECP-01, MAP-ECP-06, MAP-ECP-08 (`RiskMapControl.test.ts`, `RiskMapBoundary.test.tsx`).

Demonstrate: toggle the cluster overlay, select a subzone on the map, and show its result.

## 7. Review and Definition of Done

- [x] FR / UC / dialog state / class.method / test mapping complete for UC-1 to UC-5.
- [x] FR IDs follow SRS v1.1.
- [x] Dialog states use the state names from the dialog map (#44), mapped to the dashboard parts in SRS §3.1.
- [x] Statuses re-checked against `master` (7 November 2026).
- [x] All Sprint 1 backlog items and the Sprint 2 code items included.
- [x] Final Ticket #37 and #34 test IDs mapped (120 cases, 119 pass, 1 known limitation).
- [x] Ticket #41 automated run recorded (36 files, 446 tests passed).
- [x] All `testing/tests/` records linked.
- [x] No UC-6 rows.
- [x] Author identified.
- [x] Dialog-state names confirmed against the dialog map (#44).
- [ ] Reviewed and accepted by another team member.
- [ ] Product Owner sign-off.
