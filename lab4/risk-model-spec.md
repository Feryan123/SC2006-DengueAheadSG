# DengueAheadSG — Risk Model Specification

**Ticket:** 42 · **Author:** Feryan Krishany Jonandri (P1) · **Reviewed by:** Matin
**Version:** 1.0 · **Date:** 7 November 2026 · **Scoring version in code:** `SCORING_VERSION = '2.0.0'`
**Use cases:** UC-1 Assess Location Risk, UC-2 Explore Risk Map, UC-4 Simulate Risk Scenario

This document specifies how DengueAheadSG turns public data into a risk index and a risk level for each of Singapore's 332 planning subzones, why each choice was made, how sensitive the result is to those choices, and what the model does not do. Every number below is defined in one file, `dengue-ahead-sg/src/control/riskModelConfig.ts` (SRS NFR-MNT.1), and implemented by `RiskAssessmentControl` and the five `RiskFactorCalculator` classes in `src/control/calculators/`.

> The risk index is a project indicator of present conditions. It is not an infection probability, not a forecast, and not an official NEA assessment (SRS C-6).

---

## 1. Overview

For a planning subzone *s*:

1. Each of five **risk factors** *f* is scored from 0 to 100: *score_f(s)*.
2. Each factor has a **weight** *w_f* from the agreed ranking (rank-sum method, Section 3). The weights add up to 1.
3. The **risk index** is the weighted sum, rescaled over the factors that have data:

   **risk index(s) = Σ_f w_f · score_f(s) / Σ_f w_f**   (sums over factors with data)

   The result is clamped to 0–100 and rounded to one decimal place.
4. The index is mapped to one of **four risk levels** (Section 6).

The contribution of each factor, *w_f · score_f(s) / Σ w_f*, is shown to the Visitor as "points" in the score breakdown, so the points always add up to the index (SRS FR-1.11).

---

## 2. Risk factors and their ranking (decision D1)

### 2.1 The five factors

| Rank | Factor | Input (from the hourly snapshot) | Varies by subzone? | Source dataset (data.gov.sg) |
|---|---|---|---|---|
| 1 | Dengue clusters nearby | `clusterCasesNearby`: cases in NEA dengue clusters that overlap the subzone | Yes | Dengue Clusters (`d_dbfabf16158d1b0e1c420627c0819168`) |
| 2 | High-Aedes area overlap | `aedesOverlapRatio`: share of the subzone's area inside NEA high-Aedes-population areas (0–1) | Yes | Areas with High Aedes Population (`d_5d060d8b7838a15e8906fb22c50dbf51`) |
| 3 | Population density | `residentsPerKm2`: Census 2020 residents ÷ subzone area | Yes | Resident Population by Subzone, Census 2020 (`d_d95ae740c0f8961a0b10435836660ce0`); MP2019 Subzone Boundary (`d_8594ae9ff96d0c708bc2af633048edfb`) |
| 4 | Relative humidity | Mean relative humidity of the latest complete month (%) | No (national) | Relative Humidity Monthly Mean, Changi (`d_e3b1111a26b2aefef4f386c068d4ca5d`) |
| 5 | Lagged rainfall | Total rainfall of the month 2–3 months earlier (mm) | No (national) | Rainfall Monthly Total, Changi (`d_b16d06b83473fdfcc92ed9d37b66ba58`) |

Dataset checks (Ticket 2): the boundary file has 332 subzones, 11 of them MultiPolygons, and its `SHAPE.AREA` field gives the area used for density. Every Census subzone name matches a boundary name after upper-casing; "-" is read as 0 and the "- Total" rows are skipped, leaving 46 subzones with 0 residents. Cluster case counts come from the plain `CASE_SIZE` field. The high-Aedes areas are current (August–September 2026), even though the dataset page shows a 2019 date. All datasets are published under the Singapore Open Data Licence.

