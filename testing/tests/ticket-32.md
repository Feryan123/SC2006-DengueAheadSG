# Ticket 32: keyboard access and mobile layout

- Explain the keyboard and phone-layout changes.
- Record the browser checks and existing test results.
- List simple steps for checking the website.

Date: 31 October 2026 (Singapore time).
Branch: `romeo/ticket-32-keyboard-mobile`.
Base: approved ticket #57 commit `2e0ab00`, keeping #58 and #57 in the preview.
Source: keyboard and mobile-layout non-functional requirements.

## What changed

- `App.tsx`: add a **Skip to main content** link and its page-content target.
- `style.css`: show a clear teal outline around keyboard-focused controls.
- Action buttons wrap onto another line when there is not enough space.
- Navigation can wrap on narrow screens without a horizontal scroll strip.
- Main buttons and map-toggle rows have a 44-pixel minimum height on phones.
- Existing risk calculations, data, navigation actions and controls are unchanged.

## Browser checks

| Check | Actual result |
|---|---|
| First Tab from a freshly loaded Home page | Skip link appears with a visible outline |
| Enter on the skip link, then Tab | Focus moves to page content, then the address field |
| Enter in the empty address field | Input validation appears |
| Tab through Home actions and Enter on View risk map | Risk Map opens |
| Type TOWNSVILLE in map search and press Enter | Townsville is selected |
| Arrow key in the area dropdown | Selected area changes |
| Space on each map overlay checkbox | Cluster and Aedes layers toggle; 12 and 99 shapes appeared |
| Enter on map zoom | Zoom changes; Zoom out becomes enabled |
| Enter on a top-10 area button | Its area is selected |
| Enter on assessment and simulation buttons | The correct screen opens |
| ArrowRight on a simulation slider | Value changes from step 2 to 3 |
| Enter on Reset to baseline | All three sliders return to step 2 |
| Enter on a prevention task, then Tab | Details open and its official source link receives focus |
| 320-pixel phone viewport | Home, map, result, simulation, prevention and unavailable screens fit without horizontal page overflow |
| Buttons in the narrow unavailable-data card | Both buttons remain inside the card |
| 390-pixel phone viewport | Home and map fit without horizontal page overflow |
| Default desktop viewport | Map layout remains usable without horizontal overflow |
| Browser console | No errors or warnings during the checks |

The temporary phone viewport was reset after testing.

## Existing automated checks

| Check | Actual result |
|---|---|
| `npm test` | 341 tests passed across 27 files |
| `npm run build`, including TypeScript | Passed |
| `git diff --check` | Passed |

## Open and check the website

1. Open <http://127.0.0.1:5175/> while the local server is running.
2. Press **Tab**. The skip link should appear at the top of the page.
3. Press **Enter**, then **Tab**. The address field should receive focus.
4. Keep using Tab to move through controls. The focused control has a teal outline.
5. On Risk Map, search for Townsville and press Enter. Use Space on the overlay
   checkboxes, or arrow keys in the area dropdown and simulation sliders.
6. Narrow the browser window. Navigation and action buttons should wrap instead
   of extending outside their available space.

Address-search server functions are not running in this Vite preview. Its
unavailable screen was checked for layout. Full address lookup will be checked
with deployment in #47. Map selection and simulation use the bundled public data.

The existing dependency-install issue and bundle-size warning are unchanged.
See [ticket 58 results](ticket-58.md) for details.
