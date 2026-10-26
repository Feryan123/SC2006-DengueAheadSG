# Ticket #22 test results

- Check the selected-area popup and the top-10 list.
- Use supplied test assessments; no risk calculation is added.
- Run on 26 October 2026, Node.js 24, branch `romeo/map-details`.

| Input or action | Expected result | Actual |
|---|---|---|
| Five contributions: 4, 20, 7, 12, 15 | Show 20, 15, 12; keep the original data unchanged | Passed |
| Missing contributions, NaN, infinity or negative values | No invented factors; skip invalid values | Passed |
| Twelve assessed areas, including equal indices | Return the ten highest; break ties by area ID | Passed |
| Unknown area, invalid index or repeated assessment | Only known areas with a finite index from 0 to 100 are ranked; no repeated entry | Passed |
| Click an assessed area | Popup shows its name, level, index and top three factors | Passed |
| Click View full assessment | Send the selected area's ID to the app's result action | Passed |
| Select an area without an assessment | Show Risk unavailable; disable the result action | Passed |
| Assessment has no factor details | Show a clear message, without inventing contributions | Passed |
| Click a top-10 entry, close its popup, then click it again | Select the correct area and reopen its popup | Passed |
| Search with no match | Clear selection and close the old popup | Passed |
| Area name contains HTML | Show the name as plain text in the tooltip and popup | Passed |
| No assessments | Show an empty-list message | Passed |
| Live local map: select Xilin | Show the unavailable-risk popup over its real outline | Passed; 332 areas rendered |
| `npm test -- --run` | All tests pass | 84 passed: 8 new checks and 76 existing checks |
| `npx tsc --noEmit` | No type errors | Passed |
| `npm run build` | Production build succeeds | Passed |
| `git diff --check` | No whitespace errors | Passed |

The screen tests use real Leaflet layers in jsdom. They supply assessments and
do not contact OneMap or calculate risk. The live website was checked at
`http://localhost:5173/` without supplying made-up assessments.

## Team integration still needed

The popup and ranking use the same assessments as the risk map. Real values
still need P1's Notion ticket 7 and the map's data/start-up wiring from Notion
tickets 9 and 8. The result button passes the area ID through the existing
callback; the completed result screen and navigation are separate tickets 18
and 19. Check the combined app when those parts are available.
