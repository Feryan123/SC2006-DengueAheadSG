

\# DengueAhead SG — Requirements Traceability Matrix



\*\*Author:\*\* Huajia (P5)  

\*\*Ticket:\*\* #26 — Traceability Matrix Started  

\*\*Sprint:\*\* Sprint 1 (22–28 October 2026)  

\*\*Last updated:\*\* 27 October 2026  

\*\*Status:\*\* Initial draft — subject to team review



\## 1. Purpose



This matrix traces functional requirements to use cases, dialog states, implementation methods and tests. It also records the relevant Sprint 1 backlog items.



The matrix is a living document. An existing class or test file does not automatically mean the corresponding use case is fully implemented or tested.



\### Sources



\- Latest `UseCase\_Template.pdf` (confirmed 26 October 2026)

\- `DengueAheadSG\_Backlog\_Checklist`

\- Current project source files on the `master` branch

\- Lab 5, Section 3.1.6 — Demonstrating traceability



\### Status legend



\- \*\*Existing\*\* — class or method was observed in the source code.

\- \*\*Test exists\*\* — a related test file exists; full use-case coverage is not implied.

\- \*\*Pending\*\* — implementation, testing or mapping requires completion.

\- \*\*To verify\*\* — exact linkage has not yet been confirmed.



\## 2. Functional Requirement Traceability



| FR | UC | Dialog state / interaction | Class.method | Test ID / file | Status |

|---|---|---|---|---|---|

| FR-1.1–FR-1.4 | UC-1 Assess Location Risk | Home / Location Input | `LocationRiskControl.assessLocation()` | Pending dedicated location-flow test | Existing method; end-to-end flow to verify |

| FR-1.2–FR-1.4 | UC-5 Identify Planning Subzone | Location Input → Location Confirmation / correction | `LocationRiskControl.identifyPlanningSubzone()` | `SubzoneBoundaryService.test.ts` (related) | Existing method; coverage to verify |

| FR-1.2–FR-1.4 | UC-5.1 / UC-5.2 | Location validation / subzone resolution | `LocationRiskControl.identifyPlanningSubzone()`; geocoding and boundary service methods to verify | `SubzoneBoundaryService.test.ts`; `onemap-search.test.ts` (related) | Partial mapping |

| FR-2.1–FR-2.7 | UC-1.2 Generate Risk Assessment | Risk Result | `RiskAssessmentControl.generateAssessment()` | `RiskAssessmentControl.test.ts` | Existing; test file exists |

| FR-2.1–FR-2.7 | UC-1.2 Generate Risk Assessment | Risk Result — factor contributions | `RiskAssessmentControl.calculateContributions()` | `RiskAssessmentControl.test.ts`; calculator tests | Existing; test files exist |

| FR-2.1–FR-2.7 | UC-1.2 Generate Risk Assessment | Risk Result — risk index and level | `RiskAssessmentControl.calculateRiskIndex()` | `RiskAssessmentControl.test.ts`; `riskModelConfig.test.ts` | Existing; test files exist |

| FR-1.1, FR-3.1–FR-3.4 | UC-2 Explore Risk Map | Risk Map / legend | `RiskMapControl.loadRiskMap()` | `RiskMapControl.test.ts`; `RiskMapBoundary.test.tsx` | Existing; test files exist |

| FR-3.1–FR-3.4 | UC-2.2 Search Planning Subzone | Risk Map — search / selection | `RiskMapControl.selectSubzone()`; `getSelectedAssessment()` | `RiskMapControl.test.ts` | Existing; exact coverage to verify |

| FR-3.1–FR-3.4 | UC-2 Explore Risk Map | Risk Map — selected subzone details | `RiskMapControl.getTopFactors()`; `getTopSubzones()` | `RiskMapControl.test.ts`; `RiskMapBoundary.test.tsx` | Existing; exact coverage to verify |

| FR-3.1–FR-3.4 | UC-2.3 / UC-2.4 Overlay Toggles | Risk Map — overlay toggled | `RiskMapControl.updateOverlay()` | `RiskMapControl.test.ts`; `RiskMapBoundary.test.tsx` | Existing method; feature coverage to verify |

| FR-1.1, FR-4.1 | UC-3 View Prevention Guidance | Prevention Checklist | `PreventionGuidanceControl.loadChecklist()` | Pending dedicated test | Existing method |

| FR-4.1 | UC-3.1 View Task Details \& Source Info | Task Selected / Task Details | `PreventionGuidanceControl.showTaskDetails()` | Pending dedicated test | Existing method |

