# Dashboard UI test notes

- Summary of the dashboard changes.
- Test results and steps for checking the website.
- Related documents and diagrams to update.

Last updated: 2 November 2026 (Singapore time).
Branch: `romeo/ui-score-breakdown`.
Related use cases: UC-1 to UC-5.

## Changes

- One dashboard replaces the separate Home, Risk Map and Prevention tabs.
  The search accepts a postal code, address or subzone name.
- Selecting an area shows its score, risk level, fixed map preview and score
  breakdown beside the main map. The breakdown shows each factor's reading
  and contribution, with one **How is this calculated?** link.
- The main map and result panel have matching heights on desktop, including
  before an area is selected. On phones, the selected result appears first.
  The original risk colours are retained; darker backgrounds make Low visible.
- National totals and the data-update time appear above the map. The selected
  area's cluster summary appears inside the map card, above the legend.
- Simulation stays on the dashboard and groups the controls with the result.
  Sliders and number fields adjust humidity, past rainfall and high-Aedes
  overlap. Reset restores the original values; returning closes the simulation.
- Prevention advice, the full NEA checklist and source links remain available
  below. Different icons and section colours make the content easier to scan.

Risk calculations, weights, risk bands and data services are unchanged.
The calculation popup explains the existing model and links to the research
in the project notes. Those studies do not validate the project's exact score.

## Test results

Automated checks completed on 2 November 2026:

| Check | Result |
|---|---|
| `npm test` | 419 tests passed across 34 files |
| `npm run build` | TypeScript and production build passed |
| `git diff --check` | Passed |

Browser checks:

| Check | Result |
|---|---|
| Postal code and subzone search | `680123` resolved to Teck Whye; `Aljunied` resolved to Aljunied |
| Simulation | Simei changed from 45.2 to 55.5 with 83.6% humidity, 186 mm rainfall and 24% overlap; reset and return restored 45.2 |
| Selected-area preview | Shows the selected boundary without dragging or zoom controls |
| Calculation popup | Opens and closes; keyboard focus returns to its button |
| Desktop at 1280 × 720 and 1366 × 768 | Both panels remain 535 px high and fit below the toolbar and collapsed warning |
| Phone widths of 320 px and 390 px | No horizontal overflow; factor rows and confidence help fit |
| Cluster summary | Bishan East showed 1 linked cluster and 20 cases; Central Water Catchment showed none recorded; clearing selection restored the prompt |
| Prevention checklist | All 15 tasks and their source links remain available |

The latest cluster checks used the snapshot generated at
`2026-11-01T08:23:13.301Z`: 332 subzones, 13 clusters and 99 high-Aedes areas.
Results can change when the snapshot is updated.

Automated tests also cover unsuccessful and delayed searches, invalid simulation
inputs, backup data, unavailable cluster data and clusters overlapping subzone
boundaries. Cluster case totals count all reported cases in the linked clusters;
they do not locate individual cases within the selected area.

The production build still reports the existing large-bundle warning.

## Manual checks

From the `dengue-ahead-sg` folder, start the local server:

```powershell
npm run dev -- --host 127.0.0.1 --port 5176 --strictPort
```

1. Open <http://127.0.0.1:5176/>. Check the initial prompt and matching panel heights.
2. Search for `Aljunied`, then `680123`. Check the area name, score and map preview.
   Postal and address searches need internet access to the deployed search API.
3. Check the five score-breakdown rows. Open **How is this calculated?** and
   check the explanation and research links.
4. Select **Simulate risk**. Try the sliders, exact values and an invalid value
   such as humidity above 100%. Check reset and return to the current risk map.
5. Select different areas and check the cluster summary below the main map.
   Clear the selection to check the initial prompt again.
6. Expand the data warning, confidence help and prevention advice. Check their
   details and source links. Repeat at phone width to check the layout.

## Documents and diagrams to update

- UI screenshots and wireframes: one dashboard, the compact result panel,
  cluster summary inside the map card and simulation on the same page.
- Use-case descriptions: replace separate-page navigation with the dashboard
  sections. The existing actors and use-case goals still apply.
- Architecture and class diagrams: reflect the dashboard presentation
  components. `App` no longer uses `HomePageBoundary`.
- Sequence diagrams: update any old page transitions or searches started by
  `HomePageBoundary`. Calculation and data-service flows remain the same.
- UC-4 and `ScenarioAdjustment`: include exact-value inputs and valid ranges,
  alongside the existing preset support. The current adjustable factors are
  humidity, rainfall and high-Aedes overlap. The shared UC-4 description's
  cluster adjustment and three-level wording need to be reconciled with this.
