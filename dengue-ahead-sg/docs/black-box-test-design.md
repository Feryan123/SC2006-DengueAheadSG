

\# Ticket #25 — Black-Box Test Design



\*\*Project:\*\* DengueAhead SG  

\*\*Class Under Test:\*\* RiskAssessmentControl  

\*\*Author:\*\* Huajia  

\*\*Related Use Cases:\*\* UC-1 Assess Location Risk, UC-2 Explore Risk Map, UC-4 Simulate Risk Scenario  

\*\*Reference:\*\* Lab 4, Section 3.2.1



\## 1. Objective



Design black-box test cases for RiskAssessmentControl using Equivalence Class Partitioning (ECP) and Boundary Value Analysis (BVA).



The tests verify the externally observable behaviour of risk assessment, including risk classification, handling of missing data, and data confidence.



\## 2. Equivalence Class Partitioning



\### 2.1 Risk Level Classification



| Test ID | Input: Risk Index | Expected Output | Equivalence Class |

|---|---|---|---|

| ECP-01 | 10 | Low | 0 <= index < 25 |

| ECP-02 | 35 | Moderate | 25 <= index < 50 |

| ECP-03 | 60 | High | 50 <= index < 75 |

| ECP-04 | 85 | Very High | 75 <= index <= 100 |



\### 2.2 Assessment Generation



| Test ID | Test Input / Condition | Expected Output |

|---|---|---|

| ECP-05 | Valid subzone ID, all five factors available | RiskAssessment returned |

| ECP-06 | Unknown subzone ID | null |

| ECP-07 | DengueClusters dataset status = Failed | null |

| ECP-08 | DengueClusters factor unavailable | null |

| ECP-09 | One non-core factor unavailable | Assessment returned with four contributions; DataConfidence = Medium |

| ECP-10 | Two non-core factors unavailable | Assessment returned with three contributions; DataConfidence = Low |

| ECP-11 | All factors available and datasets Fresh | DataConfidence = High |

| ECP-12 | All factors available, one dataset Stale | DataConfidence = Medium |



\## 3. Boundary Value Analysis



\### 3.1 Risk Level Boundaries



| Test ID | Input: Risk Index | Expected Output |

|---|---|---|

| BVA-01 | 24.9 | Low |

| BVA-02 | 25.0 | Moderate |

| BVA-03 | 49.9 | Moderate |

| BVA-04 | 50.0 | High |

| BVA-05 | 74.9 | High |

| BVA-06 | 75.0 | Very High |



\### 3.2 Contribution Level Boundaries



| Test ID | Input: Factor Score | Expected Output |

|---|---|---|

| BVA-07 | 33.99 | Low |

| BVA-08 | 34.00 | Moderate |

| BVA-09 | 66.99 | Moderate |

| BVA-10 | 67.00 | High |





\## 4. Test Execution and Results



\*\*Testing Framework:\*\* Vitest



\*\*Existing Automated Test File:\*\* `src/control/RiskAssessmentControl.test.ts`



\*\*Command Executed:\*\*

`npx vitest run src/control/RiskAssessmentControl.test.ts`



\*\*Execution Summary:\*\*

\- Test Files: 1 passed

\- Tests: 31 passed / 31 total

\- Duration: 324 ms

\- Overall Result: PASS



| Test Group | Expected Result | Actual Result | Status |

|---|---|---|---|

| Risk level classification | Correct classification at all tested values | Existing risk-level tests passed | PASS |

| Contribution level classification | Correct classification at all tested values | Existing contribution-level tests passed | PASS |

| Valid and invalid subzones | Assessment or null as specified | Existing assessment-generation tests passed | PASS |

| Missing factors | Correct handling and confidence | Existing missing-factor tests passed | PASS |

| Dataset status | Correct handling of Failed and Stale data | Existing dataset-status tests passed | PASS |



\*\*Note:\*\* The results above summarize the existing automated test suite. The individual test cases in Sections 2 and 3 are design cases; not every listed input was executed as a separate automated test.



\## 5. Conclusion



The test cases cover representative equivalence classes and important boundary values of RiskAssessmentControl.



The selected cases aim to verify essential application behaviour while avoiding unnecessary duplication of test inputs.