The spatial joins (cluster overlap, high-Aedes overlap, subzone areas) are done by the hourly sync job with Turf (`scripts/sync-data.ts`, `src/services/turf.ts`). The browser only reads the finished numbers.

### 2.2 Why this order

The ranking was agreed at Sprint 1 planning (Ticket 1, decision D1). It orders the factors from the most direct sign of local transmission to the most indirect, seasonal one. The main source is NEA's own dengue risk model, a Random Forest built by Ong et al. [6].

1. **Dengue clusters (rank 1).** Clusters count *active cases* published by NEA [11]: direct evidence that transmission is happening now. In Ong et al. [6], the previous dengue burden was one of the most important variables. This is also why clusters is the only *core* factor (Section 7).
2. **High-Aedes areas (rank 2).** These show where *Aedes aegypti*, the vector, is abundant [11]. In Ong et al. [6], the *Aedes* breeding percentage was also near the top. The vector is necessary for transmission but is not by itself evidence of cases, so it ranks below clusters.
3. **Population density (rank 3).** In Ong et al. [6], the number of residential units was a top variable, and Nakase et al. [8] found that population growth contributed more than climate to the rise in the population at risk of dengue.
4. **Relative humidity (rank 4).** In a 2025 study of three districts in Pakistan [9], humidity correlated more strongly with dengue cases than rainfall did, although both correlations were weak.
5. **Lagged rainfall (rank 5).** The evidence is mixed: a Singapore study of January 2012 to August 2019 found no significant correlation between rainfall and dengue incidence, and its non-linear model found light rain raised risk while heavy rain was protective [22]. Rainfall is kept because it creates breeding sites, but at the lowest weight.

**The ranking followed the evidence.** The team's first draft put rainfall 3rd. The cited studies didn't support that, so rainfall was moved to last and density and humidity moved up.

Weather is national (the same for every subzone), so it captures *when* risk is higher, while the three location factors, which carry 80 % of the weight (33.3 + 26.7 + 20), capture *where* (Ticket 2).

**What the literature does and doesn't give us.** The studies justify the *order* of the factors, not exact weights: Random Forest importance scores are not linear weights and can't be copied into a weighted sum. This is why a rank-based weighting method is used (Section 3).

---

## 3. Weighting method

### 3.1 Rank-sum weights (decision D2)

With *n* = 5 factors, the factor at rank *r* gets

**w_r = (n − r + 1) / Σ_{k=1..n} k = (6 − r) / 15**

This is the rank-sum method of Stillwell, Seaver and Edwards [7]. The earlier report by Stillwell and Edwards [13] gives rank-sum weights for a five-attribute problem (Table 5). Rank-based weighting is reviewed by Roszkowska [14], and the OECD/JRC handbook [15] covers weighting and aggregation for composite indicators like this one. Implemented by `rankSumWeights()` in `riskModelConfig.ts`, which also rejects duplicate or out-of-range ranks.

| Rank | Factor | Weight |
|---|---|---|
| 1 | Dengue clusters | 5/15 = 0.333 |
| 2 | High-Aedes overlap | 4/15 = 0.267 |
| 3 | Population density | 3/15 = 0.200 |
| 4 | Humidity | 2/15 = 0.133 |
| 5 | Lagged rainfall | 1/15 = 0.067 |

**Why a rank-based method.** No local dataset was available to fit weights statistically (for example by regression against case counts), and the team could agree on an *order* of importance more confidently than on exact numbers. Rank-based methods turn an agreed order into weights in a transparent, reproducible way. Stillwell et al. [7] compared four rank-weighting techniques with equal weights on three multi-attribute decision studies and found that rank weighting gives some improvement over equal weighting, although the improvement did not always change the final decisions. Our own sensitivity analysis (Section 9) shows the same pattern: the ordering of areas barely changes between methods, while the level labels do.

### 3.2 Alternatives compared

