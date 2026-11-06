# Ticket 34: Failure-mode tests for the data pipeline

**Author:** Matin (P2), written as an independent tester of #13 (P3) and #7 (P1). No code from those tickets was changed.
**Use cases:** UC-1 Assess Location Risk (which consumes the data).
**Tests:** `src/services/CachedPublicDataServiceProxy.test.ts` (existing, #13) and `src/services/Datapipelinefailuremodes.test.ts` (new, this ticket).
**How to run:** `npx vitest run src/services/CachedPublicDataServiceProxy.test.ts src/services/Datapipelinefailuremodes.test.ts`
**Result:** 2 test files, 48 tests (34 existing + 14 new), all passed on Vitest 5.0.5. No live APIs are used.

## 1. Failing service triggers the fallback (single-step paths)

These paths are tested in `src/services/CachedPublicDataServiceProxy.test.ts` (#13).

| ID | Failure injected | Expected output | Test | Actual output | Result |
|---|---|---|---|---|---|
| FM-FB-01 | Service fails, no cache | Bundled snapshot returned, every dataset STALE, original dates kept, backup not saved to the cache | `uses the bundled snapshot when fetching fails and no valid cache exists` | Backup returned with original `generatedAt` and `retrievedAt`, datasets STALE, the bundled object itself still FRESH, nothing written to `localStorage` | Pass |
| FM-FB-02 | Service fails, cache older than 1 hour | Old cache returned before the bundled backup; STALE applied, FAILED stays FAILED; cache not overwritten | `uses the old cache before the bundled backup when an update fails` | Service called once; old cache returned; clusters dataset STALE; high-Aedes dataset stayed FAILED; saved cache unchanged | Pass |
| FM-FB-03 | Storage blocked and network down | Bundled backup returned | `still uses the bundled backup when both storage and the network are unavailable` | Backup returned (original `generatedAt`), humidity dataset STALE | Pass |
| FM-FB-04 | Corrupt cache (broken JSON, `null`, `{}`, bad snapshot) | Cache ignored, bundled backup returned | `ignores corrupt cache` | All 4 variants: cache ignored, backup returned, rainfall dataset STALE | Pass |
| FM-FB-05 | Service returns an invalid snapshot | Not cached, old cache kept, fallback used | `does not overwrite the last good cache with an invalid response` | Fallback used (clusters dataset STALE); saved cache unchanged | Pass |
| FM-FB-06 | Network, cache and bundled backup all unusable | Error: "Public data and its backup are unavailable. Please try again later." | `returns a safe error when the network, cache and bundled backup are unusable` | Request rejected with exactly that message; nothing written to `localStorage` | Pass |
| FM-FB-07 | Snapshot reader fails (HTTP 503, bad JSON, old format, timeout) | Bundled backup returned, no private error detail exposed | `uses the backup after a reader failure` | All 4 variants: backup returned, clusters dataset STALE. A failing fetch gives "Public data could not be loaded. Please try again later." with no private detail | Pass |

## 2. Fallback output fed into the risk engine (real calculators)

Tests in `src/services/Datapipelinefailuremodes.test.ts`.

| ID | Failure injected | Expected output | Test | Actual output | Result |
|---|---|---|---|---|---|
| FM-E2E-01 | Service down, nothing cached | One assessment per subzone, each with 5 contributions and Data Confidence MEDIUM; `dataTimeStamp` equals the backup's original date | `FM-E2E-01` | Backup flagged as bundled; one assessment for each of the 6 mock subzones, each with 5 contributions, confidence MEDIUM, original timestamp | Pass |
| FM-E2E-02 | Service down, cache older than 1 hour | Every dataset STALE; confidence MEDIUM (fresh data: HIGH); 5 contributions; risk index unchanged | `FM-E2E-02` | All datasets STALE; fresh confidence HIGH, stale confidence MEDIUM; 5 contributions; identical risk index | Pass |
| FM-E2E-03 | Service down, cached clusters dataset FAILED | Clusters stay FAILED, other datasets STALE; no assessment (null), `assessAll` returns `[]` | `FM-E2E-03` | Clusters FAILED, high-Aedes STALE; `generateAssessment` returned null; `assessAll` returned `[]` | Pass |

## 3. Recovery

| ID | Failure injected | Expected output | Test | Actual output | Result |
|---|---|---|---|---|---|
| FM-REC-01 | Service fails once, then works | Call 1: bundled fallback, nothing saved. Call 2: fresh data, saved once. Call 3: served from the cache, service called 2 times in total | `FM-REC-01` | Call 1: backup flagged, `setItem` not called. Call 2: fresh snapshot (clusters FRESH, not flagged), `setItem` called once. Call 3: equal to the snapshot, service called 2 times | Pass |

## 4. Snapshots rejected before they reach the risk engine

| ID | Failure injected | Expected output | Test | Actual output | Result |
|---|---|---|---|---|---|
| FM-VAL-01 | Service returns a snapshot whose humidity baseline SD is 0 | Validator returns false; bundled backup used and flagged; the bad snapshot is not cached | `FM-VAL-01` | `isPublicDataSnapshot` returned false; backup returned and flagged; `setItem` not called | Pass |
| FM-VAL-02 | Service returns a snapshot with one blank cluster location | **Observation:** validator rejects the whole snapshot; bundled backup used and flagged. See Findings | `FM-VAL-02 (observation)` | `isPublicDataSnapshot` returned false for the whole snapshot; backup returned and flagged | Pass (records current behaviour) |

## 5. Reweighting and Data Confidence

For FM-RW-01 to FM-RW-06 the factor scores are fixed: clusters 80, high-Aedes 60, density 40, humidity 30, rainfall 20. Rank-sum weights are 5, 4, 3, 2, 1 out of 15. A missing factor is simulated by a calculator returning null, because a validated snapshot always has usable weather.

| ID | Failure injected | Expected output | Test | Actual output | Result |
|---|---|---|---|---|---|
| FM-RW-01 | None (reference) | 5 contributions, index 56, HIGH level, confidence HIGH | `FM-RW-01` | 5 contributions, index 56, HIGH level, confidence HIGH | Pass |
| FM-RW-02 | Humidity missing | 4 contributions; the available weight is 13/15, so each remaining weight is divided by 13/15 and the index is 60 (not 52); level HIGH; confidence MEDIUM; clusters contribute 80 x 5 / 13 = 30.77 | `FM-RW-02` | 4 contributions, none for humidity; index 60; level HIGH; confidence MEDIUM; clusters contributed 30.77; contributions add up to the index | Pass |
| FM-RW-03 | Humidity and rainfall missing | 3 contributions, index 63.3, confidence LOW | `FM-RW-03` | 3 contributions, index 63.3, confidence LOW | Pass |
| FM-RW-04 | Two factors missing and a dataset STALE | Confidence LOW (missing data takes priority) | `FM-RW-04` | Confidence LOW | Pass |
| FM-RW-05 | Core factor (dengue clusters) missing | No assessment (null); `assessAll` returns `[]` | `FM-RW-05` | `generateAssessment` returned null; `assessAll` returned `[]` | Pass |
| FM-RW-06 | Every factor missing | No assessment (null) | `FM-RW-06` | `generateAssessment` returned null | Pass |
| FM-RW-07 | High-Aedes dataset FAILED, all overlap ratios 0 (real calculators) | **Observation:** 5 contributions, Aedes contributes 0 points, confidence HIGH. See Findings | `FM-RW-07 (observation)` | 5 contributions; high-Aedes contribution 0; confidence HIGH | Pass (records current behaviour) |
| FM-RW-08 | Humidity and rainfall baselines unusable (SD 0), engine given the snapshot directly (real calculators) | Both factors dropped (3 contributions), confidence LOW, contributions add up to the index | `FM-RW-08` | 3 contributions, none for humidity or rainfall; confidence LOW; contributions add up to the index | Pass |

## Summary

| Section | Rows | Pass |
|---|---|---|
| 1. Fallback (existing proxy tests from #13) | 7 | 7 |
| 2. Fallback into the risk engine | 3 | 3 |
| 3. Recovery | 1 | 1 |
| 4. Rejected snapshots | 2 | 2 |
| 5. Reweighting and Data Confidence | 8 | 8 |
| **Total** | **21** | **21** |

## Findings

Both findings were found by testing and confirmed by reading `sync-data.ts`. Neither was fixed here, because the ticket tests P1's and P3's code without changing it.

- **FM-RW-07, FAILED non-core dataset:** the calculators never read dataset status, and `determineDataConfidence` only checks for STALE datasets. A FAILED high-Aedes dataset that arrives with all-zero overlap is therefore scored as 0 and reported with confidence HIGH. This may be intended, because the control-flow graph for data confidence mentions "stale" only. How reachable it is: in `sync-data.ts`, any thrown error (including a failed download) ends in `process.exit(1)`, so no snapshot is published and the last good one stays. The script only writes FAILED for clusters or high-Aedes when the dynamic file is missing after the download call, which needs `DataGovSgAdapter` to return without throwing (not checked in this ticket). In that case the script substitutes an empty feature list and its all-zero guard still lets the snapshot through when the other dataset has data. Recorded for P1 to decide and P4 to confirm the adapter behaviour.
- **FM-VAL-02, blank cluster location:** `sync-data.ts` writes `location: f.properties.LOCALITY ?? ''` for every cluster. It never runs `isPublicDataSnapshot` before writing `latest-snapshot.json`; its only guard is the all-zero metrics check. The validator requires a non-empty location. One cluster without a locality would therefore make the whole published snapshot unusable in the browser, so users would see the bundled backup although the sync job succeeded. It is not known whether the NEA data ever omits LOCALITY, and a separate workflow step that validates the file was not checked. Suggested fix for P3 and P4: write a default such as "Unknown location" for a blank locality, and validate the final snapshot before writing it.