| FR-5.1–FR-5.10 | UC-4 Simulate Risk Scenario | Simulation Setup | `RiskSimulationControl.validateAdjustment()` | Pending | Method exists; not implemented |

| FR-5.1–FR-5.10 | UC-4.1 Recalculate \& Compare | Simulation Comparison | `RiskSimulationControl.recalculateScenario()` | Pending | Method exists; not implemented |

| FR-5.1–FR-5.10 | UC-4.2 Reset Factors | Simulation Setup / Reset | `RiskSimulationControl.resetScenario()` | Pending | Method exists; not implemented |

| FR-1 / FR-2 / FR-3 (related) | UC-1 / UC-2 | Data Unavailable / error handling | `LocationRiskControl.handleUnavailableData()`; `RiskMapControl.handleUnavailableData()` | Related control tests; exact coverage to verify | Existing methods |



\*\*Dialog-state note:\*\* State names above are working labels based on the use-case flows and current boundary components. They must be reconciled with the team's latest dialog map before final submission.



\*\*Requirement note:\*\* The FR ranges are taken from the traceability notes in the latest use-case descriptions. Exact individual FR-to-method mapping must be checked against the final SRS.



\## 3. Sprint 1 Backlog Coverage



Every Sprint 1 backlog item is recorded below, including the user stories. Supporting tasks, documentation and process items are included so the team can locate their traceability evidence.



| Ticket | Backlog item | Related UC / FR | Implementation or evidence | Traceability status |

|---|---|---|---|---|

| #1 | Sprint 1 planning | Cross-cutting | Notion planning decisions | Process evidence |

| #2 | Verify datasets | Public Data / UC-1 | Dataset verification checklist | Supporting evidence |

| #3 | Confirm UC numbering and reservoirs | UC-1–UC-5 | TA clarification | Pending confirmation |

| #4 | Shared contracts and risk model configuration | UC-1 / FR-2 | `riskModelConfig.ts`, entity contracts | Existing |

| #5 | Cluster, density and Aedes calculators | UC-1 / FR-2 | `src/control/calculators/` | Existing; tests to verify |

| #6 | Humidity and rainfall calculators | UC-1 / FR-2 | `src/control/calculators/` | Existing; tests to verify |

| #7 | RiskAssessmentControl | UC-1 / FR-2 | `generateAssessment()`, `calculateRiskIndex()`, `assessAll()` | Existing; tests present |

| #8 | Start-up wiring | UC-1–UC-4 | Start-up class / application wiring | Pending verification |

| #9 | Mock snapshot with real subzone IDs | Public Data / UC-1–UC-2 | `MockPublicDataService.ts` | PR #21 under review |

| #10 | DataGovSgAdapter | Public Data / UC-1 | Data adapter / sync pipeline | Verify implementation |

| #11 | Static census, boundaries and baselines | Public Data / UC-1 | `data/derived/`, build scripts | Supporting evidence |

| #12 | Hourly sync job | Public Data / UC-1 | `scripts/sync-data.test.ts`, sync pipeline | Test file exists |

| #13 | Cached service and fallback | Public Data / UC-1–UC-2 | `CachedPublicDataServiceProxy.test.ts` | Test file exists |

| #14 | OneMapAdapter and LocationRiskControl | UC-1 / UC-5 / FR-1 | `LocationRiskControl.assessLocation()`, `identifyPlanningSubzone()` | Existing methods |

| #15 | HomePageBoundary wiring | UC-1 / FR-1 | `HomePageBoundary.tsx` | Integration to verify |

| #16 | Prevention tip content | UC-3 / FR-4 | Prevention guidance content | Content to verify |

| #17 | Personalised tips | UC-1 / FR-2; related guidance | Tip generation implementation | To verify; distinguish from public UC-3 checklist |

| #18 | RiskResultBoundary redesign | UC-1 / FR-2 | `RiskResultBoundary.tsx` | UI integration to verify |

| #19 | App screen wiring | UC-1–UC-4 | `App.tsx`, `App.test.tsx` | Test file exists |

| #20 | Leaflet risk map | UC-2 / FR-3 | `RiskMapBoundary.tsx`, `riskLevelStyle.ts` | Existing files |

| #21 | Map overlay toggles | UC-2.3 / UC-2.4 / FR-3 | `RiskMapControl.updateOverlay()` | Feature completion to verify |

| #22 | Subzone popup and top-10 list | UC-2 / FR-3 | `SubzonePopup.ts`, `RiskMapControl.getTopSubzones()` | Existing files/method |

| #23 | RiskSimulationControl | UC-4 / FR-5 | `RiskSimulationControl.ts` | Pending implementation |