| Method | Formula for rank *r* (n = 5) | Weights (rank 1 → 5) | Character |
|---|---|---|---|
| **Rank-sum (chosen)** | (n − r + 1) / Σk | 0.333, 0.267, 0.200, 0.133, 0.067 | Moderate: weights fall evenly |
| Rank order centroid (ROC) [10] | (1/n) Σ_{k=r..n} 1/k | 0.457, 0.257, 0.157, 0.090, 0.040 | Steep: the top factor dominates |
| Rank reciprocal [7] | (1/r) / Σ_{k=1..n} 1/k | 0.438, 0.219, 0.146, 0.109, 0.088 | Steep at the top, long tail |
| Equal | 1/n | 0.200 each | Ignores the ranking |

Why the others were not chosen:
- **Rank order centroid** puts too much weight on the top factor, and Burk and Nehring [16] found it performs poorly on real data, while rank-sum performs well.
- **Equal weights** ignore the evidence behind the ranking (Section 2.2).
- **AHP** (the Analytic Hierarchy Process, used for dengue susceptibility mapping by Hoque et al. [17]) in general needs pairwise judgements from domain experts, which the team doesn't have.
- **Regression or machine learning** needs labelled historical outcomes per subzone, which aren't available.

Rank-sum respects the agreed order without letting one factor (clusters) dominate, which matters because most subzones have no active cluster in any given week. **Caveat:** Burk and Nehring [16] found the sum reciprocal method closest to real elicited weights, with equal ratio weighting as good on three of their metrics; rank-sum performed generally next best, and rank order centroid relatively poorly. Rank-sum was chosen because it is simple, well established and close to the best. Section 9 measures how much the choice matters.

---

## 4. Normalisation: turning inputs into 0–100 scores

Two methods are used, because the factors are of two kinds.

### 4.1 Local factors: percentile among subzones

Clusters, high-Aedes overlap and density differ between subzones, and what matters is how a subzone compares with the others. Each is scored with `percentileScore()`:

**score = 100 × (number of subzones with a strictly lower value) / (N − 1)**

- The lowest subzone scores 0 and the highest 100. Ties share the lower rank, so **every subzone with 0 cluster cases or 0 % overlap scores exactly 0**.
- **Population density** ranks only subzones that have residents. The 46 zero-resident subzones (industrial estates, nature reserves, the airport) would otherwise push every residential subzone's percentile up; they still score 0 themselves.
- The raw inputs are in different units (cases, an area ratio, residents per km²), and percentiles put them on one scale. NEA's model [6] also predicts percentile ranks.
- Percentiles are robust to the very skewed distributions here (a few subzones with large clusters, most with none) and need no arbitrary maximum.

Consequence to be aware of: because most subzones have zero high-Aedes overlap (278 of 332 in the 7 November 2026 snapshot), any overlap above zero already ranks around the 85th percentile.

### 4.2 Weather factors: anomaly against the monthly normal

Humidity and rainfall are national, so ranking subzones against each other is meaningless. What matters is whether this month is unusual *for this time of year*. Each is scored with `anomalyScore()`:

**z = (value − normal mean) / normal SD**, then **score = 50 + (z / Z_CAP) × 50**, clamped to 0–100, with **Z_CAP = 2**.

- A normal month scores 50; 2 SD above normal scores 100; 2 SD below normal scores 0. Values beyond ±2 SD are capped, so one extreme month cannot dominate the index.
- The mean and SD are for the **same calendar month** (Section 5.3), so the seasonal cycle (wetter November–January) is not mistaken for an anomaly.
- If the normal's SD is not positive, or an input is missing, the factor is treated as missing (Section 7).

### 4.3 Contribution levels

Each factor's 0–100 score is also labelled Low (< 34), Moderate (34–66.99) or High (≥ 67) (`CONTRIBUTION_BANDS`). These three levels choose the factor-specific prevention tips (SRS FR-3.1). They do not affect the index.

---

## 5. Weather inputs in detail

### 5.1 Humidity: latest complete month (Option A)

