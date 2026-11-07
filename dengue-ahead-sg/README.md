# DengueAheadSG

A website to check dengue clusters and how risky an area is, as an extra precaution against dengue in Singapore.

> Not an official NEA forecast or medical advice.

## What it does

- **Risk map** of all Singapore planning subzones coloured by a four-level dengue risk index (Low to Very High).
- **Search** by subzone name, postal code or address; the app finds the planning subzone and shows its risk.
- **Score breakdown** showing how the five risk factors contribute to the selected area's index.
- **Prevention guidance**: personalised tips for the selected area plus the full NEA prevention checklist.
- **Simulate risk**: adjust humidity, past rainfall and high-Aedes overlap to see how the risk band would change.
- **Data freshness warnings** when public data is stale and a bundled backup when live data cannot be loaded.

## Tech stack

| Layer | Tool | Version |
|---|---|---|
| Language | TypeScript | ~6.0 |
| UI | React | 19 |
| Map | Leaflet + [OneMap](https://www.onemap.gov.sg/docs/maps/index.html) tiles | Leaflet 1.9 |
| Spatial maths | Turf.js (`@turf/turf`) | 7 |
| Build / dev server | Vite (+ `@vitejs/plugin-react`) | 8 |
| Tests | Vitest + jsdom | 5 |
| Scripts | `tsx` (runs the data-pipeline scripts) | 4 |
| Hosting | Vercel (static site + server functions in `api/`) | |
| Data pipeline | GitHub Actions (hourly) | |
| Runtime | Node.js | 22 LTS or newer (developed on 24; CI uses 22) |
| Package manager | npm | comes with Node |

Please use **npm** (not yarn/pnpm) so everyone shares the same `package-lock.json`.

## Getting started

```bash
git clone https://github.com/Feryan123/SC2006-DengueAheadSG.git
cd SC2006-DengueAheadSG/dengue-ahead-sg   # the app lives in this subfolder
npm install
npm run dev                               # open the URL it prints (usually http://localhost:5173)
```

All commands below are run inside `dengue-ahead-sg/` (the folder with `package.json`).

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Type-check (`tsc`) and build to `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npx tsc --noEmit` | Type-check only — run before every commit |
| `npm test` | Run all tests once (Vitest, no watch mode). `npm test -- --run` also works |
| `npm run sync` | Run the data pipeline locally and write `data/derived/latest-snapshot.json` (see [Data pipeline](#data-pipeline)) |
| `npm run build-static` | Rebuild the committed files in `data/derived/` (rarely needed) |
| `npm run sensitivity` | Run the risk-weight sensitivity analysis on a snapshot |

### Local data and OneMap search

Vite does not run the Vercel functions in `api/`, so two things work differently under `npm run dev`:

- **Risk data.** The app reads `/latest-snapshot.json` from `public/` (gitignored). Create it with
  `npm run sync`, then copy the result:

  ```bash
  cp data/derived/latest-snapshot.json public/latest-snapshot.json
  ```

  Without this file the app falls back to the bundled backup snapshot and shows its warning banner.
- **Address and postal-code search.** `vite.config.ts` proxies `/api/onemap-search` to the deployed function at
  `https://dengue-ahead-sg-three.vercel.app`, so no OneMap credentials are needed locally. Subzone-name search uses the
  loaded snapshot. Production uses this repository's own API route.

### Environment variables

| Variable | Used by | Where to set it |
|---|---|---|
| `ONEMAP_EMAIL`, `ONEMAP_PASSWORD` | `api/onemap-search.ts` | Vercel project environment variables |
| `SNAPSHOT_GITHUB_TOKEN` | `api/snapshot.ts` | Vercel project environment variables |
| `DATA_GOV_API_KEY` | `npm run sync` (sent to data.gov.sg as `x-api-key` when set) | GitHub Actions secret; locally in an untracked `.env` file, which `npm run sync` loads |

`.env.example` lists the OneMap placeholders. **Never** give a secret a `VITE_*` name: those variables are built into the
public frontend. `.env*` files are ignored by Git (except `.env.example`).

## How data flows through the website

```
 data.gov.sg datasets
          |
          v
 GitHub Action, hourly (npm run sync)
          |   publishes one validated snapshot
          v
 data branch (latest-snapshot.json)
          |
          v
 /api/snapshot (Vercel function)
          |
          v
 Browser: CachedPublicDataServiceProxy  --->  controls  --->  boundaries
          |                  |
          |                  +-- localStorage cache (1 hour)
          +-- bundled backup snapshot (last resort)


 Address / postal code
          |
          v
 /api/onemap-search (Vercel function, holds the OneMap login)
          |
          v
 OneMap
```

- The hourly GitHub Action downloads public datasets, joins them to subzones and publishes one validated snapshot to the private `data` branch.
- `api/snapshot.ts` serves that snapshot to the browser, because the repository is private.
- In the browser, `CachedPublicDataServiceProxy` caches it and falls back to the bundled copy if everything else fails.
- The controls calculate risk from the snapshot; the boundaries (React components) display it.

## Data pipeline

`npm run sync` (`scripts/sync-data.ts`) builds the snapshot. It is run hourly by
`.github/workflows/sync-data.yml` (at minute :17, and manually through **Run workflow**).

| Dataset | Source (data.gov.sg) | Refresh |
|---|---|---|
| Subzone boundaries (URA Master Plan 2019) and 2020 population density | static datasets | Downloaded once, then cached in `data/static/` |
| Dengue clusters, high-Aedes areas | GeoJSON downloads | Every run (hourly) |
| Monthly rainfall, monthly relative humidity | datastore tables | At most once per day (skipped when the file is under 24 hours old, or on a CI cache hit) |

What the script does:

1. Downloads the datasets into `data/static/` and `data/dynamic/` (both gitignored). The adapter
   (`src/services/DataGovSgAdapter.ts`) retries failed requests with exponential backoff.
2. Spatially joins clusters and high-Aedes areas to the subzones in `data/derived/subzones.json` with Turf
   (`src/services/turf.ts`), giving each subzone its nearby-cluster cases and high-Aedes overlap ratio.
   A cluster or area outside every subzone is skipped with a warning.
3. Builds the national weather profile: humidity from the latest month, rainfall from 2–3 months back, each compared
   with that calendar month's normal in `data/derived/weatherBaselines.json`.
4. Marks each dataset `FRESH`, `STALE` or `FAILED`.
5. **Validates before publishing.** Empty weather records, a missing baseline or all-zero subzone metrics make the script
   exit with an error, so the last good snapshot stays published.
6. Writes `data/derived/latest-snapshot.json` (the `PublicDataSnapshot` shape in `ApprovedPublicDataServiceBoundary.ts`)
   and a small `snapshot.json` manifest.

The workflow then force-pushes both files to the **`data`** branch. That branch is not merged into `master`.

`npm run build-static` (`scripts/build-static.ts`) regenerates the two committed files in `data/derived/`
(`subzones.json`: boundaries plus census density; `weatherBaselines.json`: monthly means and standard deviations,
humidity 2014–2025 and rainfall 1991–2020). Run `npm run sync` first because it reads the downloaded files.
Normally these files do not change.

## Risk model

Each subzone's **risk index (0–100)** is a weighted sum of five factor scores. Weights come from a ranking of the factors
turned into weights with the **rank-sum** method. All settings live in `src/control/riskModelConfig.ts`
(`SCORING_VERSION` 2.0.0).

| Rank | Factor | Weight | Score (0–100) |
|---|---|---|---|
| 1 | Dengue clusters nearby | 5/15 | Percentile of nearby cluster cases among all subzones |
| 2 | High-Aedes area overlap | 4/15 | Percentile of the overlap ratio among all subzones |
| 3 | Population density | 3/15 | Percentile among subzones that have residents |
| 4 | Humidity | 2/15 | Distance from the month's normal (z-score, capped at ±2 SD) |
| 5 | Lagged rainfall (2–3 months ago) | 1/15 | Distance from the month's normal (z-score, capped at ±2 SD) |

- **Risk levels:** Low below 25, Moderate from 25, High from 50, Very High from 75.
- **Missing factors** are dropped and the remaining weights rescaled. If the core factor (dengue clusters) is unavailable,
  no assessment is produced and the area is shown in grey.
- Each factor has its own calculator in `src/control/calculators/` (Strategy pattern, one class per factor), combined by
  `RiskAssessmentControl`.
- Data counts as stale when a dataset is `STALE` or `FAILED`, or when hourly data was fetched more than 3 hours ago.

How robust the weights are is analysed in [`../lab4/sensitivity-analysis.md`](../lab4/sensitivity-analysis.md)
(reproduce with `npm run sensitivity`).

## OneMap search proxy

`api/onemap-search.ts` is a server-only Vercel function. It keeps the OneMap login and token on the server and supports
address and postal-code geocoding for location assessment.

**Endpoint:** `GET /api/onemap-search?searchVal=200640`. It accepts an address or postal code, trims whitespace, and
requests the first OneMap search page with coordinates and address details.

| Response | Meaning |
|---|---|
| `200`, with `found`, `totalNumPages`, `pageNum`, `results` | Search succeeded. No match means `found: 0` and `results: []`. |
| `400`, with `error` | Search text is missing or empty. |
| `405`, with `error` | Only GET is supported. |
| `503`, with `error` | Configuration, authentication or the OneMap service is unavailable. |

Results keep OneMap's string fields, including `ADDRESS`, `POSTAL`, `LATITUDE` and `LONGITUDE`. The proxy does not
select a result or identify a subzone. Only address fields and pagination are returned; authentication responses and
private upstream errors are never sent to the frontend. Responses use `Cache-Control: no-store`.

**Frontend adapter.** `GeocodingMapServiceBoundary.geocodeLocation()` (`src/services/`) calls this proxy, takes the first
result and parses its coordinates to `[longitude, latitude]`. It never calls OneMap directly. It returns `null` when the
address is not found (an invalid location) and throws `GeocodingUnavailableError` when the proxy or network fails,
so callers can tell a bad address from a service problem. `LocationRiskControl` then maps the coordinates to a planning
subzone.

### Private configuration

`.env.example` contains empty `ONEMAP_EMAIL` and `ONEMAP_PASSWORD` placeholders. Set the real values privately in the
server runtime's environment. A local `.env.local` file is ignored by Git, but the function does not load it by itself;
the server runtime must load it. Do not copy an access token into code.

The function obtains its own token, checks OneMap's expiry timestamp, reuses the token in memory and renews it 60 seconds
early. It also renews once after HTTP 401 or a token error inside HTTP 200. A second rejection returns 503 and discards
that token. Each upstream request has a 10-second timeout. The cache belongs to one running server instance; a cold start
or another instance obtains its own token.

Run the proxy tests without real credentials:

```bash
npm test -- --run tests/onemap-search.test.ts
```

The automated tests simulate OneMap replies and do not contact OneMap. A separate local Node.js HTTP check also verified
real searches, token reuse and renewal after OneMap rejected a test token. Recorded results:
[ticket #55](../testing/tests/ticket-55.md).

Official references: [authentication](https://www.onemap.gov.sg/apidocs/authentication),
[search](https://www.onemap.gov.sg/apidocs/search),
[token errors](https://www.onemap.gov.sg/apidocs/docs/verifyingsearchapitoken),
and [Vercel Node.js functions](https://vercel.com/docs/functions/runtimes/node-js).

## Public data cache

`SnapshotDataService` reads a published JSON snapshot from its supplied URL and validates it.
`CachedPublicDataServiceProxy` wraps that reader and takes the bundled backup snapshot as its second constructor
argument. Both implement `ApprovedPublicDataServiceBoundary`, so controls keep calling `retrievePublicData()` through the
same contract. `Startup.ts` supplies the URL (`/api/snapshot` when deployed, `/latest-snapshot.json` under `npm run dev`)
and imports the backup with the app.

The Proxy saves validated public data in `localStorage` under `dengue-ahead-sg:public-data:v1`. It reuses that copy only
while **both** the time it was saved and the snapshot's own `generatedAt` are under one hour old; otherwise it requests an
update. If that request fails, it uses the last good cache, then the bundled backup. Invalid responses never replace good
saved data. Blocked or full storage does not prevent a successful download from being used.

Old-cache recovery and the bundled backup keep their original timestamps. Their dataset statuses become `STALE`, while
`FAILED` stays `FAILED`. Backup data is also flagged so screens show a warning. If all three sources are unusable, the
service throws a safe unavailable-data error for the calling control to handle. The reader has a 10-second timeout.

The downloaded and bundled data must match `PublicDataSnapshot`: generated time, dataset statuses, real subzone polygons
and metrics, population profiles, cluster/Aedes records and the national monthly weather profile. The reader uses a
public snapshot URL and sends no API key.

Run its checks with `npm test -- --run src/services/CachedPublicDataServiceProxy.test.ts`.
Failure-mode tests for the whole path are in `src/services/dataPipelineFailureModes.test.ts`
(see [`../lab4/testing/ticket-34.md`](../lab4/testing/ticket-34.md)).

### Bundled backup snapshot

`src/data/bundled-snapshot.json` is a saved copy of a published snapshot, used only when a request fails and there is no
usable cache. The hourly pipeline does **not** update it, so it keeps its original date and the app warns that it may be
old. Refreshing it is optional (worth doing before a release so the fallback is not stale): replace the JSON with a
validated published snapshot and update the source details. See [`src/data/README.md`](src/data/README.md) for its
current source commit and the refresh steps.

### Snapshot hosting

The repository is private, so the browser cannot download the snapshot from the `data` branch directly.
`api/snapshot.ts` is a server-only Vercel function that reads `dengue-ahead-sg/data/derived/latest-snapshot.json` from the
`data` branch through the GitHub API and returns it as compact JSON (the committed file is pretty-printed and larger than
a function response may be).

| Where | Snapshot URL |
|---|---|
| Deployed (`npm run build`) | `/api/snapshot` |
| `npm run dev` | `/latest-snapshot.json`, a local copy in `public/` (gitignored) |

**Secret:** set `SNAPSHOT_GITHUB_TOKEN` in the Vercel project's environment variables. Use a fine-grained personal access
token limited to this repository with **Contents: Read-only** and nothing else.

The CDN caches successful responses for 10 minutes (the sync runs hourly), and each server instance reuses its copy for
10 minutes. If GitHub is unavailable, the function serves its last good copy; with none, it returns `503` and the
browser's cache Proxy falls back as described above. Errors never include the token or GitHub's reply.

Run its checks with `npm test -- --run tests/snapshot.test.ts`.

## Dashboard and risk map

The website opens directly on the dashboard. Search by subzone name, postal code or address, click an outline, or use the
area list. Purple dashed lines mark subzones; the selected area has a solid bright pink outline.

The legend shows four risk levels, from light blue (Low) to dark blue (Very High). Grey means no risk assessment is
available; it does not mean Low risk. Map and result colours share `src/boundary/riskLevelStyle.ts`.

The compact desktop toolbar puts the heading and search side by side. **Across Singapore** shows the snapshot's subzone,
dengue-cluster and High-Aedes area counts. These are national dataset counts, not case counts for the selected area.
Failed overlay data is labelled **Unavailable**. One **Data updated** time appears beside the totals. Stale-data details
can be expanded from the warning. If the OneMap base-map images fail to load, a base-map warning appears.

Selecting an area shows its risk index beside a fixed map preview, with the **Score breakdown** below them in the same
panel. The preview cannot be dragged or zoomed. Readings and points are visible without factor dropdowns. The single
**How is this calculated?** button opens the settings and research links. Data-confidence help also shows the assessment
time. Desktop panels reserve the same space before and after selection. Phones stack the result before the map.

The selected area's cluster summary sits inside the main map card, above its legend. It reuses `clustersForSubzone`,
including clusters that overlap the area. Case totals refer to the linked clusters, which may cross subzone boundaries.
The row distinguishes no selection, no recorded clusters and unavailable data; national totals remain separate.

The **Highest-risk subzones** list shows three entries initially; **View all 10** expands it. Areas without assessments are
left out of that list.

**Prevention guidance** appears below the map. With no area selected it shows the NEA guidance; once an area is selected
the result panel shows personalised tips for that area, and the full NEA checklist stays available in an expandable
section. Tips and checklist links come from `PreventionGuidanceControl`.

The page has a skip link and keyboard navigation, and the layout adapts to phones.

Leaflet displays [OneMap tiles](https://www.onemap.gov.sg/docs/maps/index.html) with the required SLA attribution.
Subzone outlines come from
[URA's Master Plan 2019 dataset](https://data.gov.sg/datasets/d_8594ae9ff96d0c708bc2af633048edfb/view),
available under the [Singapore Open Data Licence](https://data.gov.sg/open-data-licence).

## Inline simulation

**Simulate risk** opens a simulation panel on the same page. The main map and other dashboard sections are hidden
temporarily. The controls, selected-area preview and current/simulated comparison are grouped together. The preview
changes colour when the simulated risk band changes.

Sliders and numeric inputs adjust humidity (0–100%), rainfall from 2–3 months ago (zero or more mm) and high-Aedes area
overlap (0–100%). Numeric inputs accept decimal values. Typing higher rainfall extends the slider's range. Empty,
negative, non-finite or out-of-range percentage values show a correction message. **Reset to baseline** restores the
original values. **Back to current risk map** returns to the dashboard. The original assessment and stored data stay
unchanged.

`ScenarioAdjustment` accepts either an `adjustmentLevel` preset or an exact `value`. The control rejects missing or
conflicting inputs. Exact raw values use humidity percent, rainfall mm and an Aedes overlap ratio from 0–1; the UI
converts its overlap percentage to that ratio. The simulation runs on a copy of the snapshot and reuses
`RiskAssessmentControl`, so scoring weights, normalisation and risk bands are the same as the live map.

`App` keeps the selected subzone, its original assessment and its snapshot together. `Startup.ts` creates the shared
services and controls (`locationControl`, `mapControl`, `preventionControl`, `simulationControl`) and `main.tsx` passes
them to `App`. `DashboardIcon.tsx` draws small SVG icons without an icon library.

Local check record and diagram follow-ups: [dashboard UI/UX](../testing/tests/ui-dashboard.md).

## Project structure

The code follows the **Entity–Control–Boundary** pattern from our class diagram. Boundary components display the
dashboard; controls keep the business logic.

```
dengue-ahead-sg/
├── api/                     Vercel server functions (onemap-search.ts, snapshot.ts)
├── data/derived/            committed inputs to the pipeline: subzones.json, weatherBaselines.json
├── scripts/                 data pipeline: sync-data.ts, build-static.ts, sensitivity-analysis.ts, lib/
├── tests/                   tests for the api/ functions
├── docs/, lab5/             black-box test design, traceability matrix
├── public/                  logo (+ local latest-snapshot.json, gitignored)
└── src/
    ├── main.tsx             React entry point
    ├── Startup.ts           creates the services and controls shared by the app
    ├── App.tsx              Root component (dashboard selection and simulation)
    ├── style.css
    ├── entity/              <<entity>> — data shapes only, no logic
    │   ├── enums.ts         all enumerations
    │   └── *.ts             RiskAssessment, PlanningSubzone, DengueCluster, ...
    ├── control/             <<control>> — business logic, no React
    │   ├── *Control.ts      LocationRiskControl, RiskAssessmentControl, RiskMapControl, ...
    │   ├── calculators/     one RiskFactorCalculator per risk factor
    │   ├── riskModelConfig.ts  weights, risk bands, freshness limits
    │   └── dataFreshness.ts, clustersForSubzone.ts
    ├── boundary/            <<boundary>> — React components (dashboard sections)
    │   └── *.tsx            RiskMapBoundary, RiskResultBoundary, SelectedAreaPreview, ...
    ├── services/            <<boundary>> to external systems and data
    │   ├── GeocodingMapServiceBoundary.ts      OneMap search via our proxy
    │   ├── ApprovedPublicDataServiceBoundary.ts  snapshot contract
    │   ├── SnapshotDataService.ts, CachedPublicDataServiceProxy.ts, validatePublicDataSnapshot.ts
    │   ├── SubzoneBoundaryService.ts           outlines for the map
    │   ├── DataGovSgAdapter.ts, turf.ts        used by the sync script
    │   └── mocks/                              fake data service used by tests
    ├── data/                bundled-snapshot.json (backup) and its README
    └── assets/              subzones.geojson (map outlines)
```

Dependency rule: `boundary → control → entity / services`. Boundaries never call services directly, and controls never
import React. The scripts in `scripts/` reuse `src/services/` and `src/control/`.

### Use cases → files

| Use case | Boundary | Control |
|---|---|---|
| UC-1 Assess Location Risk | RiskMapBoundary, RiskResultBoundary | LocationRiskControl, RiskAssessmentControl |
| UC-2 Explore Risk Map | RiskMapBoundary | RiskMapControl |
| UC-3 View Prevention Guidance | PreventionGuidanceBoundary | PreventionGuidanceControl |
| UC-4 Simulate Risk Scenario | SimulationBoundary | RiskSimulationControl |
| UC-5 Identify Planning Subzone | (via UC-1) | LocationRiskControl + GeocodingMapServiceBoundary |
| Retrieve / Refresh Public Data (not a use case; covered by NFR-REL and NFR-FRS in the SRS) | (none) | ApprovedPublicDataServiceBoundary: SnapshotDataService, CachedPublicDataServiceProxy |

## Testing

```bash
npm test                          # all tests, once
npm test -- --run <path>          # one file, e.g. src/control/RiskAssessmentControl.test.ts
npx tsc --noEmit                  # type-check
```

Tests use Vitest with jsdom. They use simulated responses and **never call live APIs**. Pull requests to `master` run the
full suite on GitHub Actions (`.github/workflows/run-tests.yml`, Node 22).

| Where | What it holds |
|---|---|
| `src/**/*.test.ts(x)`, `scripts/**/*.test.ts`, `tests/` | Automated tests next to the code they check |
| [`../testing/tests/`](../testing/tests/) | Recorded results for individual tickets (#13, #19, #20, #22, #32, #55, #57, #58, dashboard UI) |
| [`../lab4/testing/`](../lab4/testing/) | Lab 4 black-box and white-box test design, and the pipeline failure-mode tests (#34) |
| [`docs/black-box-test-design.md`](docs/black-box-test-design.md) | Black-box test design for `RiskAssessmentControl` (#25) |
| [`lab5/traceability-matrix.md`](lab5/traceability-matrix.md) | Requirements → use cases → methods → tests |
| [`../lab4/sensitivity-analysis.md`](../lab4/sensitivity-analysis.md) | Risk-weight sensitivity analysis (#35) |

## Conventions

- **Names come from the class diagram.** Use its exact class, method and attribute names. If something in the diagram is unclear, write `TODO(verify)` instead of guessing, and raise it with the team.
- **No TypeScript `enum`.** `tsconfig.json` has `erasableSyntaxOnly` on, so enums are written as a `const` object plus a type of the same name:
  ```ts
  export const QueryType = { Address: 'ADDRESS', PostalCode: 'POSTAL_CODE' } as const;
  export type QueryType = (typeof QueryType)[keyof typeof QueryType];
  ```
- **Type-only imports use `import type`** (required by `verbatimModuleSyntax`), and local imports include the extension: `import type { RiskAssessment } from './RiskAssessment.ts';`
- **Test with mocks and fixtures, not live APIs.** Use `services/mocks/MockPublicDataService.ts` or small fixtures in tests so nobody needs API keys to run them.
- **Keep the header comment** at the top of each file up to date (what it does and which ticket or use case it traces to).
- **Never commit secrets.** Keep private keys and credentials in server-only environment variables. Only deliberately public frontend configuration may use `import.meta.env.VITE_*`.

## Contributing

1. With a clean working tree, run `git fetch origin`, then create your ticket branch from `origin/master`: `git switch -c <name>/<feature> origin/master`.
2. Make your changes, then run `npx tsc --noEmit`, `npm test` and `npm run build`. All three must pass.
3. Push and open a pull request to `master`; the test workflow runs automatically. Ask one teammate to review before merging.

## Credits and licences

- Map tiles: [OneMap](https://www.onemap.gov.sg/) (Singapore Land Authority).
- Data: [data.gov.sg](https://data.gov.sg/) under the [Singapore Open Data Licence](https://data.gov.sg/open-data-licence).
- Prevention guidance: [NEA](https://www.nea.gov.sg/dengue-zika/prevent-aedes-mosquito-breeding).

## Reference

The design documents are kept in the team's Google Doc: [DengueAheadSG design document](https://docs.google.com/document/d/1p54W_7tYFbcrcK1JOqbXpyvwVqKzi7mM7uej5McBVsg/edit?usp=sharing). It holds:

- Use case diagram and use case descriptions (UC-1 to UC-5 and their sub-use cases)
- Class diagram
- System architecture diagram
- UI flow
- Control flow graphs: risk level, data confidence and personalised tips
