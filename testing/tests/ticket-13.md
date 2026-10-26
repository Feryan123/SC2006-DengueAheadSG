# Ticket 13 test results

- Check the public snapshot reader and its cache Proxy.
- Use test snapshots only; no real health figures or risk results are invented.
- Run on 26 October 2026, Node.js 24, branch `romeo/data-cache`.

## Four required cache tests

| Input or action | Expected result | Actual |
|---|---|---|
| Cache age: one hour minus 1 ms | Reuse the cache without fetching or resetting its saved time | Passed |
| Cache age: exactly one hour; update succeeds | Fetch, validate and save the new snapshot | Passed |
| Cache is older than one hour; update fails | Use the old cache before the bundled backup; keep dates and mark stale data | Passed |
| No valid cache; update fails | Use the supplied bundled backup without changing its dates | Passed |

## Other checks

| Input or action | Expected result | Actual |
|---|---|---|
| Storage reads/writes are blocked | Downloaded data can still be used | Passed |
| Storage is blocked and fetching fails | Use the supplied backup | Passed |
| Storage is full after a successful update | Return the update; keep the previous saved cache | Passed |
| Cache contains broken JSON, null, missing fields or a future save time | Ignore it and try the next source | Passed |
| Downloaded snapshot is invalid | Do not overwrite the last good cache | Passed |
| HTTP error, bad JSON, old snapshot format or timeout | Reader fails safely; Proxy can use the backup | Passed |
| Network, cache and backup all fail | Safe unavailable-data error | Passed |
| Saved data has a failed dataset | Keep FAILED; do not upgrade it to STALE or FRESH | Passed |
| Valid polygons, multipolygons and point overlays | Accept the snapshot | Passed |
| Missing weather, invalid status/date/number, duplicate IDs or broken geometry | Reject the snapshot | Passed |
| Reader request | Public URL, no API-key header, no browser HTTP cache, timeout signal supplied | Passed |
| New cache/reader/validation tests | All checks pass | 31 passed |
| Full suite on this branch | Existing and new tests pass | 75 passed: 31 new, 36 OneMap and 8 existing |
| `npx tsc --noEmit` | No type errors | Passed |
| `npm run build` | Production build succeeds | Passed |
| `git diff --check` | No whitespace errors | Passed |
| Local website and Vite cache module | HTTP 200 | Passed at `http://localhost:5173/` |

The tests use a small in-memory storage substitute and simulated network
replies. They check the real reader/Proxy together, but do not claim that the
live app is already wired to this service or that a production backup exists.
The map tests from tickets 20/22 remain on their own branches; this independent
ticket starts from master.

## Requirements still awaiting team integration

- P4 / Willy, Notion ticket 12: publish a completed `PublicDataSnapshot` and
  confirm its public URL. At the pre-publication check, `data` at `e72efde`
  still has the older raw feeds. Willy's newer `5646541` adds a generated
  `data/derived/latest-snapshot.json` with `lastUpdated`, `datasetStatuses`
  and `subzones`, plus the older manifest. This still differs from the shared
  `PublicDataSnapshot` fields: `generatedAt`, `datasets`, `weather`, population
  profiles and cluster/Aedes records. Those receiving-format differences still
  need joint review. Subzones also need the shared `clusterCasesNearby` and
  `aedesOverlapRatio` metrics. The cache code and agreed contract are unchanged.
- P3 / Romeo: bundle a validated copy of that completed snapshot with the app.
  The Proxy already accepts this imported JSON object as its second argument.
  No made-up production snapshot has been substituted for the missing data.
- P5 / Huajia, Notion ticket 8: construct the reader and Proxy with that public
  URL and bundled snapshot, then inject the Proxy into the controls.
- P3 and P4: review the format and cache behaviour together, then complete the
  separate handover/walkthrough in Notion ticket 54. Collaboration is not
  claimed as completed by these local checks.
- Once wired, check one-hour reuse, failed refresh with old cache, and offline
  start with the real bundled backup in the combined website.

No website screen was changed for this ticket. Browser storage-blocking and
offline behaviour of the integrated app still need the combined check above.