- **Input:** mean relative humidity at Changi for the latest complete month.
- **Why monthly, not real-time (Option A, decided with the dataset checks in Ticket 2):**
  - *The effect is delayed.* There are weeks between weather and dengue cases (Section 5.2), so today's reading matters less than recent conditions.
  - *Like with like.* The current value and its normal come from the same station and the same dataset.
  - *No large downloads.* Building normals from the real-time API would have meant about 12 GB of per-station history; the monthly files are about 7 KB.
  - *No history store.* The real-time API only gives current readings, so even a 14-day average would have needed the app to collect and store readings itself.
- **Lag:** the latest *complete* month is used, because monthly summaries are published about a week after the month ends (SRS A-4). Humidity has its effect over the following weeks, so a recent month is the relevant one.

### 5.2 Rainfall: 2–3 months earlier

- **Input:** total rainfall at Changi for the month 2–3 months before the current one (chosen by the sync job, e.g. July for an assessment in late September or October).
- **Why lagged:** rainfall's effect on cases appears weeks later, through a chain of delays:
  1. rain fills breeding sites, and egg to adult mosquito takes about 8–10 days [18];
  2. the virus then develops inside the mosquito before it can transmit, commonly 8–12 days, and shorter at higher temperatures [23];
  3. the human incubation period is 4–10 days [19].

  Singapore studies [20], [21] and a 2025 study in Pakistan [9] (1–2 months) found lags of this order. The lag also means the one-week publication delay never affects this factor.

### 5.3 Monthly normals

Built once by `npm run build-static` (`scripts/build-static.ts`, `computeMonthlyBaselines()`) into `data/derived/weatherBaselines.json`: the mean and sample SD of each calendar month.

| Factor | Period | Why this period |
|---|---|---|
| Humidity | **2014–2025** (12 years) | The dataset is complete, but the Changi series drops in level from 2014: the mean is 83.3 % for 1991–2013 and 78.4 % for 2014–2025 (Ticket 2 dataset checks). A 1991–2020 normal would rate almost every recent month as unusually dry. |
| Rainfall | **1991–2020** (30 years) | The standard WMO climate normal period. The dataset is complete from January 1982 to September 2026. Monthly rainfall varies widely (0.2 to 765.9 mm), which is why the score divides by the month's SD and why a long period is used for a stable mean and SD. |

Example normals (from `weatherBaselines.json`):

| Month | Humidity mean (SD), % | Rainfall mean (SD), mm |
|---|---|---|
| January | 80.8 (3.48) | 222 (158) |
| June | 78.1 (1.67) | 135 (64) |
| October | 77.1 (2.85) | 168 (84) |
| December | 81.4 (3.18) | 332 (141) |

---

## 6. Risk levels (decision D3)

| Risk level | Risk index |
|---|---|
| Low | index < 25 |
| Moderate | 25 ≤ index < 50 |
| High | 50 ≤ index < 75 |
| Very High | index ≥ 75 |

- **Four levels** were agreed at Sprint 1 planning (Ticket 1, decision D3) because three levels were too wide to tell areas apart. Four also gives the scale a clear "highest" category for areas that need action today.
- The planning notes wrote Very High as "risk > 75"; the shared contracts (Ticket 4) fixed it as **≥ 75**, so that every index value falls in exactly one band. The code and the SRS use ≥ 75.
- **Equal 25-point bands** keep the scale easy to explain ("each quarter of the scale is one level"). The bands are half-open, so each level starts exactly at its lower limit. They were tested at 24.9/25, 49.9/50 and 74.9/75.
- Because the index is rounded to one decimal before classification, 24.9, 49.9 and 74.9 are the highest values each lower band can receive.

---

## 7. Missing data, reweighting and Data Confidence

### 7.1 Reweighting

If a factor cannot be scored (its data is missing or unusable), it is left out and the remaining weights are rescaled to add up to 1, by dividing by the sum of the weights that are present (Section 1). The index then reflects the factors we do have, instead of treating missing data as zero risk.

