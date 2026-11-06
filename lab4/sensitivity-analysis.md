# Ticket 35: Sensitivity analysis of the risk model weights

**Author:** Feryan (P1) · **Use case:** UC-1 Assess Location Risk (also affects UC-2 map colours and the top-10 list)
**Data:** real public data snapshot of 6 Nov 2026, 17:24 SGT (`generatedAt` 2026-11-06T09:24:17Z), 332 subzones, all assessed.
**How to reproduce:** `cd dengue-ahead-sg`, then `npm run sync` (or copy a snapshot from the `data` branch), then `npm run sensitivity`.

---

## 1. Question

The risk index is a weighted sum of five factor scores. The weights come from a ranking of the factors (decision D1) converted with the **rank-sum** method. This analysis asks:

1. **How much do the results depend on the exact weight values?** Each weight is changed by ±20 %.
2. **How much do they depend on the method used to turn ranks into weights?** Rank-sum is compared with rank order centroid (ROC), rank reciprocal and equal weights.

For each case, the analysis records the **% of subzones whose risk level changes** (the Ticket 35 criterion), plus how far the index moves and whether the riskiest areas stay the same.

---

## 2. Method

- **Same engine, same data.** Every case runs the real `RiskAssessmentControl` (the same 5 calculators, reweighting rules and 25/50/75 bands) on the same snapshot. Only the weights change. The baseline is the rank-sum weighting the app uses.
- **±20 % per weight.** One weight is multiplied by 1.2 or 0.8, then all five are rescaled to add up to 1 again. The other four keep their proportions to each other. That gives 10 cases.
- **Weighting methods**, all from the same ranking (1 = clusters … 5 = rainfall), n = 5:

| Method | Formula for the factor ranked r |
|---|---|
| Rank-sum (baseline) | (n − r + 1) / Σ(n − k + 1) = (6 − r) / 15 |
| Rank order centroid (ROC) | (1/n) × Σ_{k=r..n} 1/k |
| Rank reciprocal | (1/r) / Σ_{k=1..n} 1/k |
| Equal | 1/n |

- **Measures** (each compared with the baseline):
  - **Level changed:** % (and number) of the 332 subzones whose risk level is different, split into moved up / moved down.
  - **Mean / max index shift:** average and largest change in the risk index (0–100 scale).
  - **Top-10 kept:** how many of the baseline's 10 riskiest subzones are still in the top 10.
  - **Spearman ρ:** rank correlation of all 332 indices (1 = same order).

---

## 3. Weights compared

| Weighting | Clusters | High-Aedes | Density | Humidity | Rainfall |
|---|---|---|---|---|---|
| **Rank-sum (baseline)** | **0.333** | **0.267** | **0.200** | **0.133** | **0.067** |
| Rank order centroid (ROC) | 0.457 | 0.257 | 0.157 | 0.090 | 0.040 |
| Rank reciprocal | 0.438 | 0.219 | 0.146 | 0.109 | 0.088 |
| Equal weights | 0.200 | 0.200 | 0.200 | 0.200 | 0.200 |
| Clusters +20 % | 0.375 | 0.250 | 0.188 | 0.125 | 0.063 |
| Clusters −20 % | 0.286 | 0.286 | 0.214 | 0.143 | 0.071 |
| High-Aedes +20 % | 0.316 | 0.304 | 0.190 | 0.127 | 0.063 |
| High-Aedes −20 % | 0.352 | 0.225 | 0.211 | 0.141 | 0.070 |
| Density +20 % | 0.321 | 0.256 | 0.231 | 0.128 | 0.064 |
| Density −20 % | 0.347 | 0.278 | 0.167 | 0.139 | 0.069 |
| Humidity +20 % | 0.325 | 0.260 | 0.195 | 0.156 | 0.065 |
| Humidity −20 % | 0.342 | 0.274 | 0.205 | 0.110 | 0.068 |
| Rainfall +20 % | 0.329 | 0.263 | 0.197 | 0.132 | 0.079 |
| Rainfall −20 % | 0.338 | 0.270 | 0.203 | 0.135 | 0.054 |

---

## 4. Results

Baseline (rank-sum) risk levels: **Low 225 · Moderate 83 · High 17 · Very High 7** (332 subzones).

### 4.1 Each weight ±20 %

