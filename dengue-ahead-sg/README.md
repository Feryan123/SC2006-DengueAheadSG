# DengueAheadSG

A website to check dengue clusters and how risky an area is, as an extra precaution against dengue in Singapore.

> Not an official NEA forecast or medical advice.

## Tech stack

| Layer | Tool | Version |
|---|---|---|
| Language | TypeScript | ~6.0 |
| UI | React | 19 |
| Build / dev server | Vite (+ `@vitejs/plugin-react`) | 8 |
| Runtime | Node.js | 22 LTS or newer (developed on 24) |
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
| `npm test -- --run` | Run the tests once, without watch mode |

## OneMap search proxy (ticket #55)

`api/onemap-search.ts` is a server-only Vercel function. It supports the geocoding
service boundary used by location assessment. The frontend adapter, coordinate
parsing and subzone lookup are P2's ticket #14.

Proposed integration endpoint: `GET /api/onemap-search?searchVal=200640`.
It accepts an address or postal code, trims whitespace, and requests the first
OneMap search page with coordinates and address details. P2 still needs to review
this interface before integration.

| Response | Meaning |
|---|---|
| `200`, with `found`, `totalNumPages`, `pageNum`, `results` | Search succeeded. No match means `found: 0` and `results: []`. |
| `400`, with `error` | Search text is missing or empty. |
| `405`, with `error` | Only GET is supported. |
| `503`, with `error` | Configuration, authentication or the OneMap service is unavailable. |

Results keep OneMap's string fields, including `ADDRESS`, `POSTAL`, `LATITUDE`
and `LONGITUDE`. The proxy does not select a result or identify a subzone. Only
address fields and pagination are returned; authentication responses and private
upstream errors are never sent to the frontend. Responses use `Cache-Control: no-store`.

### Private configuration

`.env.example` contains empty `ONEMAP_EMAIL` and `ONEMAP_PASSWORD` placeholders.
Set the real values privately in the server runtime's environment. A local
`.env.local` file is ignored by Git, but the function does not load it by itself;
the server runtime must load it. Never use `VITE_*` for these credentials: those
variables are public in the frontend build. Do not copy an access token into code.

The function obtains its own token, checks OneMap's expiry timestamp, reuses the
token in memory and renews it 60 seconds early. It also renews once after HTTP 401
or a token error inside HTTP 200. A second rejection returns 503 and discards that
token. Each upstream request has a 10-second timeout. The cache belongs to one
running server instance; a cold start or another instance obtains its own token.

### Local checks and remaining integration

Vite does not run this Vercel function locally. The dashboard's development
proxy forwards `/api/onemap-search` to the existing deployed function, as
described under **Inline simulation and local preview** below.

Run the proxy tests without real credentials:

```bash
npm test -- --run tests/onemap-search.test.ts
npx tsc --noEmit
npm run build
```

The automated tests simulate OneMap replies and do not contact OneMap. A separate
local Node.js HTTP check also verified real searches, token reuse and renewal
after OneMap rejected a test token. Expiry timing is checked by the automated
tests. The dashboard now uses the integrated location control and deployed proxy.