Worked example (fixed scores clusters 80, Aedes 60, density 40, humidity 30, rainfall 20; tested in Ticket 34):

| Case | Calculation | Index |
|---|---|---|
| All five factors | (80·5 + 60·4 + 40·3 + 30·2 + 20·1) / 15 = 840 / 15 | 56.0 (High) |
| Humidity missing | (840 − 60) / 13 | 60.0 (High) |
| Humidity and rainfall missing | (840 − 60 − 20) / 12 | 63.3 (High) |

### 7.2 Core factor

**Dengue clusters** is the only core factor (`CORE_FACTORS`). If it cannot be scored, or the clusters dataset is marked FAILED, **no assessment is produced** and the subzone is shown as "risk unavailable" (grey). Without the most direct evidence of transmission, the team decided that showing no result is safer than showing a low one.

### 7.3 Data Confidence

| Data Confidence | Condition (`determineDataConfidence()`) |
|---|---|
| High | All five factors scored and no dataset STALE |
| Medium | One factor missing, or any dataset STALE |
| Low | Two or more factors missing |

### 7.4 Data freshness

| Rule | Value (`riskModelConfig.ts`) |
|---|---|
| Hourly datasets (clusters, high-Aedes) count as out of date when last fetched more than | 180 minutes (`MAX_FETCH_AGE_MIN`) |
| Monthly weather data counts as STALE when it is more than | 2 months behind (`MAX_MONTHLY_LAG_MONTHS`) |
| High-Aedes data age limit (defined, not yet applied; see Section 11) | 45 days (`MAX_AEDES_DATE_AGE_DAYS`) |

The planning value was 120 minutes (Ticket 1). It was raised to 180 minutes in Sprint 2 because GitHub Actions often starts the hourly refresh late or skips a run (SRS C-5).

---

## 8. Simulation rules (Ticket 62)

The simulator (UC-4) changes three inputs on a copy of the snapshot and re-runs the same engine (`RiskSimulationControl.recalculateScenario()` → `RiskAssessmentControl.generateAssessment()`), so simulated and real results always use the same formula, weights and bands. Clusters and density cannot be changed: they describe the area itself, not conditions a Visitor might imagine changing.

**Exact values** (what the dashboard offers): humidity 0–100 %, rainfall ≥ 0 mm, high-Aedes overlap 0–100 % (passed to the engine as a ratio 0–1).

**Preset steps** (`ADJUSTMENT_STEPS`, five levels from Large decrease to Large increase, i.e. −2 to +2 steps; kept in the control and tested):

| Factor | One step = | Limits | Reason (recorded for this spec) |
|---|---|---|---|
| Humidity | 1 SD of that month's 2014–2025 normal | 0–100 % | ±2 steps stays inside the range observed in the reference data. |
| Rainfall | **0.5 SD** of that month's 1991–2020 normal | ≥ 0 mm | Monthly rainfall SDs are large; with a full SD, ±2 steps would go below 0 mm in 4 of the 12 months. Before this change, one step was about −65 % of Townsville's rainfall. |
| High-Aedes overlap | **1 SD of the overlap across all subzones** (about 10 percentage points) | 0–100 % | The earlier provisional rule (±20 % of the current value) could never move the subzones with 0 % overlap (278 of 332 in the 7 November 2026 snapshot), because 20 % of zero is zero. An absolute step based on the spread across subzones lets every subzone move. |

---

## 9. Sensitivity analysis (Ticket 35)

Full results: `lab4/sensitivity-analysis.md` (reproduce with `npm run sensitivity`). Run on the real snapshot of 6 November 2026 (332 subzones; baseline levels Low 225, Moderate 83, High 17, Very High 7).