| Weighting | Level changed | Up / down | Mean index shift | Max index shift | Top-10 kept | Spearman ρ |
|---|---|---|---|---|---|---|
| Clusters +20 % | 9.0 % (30) | 3 / 27 | 1.37 | 3.4 | 10/10 | 0.9998 |
| Clusters −20 % | 8.4 % (28) | 27 / 1 | 1.56 | 3.9 | 7/10 | 0.9996 |
| High-Aedes +20 % | 6.0 % (20) | 5 / 15 | 1.11 | 3.0 | 8/10 | 0.9998 |
| High-Aedes −20 % | 6.9 % (23) | 16 / 7 | 1.22 | 3.4 | 10/10 | 0.9998 |
| Density +20 % | 6.0 % (20) | 20 / 0 | 0.95 | 2.7 | 10/10 | 0.9999 |
| Density −20 % | 9.9 % (33) | 1 / 32 | 1.02 | 3.0 | 10/10 | 1.0000 |
| Humidity +20 % | 2.4 % (8) | 8 / 0 | 0.79 | 1.2 | 10/10 | 0.9999 |
| Humidity −20 % | 2.1 % (7) | 0 / 7 | 0.84 | 1.2 | 10/10 | 0.9999 |
| Rainfall +20 % | 0.6 % (2) | 2 / 0 | 0.25 | 0.6 | 10/10 | 0.9999 |
| Rainfall −20 % | 0.6 % (2) | 0 / 2 | 0.27 | 0.7 | 10/10 | 1.0000 |

### 4.2 Other weighting methods

| Weighting | Level changed | Up / down | Mean index shift | Max index shift | Top-10 kept | Spearman ρ |
|---|---|---|---|---|---|---|
| Rank order centroid (ROC) | 19.3 % (64) | 3 / 61 | 5.27 | 8.5 | 10/10 | 0.9998 |
| Rank reciprocal | 19.3 % (64) | 3 / 61 | 3.41 | 10.3 | 10/10 | 0.9997 |
| Equal weights | 30.4 % (101) | 95 / 6 | 7.71 | 11.2 | 7/10 | 0.9996 |

---

## 5. Findings

1. **The model is fairly robust to the exact weight values.** Changing any one weight by ±20 % changes the risk level of **at most 9.9 %** of subzones (density −20 %), and moves no index by more than **3.9 points**. Since each band is 25 points wide, no subzone moves by more than one level. The areas that change are the ones already close to a band limit.
2. **The higher-ranked factors matter most.** Clusters (8–9 %) and density (6–10 %) are the most sensitive weights. Humidity (about 2 %) and rainfall (0.6 %) barely matter. This is expected: they have the smallest weights, and they are national values, so they shift every subzone by the same amount.
3. **The ranking of areas hardly changes.** Spearman ρ is at least 0.9996 in every case. The top 10 stays identical in 8 of the 10 ±20 % cases, and keeps at least 7 of 10 otherwise. The map's comparison between areas, and the "highest-risk" list, are therefore stable. The high ρ partly reflects this week's data: 319 of 332 subzones have no cluster cases and 278 have no high-Aedes overlap, so most areas differ only in population density, whose order no reweighting can change.
4. **The choice of method matters more than ±20 %.**
   - **ROC and rank reciprocal** give clusters more weight (0.46 and 0.44 vs 0.33). Because almost no subzone has cluster cases this week, most indices go **down**, and 19.3 % of subzones change level (61 of the 64 move down).
   - **Equal weights** give the two weather factors more weight. These score about 53 (humidity) and 38 (rainfall) for every subzone this month, so most indices go **up**: 30.4 % change level (95 of the 101 move up), and only 7 of the top 10 remain.
5. **Rank-sum is a middle choice.** Its top weight (0.33) sits between equal weights (0.20) and ROC (0.46). It doesn't let one factor dominate, as ROC does, and it doesn't ignore the agreed ranking, as equal weights do. The analysis supports keeping rank-sum. It also shows that the **level labels** (Low / Moderate / High / Very High) depend more on the method than the **ordering of areas** does. That is worth stating as a limitation in the risk model spec (Ticket 42).

---

## 6. Limitations of this analysis

- **One snapshot.** Results depend on the week's data. In a week with many active clusters, the cluster weight would matter more. Rerun `npm run sensitivity` on a newer snapshot to check.
- **One weight at a time.** The ±20 % cases change one weight each; combined changes were not tested.
- **The ranking itself was not varied.** Only how the ranks become weights was varied, not the order of the factors (for example, swapping clusters and high-Aedes).
- **No ground truth.** "Level changed" shows how stable the output is, not whether one weighting predicts dengue better. A backtest (Ticket 36) was cut from the project.

---

## 7. Files

| File | Purpose |
|---|---|
| `dengue-ahead-sg/scripts/sensitivity-analysis.ts` | Runs every case and prints the tables above (`npm run sensitivity`) |
| `dengue-ahead-sg/scripts/lib/weightSchemes.ts` | ROC, rank reciprocal, equal weights and the ±20 % adjustment |
| `dengue-ahead-sg/scripts/lib/weightSchemes.test.ts` | Unit tests: each scheme sums to 1, the exact ROC and reciprocal values, ±20 % rescaling |
| `dengue-ahead-sg/src/control/RiskAssessmentControl.ts` | Optional `weights` constructor parameter (defaults to rank-sum, so the app is unchanged) |
