# Ticket 57: base-map warning

- Explain when the background-map warning should appear.
- Record the tests for failed images and recovery.
- List the steps for checking the change in the website.

Date: 30 October 2026 (Singapore time).
Branch: `romeo/ticket-57-map-warning`.
Base: approved ticket #58 commit `30d28bf`, so its backup feature stays in the preview.
Related use case: UC-2 Explore Risk Map.

## What changed

- The map background is made from small images called tiles.
- Previously, one failed tile switched the warning on permanently.
- The map now waits until loading finishes before reporting an outage.
- It shows the warning only if tiles failed and no background tile loaded.
- A successfully loaded tile clears the warning.
- The map removes its warning event handlers when the screen closes or reloads.
- Risk calculations, colours and the backup-data warning are unchanged.

## Test results

| Check | Actual result |
|---|---|
| Images are still loading, or all images load successfully | No base-map warning |
| Images load successfully, then one image fails | No false warning |
| One image fails, then later images load | No false warning |
| Some images fail while others are still loading | Wait for loading to finish |
| All images fail | Show the warning; keep the area boundaries |
| An image loads after a complete outage | Clear the warning |
| Map test file | 25 tests passed |
| Full `npm test` | 341 tests passed across 27 files |
| `npm run build`, including TypeScript | Passed |
| `git diff --check` | Passed |
| Local browser preview | 12 background images and all 332 area shapes loaded; no base-map warning or browser errors |

The new tests reproduced three failures before the fix. They use real Leaflet
image load/error events with simulated results. They do not call live data APIs.
The normal online map was also checked in the local browser. Manual network
failure and recovery checks remain available below.

## Open the website

1. Open <http://127.0.0.1:5174/> while the local server is running.
2. Click **Risk Map**.
3. Check that the background roads and place names load without a base-map warning.
4. The yellow saved-backup-data notice from #58 can still appear. It describes
   the risk data, separately from the background map images.

For an optional failure check, leave the page open, disconnect the internet,
and zoom to an area whose images have not been cached. If all requested images
fail, the base-map warning should appear below the map. Reconnect and zoom
again. The warning should disappear once a background image loads.

## Notes

- This ticket changes `RiskMapBoundary.tsx` and its existing test file, plus
  this test record. It adds no dependencies or extra website controls.
- The existing lockfile install issue and bundle-size warning are unchanged.
  See [ticket 58 results](ticket-58.md) for their details.
- The map cleanup also has a separate team change in ticket #59. Keep both
  cleanup changes when the branches are integrated.
