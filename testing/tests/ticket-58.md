# Ticket 58: bundled fallback and test results

- Explain how the app uses saved backup data.
- Record the automated test results.
- List the steps for checking the app in a browser.

Date: 30 October 2026 (Singapore time).
Branch: `romeo/ticket-58-bundled-fallback`, based on `master` at `339f1a6`.

## What changed

- Startup now supplies a saved snapshot to `CachedPublicDataServiceProxy`.
- The service tries fresh cache, network, old cache, then the saved backup.
- Backup data keeps its original dates and is marked STALE.
- `isBundledFallback` tells the screens when the saved backup is being used.
- The map, result and simulation show the same dated backup warning.
- Returning Home clears the warning. A successful network load has no warning.
- Services and backup data supplied by tests still work.

## Data file

- `bundled-snapshot.json` is an unchanged copy from the team's data pipeline.
- It contains 332 subzones and passes the existing snapshot validator.
- [Data file explanation and source](../../dengue-ahead-sg/src/data/README.md).

## Automated checks

| Check | Actual result |
|---|---|
| Default startup, network failure, empty storage | All 332 subzones and their assessments loaded from the backup |
| Default startup, network failure, blocked storage | Same successful fallback |
| Backup timestamps and dataset state | Original dates retained, datasets STALE, imported source unchanged |
| Successful network response | Network data returned and cached; no backup marker or notice |
| Explicit backup supplied by caller | Caller-supplied data retained and identified as backup |
| Real startup, controls and React/Leaflet screens with failed fetches | Map, selected result and simulation work; one dated backup notice on each screen; none on returning home |
| Focused startup, UI integration and cache tests | 41 passed |
| Full `npm test` | 337 passed across 27 files |
| `npm run build` (includes TypeScript check) | Passed |
| `git diff --check` | Passed |

Before the fix, the offline startup tests returned DATA_UNAVAILABLE.
The automated tests simulate failed network requests. Manual browser checks
are still pending.

## Browser checks

1. Start the app with `npm run dev` and load the page while online.
2. On Home, clear the `dengue-ahead-sg:public-data:v1` localStorage entry.
3. Set the browser's network to Offline, then open Risk Map.
4. Confirm coloured areas and the dated saved-backup notice appear.
5. Select an area, open its assessment, then simulate a scenario. Confirm the
   same backup notice remains visible. Returning Home clears the notice.
6. Restore the network and repeat once snapshot hosting is available: live data
   should be preferred and the backup notice should disappear.

The backup supplies public risk data and area boundaries. OneMap address search
and base-map tiles still need the network. Snapshot hosting and its URL belong
to ticket #27.

## Build notes

- `npm ci` initially failed because the upstream lockfile is missing some
  esbuild platform entries. The lockfile was repaired temporarily for the local
  install, then restored unchanged. All 236 installed packages that were listed
  in the lockfile matched their recorded versions. The upstream install issue
  still needs a separate fix.
- The embedded backup makes the JavaScript download larger: about 3.06 MB,
  or 1.10 MB after gzip compression. Vite reports a size warning. The build passes.
- These tests do not use credentials or call live data APIs.
