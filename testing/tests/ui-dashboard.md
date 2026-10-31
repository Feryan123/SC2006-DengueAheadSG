# Dashboard UI/UX improvement

- Record the unplanned dashboard layout and navigation changes.
- Explain how to check search, area selection and inline simulation.
- List the existing diagrams and descriptions that need a small follow-up.

Date: 31 October 2026 (Singapore time).
Branch: `romeo/ui-dashboard`.
Base: `origin/master`, commit `7876ce1`.
Related use cases: UC-1 to UC-5. No new ticket number has been assigned.

## What changed

- The risk map is the main dashboard, with one larger search for a subzone,
  postal code or address. The separate navigation tabs are removed.
- Selecting an area immediately shows its assessment beside the map.
  A fixed preview frames that area without dragging or zoom controls.
  The large centred score and risk label sit above the fixed preview. On phones,
  the selected result comes before the main map.
- Simulation opens on the same page, temporarily hiding the main map and other
  dashboard sections. Controls, a fixed selected-area map and comparison share
  one lavender panel. Exact numeric inputs and linked sliders adjust humidity,
  past rainfall and Aedes overlap. Invalid values do not produce a new score.
  Reset restores the baseline; Back to current risk map ends the simulation.
- Factor cards replace the long list. Their full explanations can be expanded.
  Existing tailored tips, the full prevention checklist and NEA links remain.
- A small calculation popup reads the existing model weights and links to the
  research recorded in the team's planning notes. It does not claim that the
  research validates the project's exact score.
- The header and favicon use a mosquito prohibition logo. Action-specific SVG
  icons identify plants, containers, drains, repellent, clothing and other tasks.
  Larger section headings and pastel backgrounds separate the map, rankings,
  factors, area recommendations and full checklist. Ranked cards use the shared
  risk colour across their full rectangle. No runtime dependencies were added.
- Local postal/address checks use Vite's development proxy to the existing
  deployed search API. No credentials are stored in the frontend.

## Checks completed

| Check | Result |
|---|---|
| `npm test -- --reporter=dot` | 370 tests passed across 28 files |
| `npm run build` | TypeScript and production build passed |
| `git diff --check` | Passed |
| Actual local postal search `680123` | TECK WHYE, 25.4, Moderate |
| Actual local subzone search `Aljunied` | ALJUNIED, 45.5, Moderate |
| Simei: 83.6% humidity, 186 mm rain, 24% overlap | Current 45.2; simulated 55.5, High; +10.3 points |
| Main map during simulation | Hidden; original assessment and map preserved on return |
| Selected-area preview | Correct area boundary; no zoom controls |
| Calculation popup | Opens; X, Got it and Escape close it; focus returns |
| Phone layout, 390 × 844 and 320 × 844 | No horizontal overflow; exact inputs and sticky result fit |
| Full checklist | All 15 tasks retained, with 15 distinct task-icon drawings |

Automated checks cover delayed search replies, unsuccessful searches, selection
changes, simulation reset/close, research links, the full checklist, backup-data
notices and the existing base-map failure/recovery behaviour. They use fixtures
and simulated service replies rather than live API calls.

The real browser checks used the team's published snapshot, generated at
`2026-10-30T16:22:52.489Z`, with 332 subzones. A local copy is ignored by Git.
The existing large-bundle warning remains. Exact-value support extends
`ScenarioAdjustment` and `RiskSimulationControl`; the original preset interface
still works. The scoring formula, weights, normalisation, risk bands, services,
API functions and data pipeline are unchanged. New tests cover exact decimal
values, percentage/ratio conversion, boundary values, invalid input, delayed
replies, reset, recovery and preservation of the original data.

## Open and check locally

1. While the local server is running, open <http://127.0.0.1:5176/>.
2. Search for `Aljunied`. Check the selected area, score and fixed map preview.
3. Open **How is this calculated?**. Check the weights and research links.
4. Choose **Simulate risk**. Move the sliders or type exact values. Compare the
   current and simulated scores; the fixed map shows only this area's simulation.
   Try an empty field or humidity above 100% to check the correction message.
5. Use **Reset to baseline**, then **Back to current risk map**. Select another area
   from the main map or area list.
6. Search for `680123` to check the real postal-code path. This needs internet
   access to the deployed search API.
7. Scroll down. Expand factor explanations, prevention tips and the full NEA
   checklist. Check the source links.

To restart this preview, run inside `dengue-ahead-sg`:

```powershell
npm run dev -- --host 127.0.0.1 --port 5176 --strictPort
```

## Diagram and document follow-ups

- UI screenshots, wireframes and navigation descriptions should show one
  dashboard, automatic assessment selection and inline simulation.
- The presentation layer in the architecture/class diagram should reflect
  dashboard sections, the selected-area preview and the calculation popup.
  The old HomePageBoundary is no longer used by App; its file remains.
- Use-case descriptions that say to open a separate Home, Prevention or
  Simulation page should describe the corresponding dashboard section instead.
  The actors, goals, calculations and external systems remain the same, so
  the use-case diagram's existing goals and relationships can stay.
- Sequence diagrams need an update only where they show the old screen changes
  or the old HomePageBoundary starting a location search. Existing calculation
  and data-service flows are reused.
- `ScenarioAdjustment` in the class diagram should show optional exact `value`
  and preset `adjustmentLevel`, with exactly one supplied. UC-4 and simulation
  test descriptions should document exact inputs and their valid ranges.
- The shared UC-4 description still lists dengue clusters as adjustable and
  three adjustment levels. The current implementation adjusts humidity,
  rainfall and high-Aedes overlap. Reconcile that existing mismatch with the
  team while documenting the exact-value input change.

These follow-ups are recorded here. Shared documents, diagrams and Notion
have not been edited.