| Change | Subzones whose risk level changes | Largest index shift | Top-10 kept | Spearman ρ |
|---|---|---|---|---|
| Any one weight +20 % or −20 % (10 cases) | **0.6 %–9.9 %** (worst: density −20 %) | 3.9 points | 7–10 of 10 (identical in 8 cases) | ≥ 0.9996 |
| Rank order centroid | 19.3 % (61 of 64 move down) | 8.5 | 10/10 | 0.9998 |
| Rank reciprocal | 19.3 % (61 of 64 move down) | 10.3 | 10/10 | 0.9997 |
| Equal weights | 30.4 % (95 of 101 move up) | 11.2 | 7/10 | 0.9996 |

**Conclusions**
1. The model is robust to the exact weight values: ±20 % on one weight moves no index by more than 3.9 points, so no subzone moves more than one level.
2. The highest-ranked factors matter most (clusters and density); humidity (≈ 2 %) and rainfall (0.6 %) barely matter.
3. The ordering of areas is almost unchanged in every case, so the map comparison and the top-10 list are stable. The level *labels* depend more on the method than the ordering does.
4. Rank-sum sits between equal weights and ROC, which supports keeping it.

---

## 10. Excluded factors

| Factor | Decision | Reason | Limitation |
|---|---|---|---|
| **Air temperature** | Dropped at Sprint 1 planning (Ticket 1); its datasets were removed (Ticket 2) | Singapore's temperature fluctuates little through the year, so a monthly temperature anomaly would add little information, and leaving it out keeps the model to five clearly ranked factors. Temperature is also national (Changi only) and overlaps with humidity, since relative humidity depends on temperature. Singapore studies do link temperature to dengue [20], [22], so it is the first candidate for future work. | Higher temperatures shorten the virus's incubation period in the mosquito [23]; the model does not capture this. |
| **Real-time humidity** | Replaced by monthly humidity (Option A) | See Section 5.1. | Short humid spells are not reflected until the monthly figure is published. |
| **Reservoirs** | Excluded (Ticket 3) | Reservoirs are large, managed bodies of water. *Aedes aegypti* breeds in small containers of still water around homes, which reservoirs are not, and the team's research found no evidence linking reservoirs to *Aedes* clusters; NEA inspections point to small containers, puddles, canvas sheets and drains. (Ticket 3 records the decision; the reason is from the team's F6 research, see [12].) | — |
| **Construction sites, drains, other breeding-site data** | Not a separate factor | Construction sites were linked to the 2013–2014 outbreak, but there is no suitable public dataset of their locations that is kept up to date. Their effect only reaches the model indirectly, when it produces clusters or high-*Aedes* areas. | Listed as future work (SRS OR-4). |
| **National dengue trend (weekly case counts)** | Not used | National counts don't vary by subzone, and the cluster factor already captures active transmission locally. | — |

---

## 11. Limitations

**Of the model**
1. **Present conditions, not a forecast.** The index reflects current data. (The `RiskAssessment` entity carries `horizonDays = 14` from the original class diagram, but no forecasting is done; the SRS describes the index as present risk.)
2. **Not validated against outcomes.** No backtest against later cases was done (Ticket 36 was cut), so the index shows *relative* risk under the agreed assumptions, not a measured probability.
3. **One weather station.** Humidity and rainfall come from Changi only (SRS A-3); rainfall in particular varies across the island. Regional rainfall for the 5 URA regions was noted as a possible Sprint 2 spike (Ticket 2) but not built; it is future work (SRS OR-4).
4. **Relative, not absolute humidity.** Relative humidity depends on temperature; absolute humidity (the water content of the air) relates more directly to mosquito biology, and a Singapore study found it a useful predictor of dengue [21]. Only relative humidity is published monthly on data.gov.sg.
5. **Census 2020 density** is used as a stand-in for current population (SRS A-2), and density is residential: it ignores where people work or visit in the daytime, when *Aedes* bite.
6. **Percentile scoring is relative.** In a week with few clusters, a subzone with a small cluster still ranks highly; the score shows comparison, not absolute danger.
7. **Expert ranking.** The factor order (D1) is a team judgement informed by the literature, not fitted to data. The studies support the order, not exact weights (Section 2.2); Section 9 shows how much this matters.