| #24 | SimulationBoundary update | UC-4 / FR-5 | `SimulationBoundary.tsx` | Pending verification |

| #25 | Black-box test design | UC-1 / FR-2 | `docs/black-box-test-design.md` | PR #22 under review |

| #26 | Traceability matrix | UC-1–UC-5 | `docs/traceability-matrix.md` | In progress |

| #27 | Integration and internal demo | UC-1–UC-4 | Integrated application and demo evidence | Pending |

| #28 | Sprint review and retrospective | Cross-cutting | Notion meeting notes | Pending |

| #53 | Architecture diagram draft | Public Data / cross-cutting | Architecture diagram | Review pending |

| #54 | Pipeline handover | Public Data / UC-1 | Runbook and walkthrough | Pending verification |

| #55 | OneMap token proxy | UC-1 / UC-5 / FR-1 | Serverless token proxy | Implementation to verify |



\### Sprint 1 story-specific coverage



The following Sprint 1 items are explicitly treated as user stories in the backlog or provide user-facing behavior:



\- \*\*#5, #6, #7:\*\* Risk factor scoring and confidence — UC-1.

\- \*\*#12, #13:\*\* Fresh public data and fallback availability — supporting UC-1 and UC-2.

\- \*\*#14, #15:\*\* Address/postal-code assessment flow — UC-1 and UC-5.

\- \*\*#17, #18:\*\* Risk result and personalised guidance — UC-1.

\- \*\*#20, #21, #22:\*\* Risk map, overlays and subzone information — UC-2.

\- \*\*#23, #24:\*\* Hypothetical risk simulation — UC-4.



All 31 Sprint 1 backlog items are represented in the coverage table. The final reviewer should confirm which entries are formally classified as Stories in Notion.



\## 4. Known Gaps and Follow-up Actions



1\. \*\*UC numbering:\*\* Latest use-case documentation defines UC-3 as Prevention Guidance and UC-5 as Identify Planning Subzone. Older README or source comments may use different numbering. Confirm through Ticket #3 and reconcile references.

2\. \*\*Dialog map:\*\* Verify the exact screen and transition labels against the latest dialog map.

3\. \*\*Simulation:\*\* `RiskSimulationControl` methods currently throw `Not implemented`. Update this matrix after Tickets #23 and #24 are merged.

4\. \*\*Test coverage:\*\* Existing test-file names are recorded, but individual test case IDs and expected/actual results still require mapping.

5\. \*\*Public data:\*\* The latest use-case descriptions refer to approved public data services. Data retrieval and refresh are supporting functionality rather than a separately numbered UC-1–UC-5 in the current use-case descriptions.

6\. \*\*Prevention scope:\*\* UC-3 describes a public bundled prevention checklist. Personalised tips in Ticket #17 should be traced separately rather than assumed to be part of UC-3.

7\. \*\*Pending PRs:\*\* Recheck the matrix after PR #21 (Ticket #9) and PR #22 (Ticket #25) merge.

8\. \*\*Final SRS:\*\* Validate each individual FR identifier against the final SRS and replace range-level mappings where needed.



\## 5. Lab 5 Demonstration Trace Examples



\### Example A — UC-1 Assess Location Risk



FR-1 / FR-2 → UC-1 and UC-5 → Home / Location Input → `LocationRiskControl.assessLocation()` → `RiskAssessmentControl.generateAssessment()` → Risk Result → `RiskAssessmentControl.test.ts`.



Demonstrate a valid location, the resulting risk level and factors, and a related test. Verify the actual UI wiring before presenting.



\### Example B — UC-2 Explore Risk Map



FR-3 → UC-2 → Risk Map → `RiskMapControl.loadRiskMap()` → `RiskMapBoundary.tsx` → `RiskMapControl.test.ts` / `RiskMapBoundary.test.tsx`.



Demonstrate selecting a subzone and, when implemented, toggling an available overlay.



\## 6. Review and Definition of Done



\- \[x] Initial FR / UC / dialog state / class.method / test mapping drafted.

\- \[x] All 31 Sprint 1 backlog items included.

\- \[x] Author identified.

\- \[ ] Exact dialog-state names checked against final dialog map.

\- \[ ] Individual test case IDs linked where available.

\- \[ ] Reviewed by at least one other team member.

\- \[ ] Saved in the team's required GitHub Lab 4 / Lab 5 documentation folder.

\- \[ ] Product Owner acceptance and sign-off obtained.



\*\*Important:\*\* This is an initial traceability matrix, not a declaration that every use case or Sprint 1 story is finished.



