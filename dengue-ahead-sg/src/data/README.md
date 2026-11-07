# Saved backup data — Ticket #58

- `bundled-snapshot.json` is a saved copy of the team's published public data.
- Startup gives this copy to the cache service as its final backup.
- It is used when a data request fails and there is no usable cache.
- The app keeps the original dates and shows a warning that the data may be old.
- This README explains the data file because JSON does not support comments.

The long lists in the JSON are map coordinates and data records. They come from
the team's data pipeline. They do not need to be written or edited by hand.

| JSON field | What it contains |
|---|---|
| `generatedAt` | The time the pipeline created this copy |
| `datasets` | The download time and status of each dataset |
| `weather` | Rainfall and humidity values used by the risk model |
| `populationProfiles` | Resident counts and population density |
| `dengueClusters` | Cluster locations and case counts |
| `highAedesAreas` | Areas with high mosquito populations |
| `subzones` | The borders and risk input values for each planning subzone |

This copy contains 332 subzones, 12 cluster records and 99 high-Aedes area
records. It was generated on 30 October 2026 at 5:16 pm Singapore time.

## Source and updates

- [Published pipeline snapshot](https://github.com/Feryan123/SC2006-DengueAheadSG/blob/84e2bb51663bf930d4dd0939c178d6f652762fb3/dengue-ahead-sg/data/derived/latest-snapshot.json) (team repository, private).
- Source commit: `84e2bb51663bf930d4dd0939c178d6f652762fb3`.
- Git blob SHA-1: `028821938193254f6c7db9b0051c4f3772691934`.
- Size: 6,420,926 bytes. The file is an unchanged copy of the published snapshot.

To refresh the backup, replace the JSON with a validated published snapshot.
Run the startup tests and build afterwards. Update the source details above.
The hourly pipeline does not update this bundled copy automatically.