**Found by testing (recorded, not fixed, after the 2 November code freeze)**
8. **DC-X2:** missing factors are counted against the configured calculators, not all five. Not reachable in the deployed app, which always configures all five.
9. **FM-RW-07:** a FAILED non-core dataset does not lower Data Confidence; a FAILED high-Aedes dataset arriving with all-zero overlap would score 0 with High confidence.
10. **FM-VAL-02:** a cluster without a locality name would make the published snapshot fail browser validation, so visitors would see the bundled backup. It doesn't occur in current data.
11. **The 45-day high-Aedes age rule** (`MAX_AEDES_DATE_AGE_DAYS`) is defined but not applied.

---

## 12. Configuration reference (`riskModelConfig.ts`)

| Constant | Value | Section |
|---|---|---|
| `SCORING_VERSION` | `'2.0.0'` | — |
| `FACTOR_RANK` | clusters 1, high-Aedes 2, density 3, humidity 4, rainfall 5 | 2 |
| `rankSumWeights()` | (n − r + 1) / Σk | 3 |
| `CORE_FACTORS` | `[DengueClusters]` | 7.2 |
| `RISK_BANDS` | Moderate 25, High 50, Very High 75 | 6 |
| `CONTRIBUTION_BANDS` | Moderate 34, High 67 | 4.3 |
| `Z_CAP` | 2 | 4.2 |
| `MAX_FETCH_AGE_MIN` | clusters 180, aedes 180 | 7.4 |
| `MAX_MONTHLY_LAG_MONTHS` | 2 | 7.4 |
| `MAX_AEDES_DATE_AGE_DAYS` | 45 (not applied) | 7.4, 11 |
| `SIMULATION_STEP_SD` | humidity 1, rainfall 0.5, aedesOverlap 1 | 8 |

Changing any value here changes the model everywhere (map, result, simulation) with no other code change; any change must be agreed by the team and increase `SCORING_VERSION` (SRS BR-3).

## 13. Traceability and tests

| Part of the model | Implementation | Tests |
|---|---|---|
| Weights | `rankSumWeights()` | `riskModelConfig.test.ts`; `scripts/lib/weightSchemes.test.ts` |
| Percentile / anomaly scoring | `percentileScore()`, `anomalyScore()` | `percentileScore.test.ts`, `anomalyScore.test.ts`, `exposureCalculators.test.ts`, `weatherCalculators.test.ts` |
| Index, levels, reweighting, confidence | `RiskAssessmentControl` | RA-ECP/RA-BVA, DC-P1–P4, DC-X1–X2 (`lab4/testing/test-design.md`); FM-RW-01–08 (`lab4/testing/ticket-34.md`); `RiskAssessmentControl.test.ts` |
| Simulation steps | `RiskSimulationControl.adjustedValue()` | SIM-CLAMP, SIM-REC; `RiskSimulationControl.test.ts` |
| Sensitivity | `scripts/sensitivity-analysis.ts` | `lab4/sensitivity-analysis.md` |

### Related design decisions (Ticket 1)

- **D6: subzone metrics are stored on `PlanningSubzone`.** Each subzone's data is kept in the one entity that represents it, with no separate `SubzoneMetrics` class.
- **No database.** Nothing is saved per user, so snapshot JSON files are enough.
- **An hourly GitHub Action writes the snapshot to the `data` branch.** This answers TA feedback F3 on caching and storage.

---

## References

