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
- **Never commit secrets.** Put API keys in `.env.local` (ignored by git) and read them with `import.meta.env.VITE_*`.

## Contributing

1. Pull the latest `main`, then create a branch: `git checkout -b feature/<use-case>-<short-name>`.
2. Make your changes, run `npx tsc --noEmit` and `npm run build`.
3. Push and open a pull request; ask one teammate to review before merging.

## Reference

- Class diagram, use case diagram and UI flow: `Sys Architecture.pdf` (team drive) / Lucidchart link inside it.
