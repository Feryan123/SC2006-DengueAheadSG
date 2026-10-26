# Ticket 19 test results

- Check typed app navigation and the stored subzone, assessment and snapshot.
- Check screen callbacks, unavailable data and the required footer credits.
- Run on 26 October 2026, Node.js 24, branch `romeo/app-navigation`.

| Input or action | Expected result | Actual |
|---|---|---|
| No location control | Unavailable home; no pretend working location form | Passed |
| Home callback supplies an area and assessment | Store both and pass them to the result boundary | Passed |
| Home reports unavailable data | Safe unavailable screen; no upstream private detail | Passed |
| Assessment belongs to a different area | Reject it; do not show the wrong result | Passed |
| Map area selected, then either result button pressed | Pass its exact area, assessment and snapshot to App | Passed |
| Map result opened, then Back | Return to the map | Passed |
| Selected map data has no full snapshot | Show unavailable data without inventing result details | Passed |
| Open simulation from a map result, then return | Keep the original baseline and snapshot | Passed |
| Home baseline plus supplied shared snapshot | Pass both to simulation | Passed |
| Simulation control or original snapshot missing | Unavailable simulation; allow return to the existing assessment | Passed |
| Open guidance through the home callback | Pass its control and connect its return action | Passed |
| No guidance control | Unavailable guidance; no sample health advice | Passed |
| Home or brand pressed after an assessment | Clear the old assessment and return home | Passed |
| Main navigation | Correct screen and current-page marker | Passed |
| Footer | OneMap, SLA, data.gov.sg, Singapore Open Data Licence links and disclaimer | Passed |
| Read a selected map result | No second data request or risk calculation | Passed |
| Parent supplies a new result callback | Keep the same polygons, popup, selection and view; use the latest callback | Passed |
| Unknown, unassessed or outline-only area | No invented result context | Passed |
| `npm test -- --run` | All tests pass | 101 passed: 17 new and 84 existing on this branch |
| Simplify App conditions and button handlers | Existing behaviour stays the same | Existing checks still pass |
| Typecheck | No type errors | Passed using the app's installed TypeScript compiler |
| `npm run build` | Production build succeeds | Passed |
| `git diff --check` | No whitespace errors | Passed |
| Local website and transformed App module | HTTP 200; credits present in the App module | Passed at `http://localhost:5173/` |

App tests render the real App and Leaflet map. Test versions of the unfinished
P2/P5 home, result, simulation and guidance components exercise their public
callback interfaces. Their real forms, calculations and content are not claimed
to be complete by these tests. No live health assessment or credentials are used.

## Website review now

1. Home shows Location search unavailable until its control is supplied.
2. Open Risk Map. Real outlines, selection and the existing popup remain available;
   grey/unavailable risk is expected until the team data and assessment controls
   are connected.
3. Open Prevention Guidance, then Return Home. Missing guidance data shows a clear
   unavailable message.
4. Check the footer's source credits and disclaimer.

Full address-to-result and result-to-simulation checks need the real team screens
and shared start-up wiring. The automated callback tests cover the receiving
side now; manual acceptance of the combined real app remains pending.

## Dependencies and follow-up

- PR #7 (Notion ticket 20) is now merged into master. PR #8 (Notion ticket 22)
  was approved and merged only into `romeo/risk-map`. Its separate follow-up PR
  must bring those approved changes into master first. Keep the map changes when
  integrating this App branch. Both follow-up PRs should target master.
- P2 / Matin, Notion tickets 15 and 18: complete the real home and result screens
  using the agreed callbacks. The published P2 branch at `35c1920` still contains
  skeletons. The map branch adds only the shared result badge; this change does
  not implement P2's result content or location lookup.
- P5 / Huajia, Notion ticket 8: construct and pass the working controls to App.
  For home-to-simulation navigation, supply the same `publicSnapshot` used to
  produce that home assessment. Confirm this binding with the completed location
  control. The map callback already supplies its exact displayed snapshot.
- P1's real assessments and the approved public-data pipeline remain the map's
  previously recorded dependencies. Simulation and guidance content remain with
  their component owners; no scoring, pipeline or teammate screen code is added.
- Confirm callback interfaces when the team implementations arrive, then run the
  combined address/map/result/simulation flows with real data.

Feryan's PR #8 review identified the parent-callback redraw problem. This change
keeps the latest callback in one React ref, so changing the App callback does not
recreate the map or refit its view. A regression test checks the original polygon
and popup are retained, no new fitBounds call occurs and the updated callback is
used. P5's requested diagram updates remain a separate team handoff.