[6] J. Ong et al., "Mapping dengue risk in Singapore using Random Forest," *PLoS Neglected Tropical Diseases*, vol. 12, no. 6, 2018. https://pubmed.ncbi.nlm.nih.gov/29912940<br>
[7] W. G. Stillwell, D. A. Seaver and W. Edwards, "A comparison of weight approximation techniques in multiattribute utility decision making," *Organizational Behavior and Human Performance*, vol. 28, no. 1, pp. 62–77, 1981. https://doi.org/10.1016/0030-5073(81)90015-5<br>
[8] T. Nakase et al., "Population at risk of dengue virus transmission has increased due to coupled climate factors and population growth," *Communications Earth & Environment*, 2024. https://www.nature.com/articles/s43247-024-01639-6<br>
[9] S. Majeed, W. Akram, M. Sufyan, A. Abbasi, S. Riaz, S. Faisal, M. Binyameen, M. I. Bashir, S. Hassan, S. Zafar, O. Kucher, E. A. Piven and O. D. Kucher, "Climate change: a major factor in the spread of *Aedes aegypti* (Diptera: Culicidae) and its associated dengue virus," *Insects*, vol. 16, no. 5, art. 513, 2025. https://doi.org/10.3390/insects16050513 <br>
[10] F. H. Barron and B. E. Barrett, "Decision quality using ranked attribute weights," *Management Science*, vol. 42, no. 11, pp. 1515–1523, 1996. (Rank order centroid weights.) <br>
[11] National Environment Agency, dengue clusters, areas with high *Aedes* population and prevention guidance. https://www.nea.gov.sg/dengue-zika <br>
[12] Team planning and dataset records: Ticket 1 (Sprint 1 planning: risk bands, factor ranking and justifications, weighting source), Ticket 2 (dataset verification, recorded in DengueAheadSG_Datasets_v2.xlsx), and the 22 October feedback-and-plan research (F6, reservoirs). <br>
[13] W. G. Stillwell and W. Edwards, *Rank Weighting in Multiattribute Utility Decision Making: Avoiding the Pitfalls of Equal Weights*, SSRI Research Report 79-2, Social Science Research Institute, University of Southern California, Sept. 1979. DTIC AD-A078941. https://apps.dtic.mil/sti/tr/pdf/ADA078941.pdf <br>
[14] E. Roszkowska, "Rank ordering criteria weighting methods – a comparative overview," *Optimum. Studia Ekonomiczne*, no. 5 (65), 2013. <br>
[15] OECD and European Commission Joint Research Centre, *Handbook on Constructing Composite Indicators: Methodology and User Guide*, OECD Publishing, 2008. <br>
[16] R. C. Burk and R. M. Nehring, "An empirical comparison of rank-based surrogate weights in additive multiattribute decision analysis," *Decision Analysis*, vol. 20, no. 1, pp. 55–72, 2023. https://doi.org/10.1287/deca.2022.0456 <br>
[17] M. A.-A. Hoque, M. L. Sardar, S. A. Mukul and B. Pradhan, "Mapping dengue susceptibility in Dhaka city: a geospatial multi-criteria approach integrating environmental and demographic factors," *Spatial Information Research*, vol. 33, 2025. https://doi.org/10.1007/s41324-025-00635-y <br>
[18] US Centers for Disease Control and Prevention, mosquito life cycle (*Aedes aegypti*). https://www.cdc.gov/mosquitoes/ <br>
[19] World Health Organization, "Dengue and severe dengue" fact sheet. https://www.who.int/news-room/fact-sheets/detail/dengue-and-severe-dengue <br>
[20] Y. L. Hii et al., "Forecast of dengue incidence using temperature and rainfall," *PLoS Neglected Tropical Diseases*, 2012. <br>
[21] H.-Y. Xu et al., "Statistical modeling reveals the effect of absolute humidity on dengue in Singapore," *PLoS Neglected Tropical Diseases*, 2014. <br>
[22] H. Gui, S. Gwee, J. Koh, N. Lau and J. Pang, "Weather factors associated with reduced risk of dengue transmission in an urbanized tropical city," *Int. J. Environ. Res. Public Health*, vol. 19, no. 1, art. 339, 2022. https://doi.org/10.3390/ijerph19010339 <br>
[23] M. Chan and M. A. Johansson, "The incubation periods of dengue viruses," *PLoS ONE*, vol. 7, no. 11, e50972, 2012. https://doi.org/10.1371/journal.pone.0050972

Reference numbers [6] and [7] match the SRS reference list.