Recorded test results: [ticket #55](../testing/tests/ticket-55.md).

Official references: [authentication](https://www.onemap.gov.sg/apidocs/authentication),
[search](https://www.onemap.gov.sg/apidocs/search),
[token errors](https://www.onemap.gov.sg/apidocs/docs/verifyingsearchapitoken),
and [Vercel Node.js functions](https://vercel.com/docs/functions/runtimes/node-js).

## Public data cache

`SnapshotDataService` reads a published JSON snapshot using its supplied URL.
`CachedPublicDataServiceProxy` wraps that reader and takes the bundled backup
snapshot as its second constructor argument. Both implement
`ApprovedPublicDataServiceBoundary`, so controls keep calling
`retrievePublicData()` through the same contract. The start-up code supplies
the URL and imports the backup with the app.

The Proxy saves validated public data in `localStorage` under
`dengue-ahead-sg:public-data:v1`. It reuses the cache for one hour. At exactly
one hour it requests an update. If that request fails, it uses the last good
cache, then the bundled backup. Invalid responses never replace good saved
data. Blocked or full storage does not prevent a successful download from
being used.

Old-cache recovery and the bundled backup keep their original timestamps.
Their dataset statuses become `STALE`, while `FAILED` stays `FAILED`.
If all three sources are unusable, the service throws a safe unavailable-data
error for the calling control to handle. The reader has a 10-second timeout.

The downloaded and bundled data must match `PublicDataSnapshot`: generated
time, dataset statuses, real subzone polygons and metrics, population profiles,
cluster/Aedes records and the national monthly weather profile. The reader
uses a public snapshot URL and sends no API key. Private data-source credentials
belong in the pipeline's server environment.

Run its checks with `npm test -- --run src/services/CachedPublicDataServiceProxy.test.ts`.

### Snapshot hosting (ticket #27)

The repository is private, so the browser cannot download the snapshot from
the `data` branch directly. `api/snapshot.ts` is a server-only Vercel function
that reads `dengue-ahead-sg/data/derived/latest-snapshot.json` from the `data`
branch through the GitHub API and returns it as compact JSON (about 2.7 MB; the
committed file is pretty-printed and larger than a function response may be).

| Where | Snapshot URL |
|---|---|
| Deployed (`npm run build`) | `/api/snapshot` |
| `npm run dev` | `/latest-snapshot.json`, a local copy in `public/` (gitignored) |

Vite does not run Vercel functions, so for local work copy the latest snapshot
into `public/` first (`npm run sync` writes `data/derived/latest-snapshot.json`):

```bash
cp data/derived/latest-snapshot.json public/latest-snapshot.json
```

**Secret:** set `SNAPSHOT_GITHUB_TOKEN` in the Vercel project's environment
variables. Use a fine-grained personal access token limited to this repository
with **Contents: Read-only** and nothing else. Never use a `VITE_*` name: those
values are built into the public frontend.

The CDN caches successful responses for 10 minutes (the sync runs hourly), and
each server instance reuses its copy for 10 minutes. If GitHub is unavailable,
the function serves its last good copy; with none, it returns `503` and the
browser's cache Proxy falls back as described above. Errors never include the
token or GitHub's reply.

Run its checks with `npm test -- --run tests/snapshot.test.ts`.
## Dashboard and risk map

The website opens directly on the dashboard. Search by subzone name, postal
code or address, click an outline, or use the area list. Purple dashed lines mark subzones;
the selected area has a solid bright pink outline.

The legend shows four risk levels, from light blue (Low) to dark blue (Very High).
Grey means no risk assessment is available; it does not mean Low risk. Map and
result colours share `src/boundary/riskLevelStyle.ts`.

Selecting an area shows its risk index and a fixed map preview beside the main
map. The preview cannot be dragged or zoomed. Factor cards and expandable NEA
guidance appear below. **How is this calculated?** opens an explanation of the
existing model settings and links to the research recorded in the planning notes.
The **Highest-risk subzones** list shows three entries initially; **View all 10**
expands it. Areas without assessments are left out of that list.

Leaflet displays [OneMap tiles](https://www.onemap.gov.sg/docs/maps/index.html)
with the required SLA attribution. Subzone outlines come from
[URA's Master Plan 2019 dataset](https://data.gov.sg/datasets/d_8594ae9ff96d0c708bc2af633048edfb/view),
available under the [Singapore Open Data Licence](https://data.gov.sg/open-data-licence).

## Inline simulation and local preview

**Simulate risk** opens a simulation panel on the same page. The main map and
other dashboard sections are hidden temporarily. The controls, selected-area
preview and current/simulated comparison are grouped together. The preview
changes colour when the simulated risk band changes.

Sliders and numeric inputs adjust humidity (0–100%), rainfall from 2–3 months
ago (zero or more mm) and high-Aedes area overlap (0–100%). Numeric inputs accept
decimal values. Typing higher rainfall extends the slider's range. Empty,
negative, non-finite or out-of-range percentage values show a correction message.
**Reset to baseline** restores the original values. **Back to current risk map**
returns to the dashboard. The original assessment and stored data stay unchanged.

`ScenarioAdjustment` accepts either an existing `adjustmentLevel` preset or an
exact `value`. The control rejects missing or conflicting inputs. Exact raw
values use humidity percent, rainfall mm and an Aedes overlap ratio from 0–1;
the UI converts its overlap percentage to that ratio. Existing preset callers
remain supported. Scoring weights, normalisation and risk bands are unchanged.

`App` keeps the selected subzone, its original assessment and its snapshot
together. The start-up code still supplies `locationControl`, `mapControl`,
`preventionControl` and `simulationControl`. Existing controls perform the same
calculations; the simulation control also validates the exact input values.
Section backgrounds distinguish the map, rankings, factors, area recommendations
and full checklist. Risk colours continue to use the shared blue scale.
`DashboardIcon.tsx` draws small SVG icons for the actions without an icon library.

For local UI checks, `npm run dev` proxies address/postal searches to the existing
deployed `/api/onemap-search` function at `https://dengue-ahead-sg-three.vercel.app`.
No OneMap credentials are needed in the local frontend. Subzone-name search
uses the loaded snapshot. Production still uses this repository's own API route.
Use the local snapshot-copy instructions above to preview current risk data.

Local check record and diagram follow-ups: [dashboard UI/UX](../testing/tests/ui-dashboard.md).

## Project structure

The code follows the **Entity–Control–Boundary** pattern from our class diagram.
Boundary components display the dashboard; controls keep the business logic.
The selected-area preview and calculation popup are small presentation components.

```
src/
├── main.tsx              React entry point
├── App.tsx               Root component (dashboard selection and simulation)
├── style.css
├── entity/               <<entity>> — data shapes only, no logic
│   ├── enums.ts          all enumerations
│   └── *.ts              LocationQuery, PlanningSubzone, RiskAssessment, ...
├── control/              <<control>> — business logic, no React
│   └── *Control.ts       LocationRiskControl, RiskAssessmentControl, ...
├── boundary/             <<boundary>> — React components (dashboard sections)
│   └── *.tsx             RiskMapBoundary, SelectedAreaPreview, ...
└── services/             <<boundary>> to external systems
    ├── GeocodingMapServiceBoundary.ts
    ├── ApprovedPublicDataServiceBoundary.ts
    └── mocks/            fake implementations used until the real APIs are wired up
```

Dependency rule: `boundary → control → entity / services`. Boundaries never call services directly, and controls never import React.

### Use cases → files

| Use case | Boundary | Control |
|---|---|---|
| UC-1 Assess Location Risk | RiskMapBoundary, RiskResultBoundary | LocationRiskControl, RiskAssessmentControl |
| UC-2 Explore Risk Map | RiskMapBoundary | RiskMapControl |
| UC-3 View Prevention Guidance | PreventionGuidanceBoundary | PreventionGuidanceControl |
| UC-4 Simulate Risk Scenario | SimulationBoundary | RiskSimulationControl |
| UC-5 Identify Planning Subzone | (via UC-1) | LocationRiskControl + GeocodingMapServiceBoundary |

## Conventions

- **Names come from the class diagram.** Use its exact class, method and attribute names. If something in the diagram is unclear, write `TODO(verify)` instead of guessing, and raise it with the team.
- **No TypeScript `enum`.** `tsconfig.json` has `erasableSyntaxOnly` on, so enums are written as a `const` object plus a type of the same name:
  ```ts
  export const QueryType = { Address: 'ADDRESS', PostalCode: 'POSTAL_CODE' } as const;
  export type QueryType = (typeof QueryType)[keyof typeof QueryType];
  ```
- **Type-only imports use `import type`** (required by `verbatimModuleSyntax`), and local imports include the extension: `import type { RiskAssessment } from './RiskAssessment.ts';`
- **Mocks first.** Build against `services/mocks/` so nobody needs API keys to work. Swap in the real service once the feature works end to end.
- **Keep the header comment** at the top of each file up to date. Remove items from its `TO IMPLEMENT` list as you implement them.
- **Never commit secrets.** Keep private keys and credentials in server-only environment variables. `.env.local` is ignored by Git. Only deliberately public frontend configuration may use `import.meta.env.VITE_*`.

## Contributing

1. With a clean working tree, run `git fetch origin`, then create your ticket branch from `origin/master`: `git switch -c <name>/<feature> origin/master`.
2. Make your changes, run `npx tsc --noEmit` and `npm run build`.
3. Push and open a pull request; ask one teammate to review before merging.

## Reference

- Class diagram, use case diagram and UI flow: `Sys Architecture.pdf` (team drive) / Lucidchart link inside it.
