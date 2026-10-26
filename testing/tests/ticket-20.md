# Ticket #20 test results

- Checks the risk map, shared colours and area selection.
- Checks real URA outlines and uses test assessments to check colours.
- No real risk calculation is claimed.
- Run on 26 October 2026, Node.js 24, branch `romeo/risk-map`.

## Results

| Check | Expected | Actual |
|---|---|---|
| Supply four assessments in a different order from the areas | Match colours by subzone ID | Passed |
| Call assessAll on its assessment control | Method keeps access to its own state | Passed |
| Supply assessment results for all 332 official IDs | All areas use their returned level; 83 per colour in this test | Passed |
| Low, Moderate, High, Very High | Four distinct shades, darker for higher risk | Passed |
| Missing or unknown assessment | Grey, labelled Risk unavailable; result action disabled | Passed |
| Click area or use the dropdown | Correct name, risk label and selected outline | Passed |
| Switch the selected area | Previous outline returns to dashed purple; new outline is solid bright pink | Passed |
| Click an outline in the live browser | No rectangular focus box; highlight follows the actual shape | Passed |
| View Assessment | Pass the selected subzone ID | Passed |
| Search with spaces and different letter case | Find the area | Passed |
| Search with no match | Clear selection and show a message | Passed |
| Data request or assessment fails | Safe unavailable message | Passed |
| No subzones | Unavailable; no assessment call | Passed |
| Polygon and MultiPolygon | Leaflet draws the area | Passed |
| Point used as an area | Error message; screen stays usable | Passed |
| Area name containing HTML | Show plain text; do not create HTML | Passed |
| React StrictMode mount and cleanup | One map; no duplicate-map error | Passed |
| Result screen badge | Same colour and label as the map | Passed |
| Official outlines | 332 unique IDs; 321 Polygon, 11 MultiPolygon; coordinates unchanged | Passed |
| Default map | All 332 official areas, grey, unavailable-risk notice visible | Passed |
| Outline loading fails or file is invalid | Safe failure; no made-up map data | Passed |
| Missing or duplicate area IDs | Reject the file | Passed |
| `npm test -- --run` | All tests pass | 76 passed: 32 map tests, 36 proxy tests, 8 existing |
| `npx tsc --noEmit` | No type errors | Passed |
| `npm run build` | Production build succeeds | Passed |
| Local website and Vite map module | HTTP 200 | Passed at `http://localhost:5173/` |
| Public OneMap base tile | HTTP 200, image/png | Passed; no credentials used |
| Local official-outline file | HTTP 200, all 332 features | Passed |
| Downloaded source compared with bundled file | All geometries unchanged | 332 of 332 matched |

The screen tests use real Leaflet layers in jsdom, with a fixed map size and SVG
support supplied by the tests. They do not load remote map tiles. The colour
check measures increasing darkness; it is not a user study of colour vision.
The focus-box fix was also checked in the running browser: clicking Xilin
focused the SVG path with `outline-style: none` and a solid bright pink 3px border.
Keyboard selection through the area dropdown remains available.

## Remaining team integration

#20 is not finished yet. Real area outlines and map selection are implemented.
Connect #9's completed snapshot, #7's `assessAll` and #8's start-up wiring when ready.
The map's receiving side calls `assessmentControl.assessAll(snapshot)` directly
and is tested through the rendered Leaflet layers for all 332 official IDs.
Confirm the `assessAll` result signature against P1's code. Then check real
subzone shapes and calculated colours together in the browser. P2 also needs to
keep the shared colour helper when completing the result screen in #18.

No risk-engine or teammate-ticket code was implemented. P1 keeps ownership of
the calculations. The official boundary file uses the same dataset ID as the
team's existing #11 data script:
[URA Master Plan 2019 subzones](https://data.gov.sg/datasets/d_8594ae9ff96d0c708bc2af633048edfb/view).
