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

`npm run dev` runs the frontend only. Vite does **not** serve this Vercel API route,
so requesting `/api/onemap-search` from Vite is not a live proxy test. No extra
local server or deployment tooling has been added for this ticket.

Run the proxy tests without real credentials:

```bash
npm test -- --run tests/onemap-search.test.ts
npx tsc --noEmit
npm run build
```

The automated tests simulate OneMap replies and do not contact OneMap. A separate
local Node.js HTTP check also verified real searches, token reuse and renewal
after OneMap rejected a test token. Expiry timing is checked by the automated
tests. P2 frontend integration and Vercel deployment are still pending.

Recorded test results: [ticket #55](../testing/tests/ticket-55.md).

Official references: [authentication](https://www.onemap.gov.sg/apidocs/authentication),
[search](https://www.onemap.gov.sg/apidocs/search),
[token errors](https://www.onemap.gov.sg/apidocs/docs/verifyingsearchapitoken),
and [Vercel Node.js functions](https://vercel.com/docs/functions/runtimes/node-js).

## Project structure

The code follows the **Entity–Control–Boundary** pattern from our class diagram. Every class in the diagram has exactly one file, and each file starts with a header comment saying which class and use case it traces to and what is left to implement.

```
src/
├── main.tsx              React entry point
├── App.tsx               Root component (screen navigation goes here)
├── style.css
├── entity/               <<entity>> — data shapes only, no logic
│   ├── enums.ts          all enumerations
│   └── *.ts              LocationQuery, PlanningSubzone, RiskAssessment, ...
├── control/              <<control>> — business logic, no React
│   └── *Control.ts       LocationRiskControl, RiskAssessmentControl, ...
├── boundary/             <<boundary>> — React components (screens)
│   └── *Boundary.tsx     HomePageBoundary, RiskMapBoundary, ...
└── services/             <<boundary>> to external systems
    ├── GeocodingMapServiceBoundary.ts
    ├── ApprovedPublicDataServiceBoundary.ts
    └── mocks/            fake implementations used until the real APIs are wired up
```

Dependency rule: `boundary → control → entity / services`. Boundaries never call services directly, and controls never import React.

### Use cases → files

| Use case | Boundary | Control |
|---|---|---|
| UC-1 Assess Location Risk | HomePageBoundary, RiskResultBoundary | LocationRiskControl, RiskAssessmentControl |
| UC-2 Explore Risk Map | RiskMapBoundary | RiskMapControl |
| UC-3 Identify Planning Subzone | (via UC-1) | LocationRiskControl + GeocodingMapServiceBoundary |
| UC-4 Simulate Risk Scenario | SimulationBoundary | RiskSimulationControl |
| UC-5 View Prevention Guidance | PreventionGuidanceBoundary | PreventionGuidanceControl |

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
