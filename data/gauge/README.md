# Rain-gauge observations

Optional. Nothing here is shipped, and nothing is generated.

`apps/web/src/lib/gauge.ts` reads a CSV from this directory when one exists and
uses it to replace the weather provider's reanalysis rainfall, day by day, before
the model's antecedent sums and soil bucket are computed. Without a file, the
provider's 30-day window is the only rainfall source and the interface says so.

## File

`data/gauge/daily_rainfall.csv` — or any path in `GAUGE_CSV_PATH`.

```csv
date,location,rainfall_mm
2026-11-15,Marikina,18.4
2026-11-15,Quezon City,22.1
2026-11-16,marikina,6.0
```

- `date` — `YYYY-MM-DD`, the day the total covers.
- `location` — the city code (`marikina`, `quezon-city`, `manila`, `pasig`) or the
  display name, in any case.
- `rainfall_mm` — daily total, `0`–`1000`.

Header aliases (`day`, `rain_mm`, `rain`, `city`, `station`, …) are accepted;
rows that cannot be read are counted and reported as a warning on the run, not
silently dropped. The file is read on every run, so an edited row takes effect on
the next forecast with no restart.

## What it changes

Where a gauge row exists for a date, that value replaces the provider's rainfall
for that date. The antecedent 3/7/30-day sums are then recomputed from the blended
window, and the water-balance soil bucket is warmed over it. The run's input
summary states how many of the observed days came from the gauge (for example
"12 of 31 observed days replaced by a local rain gauge").

Day gaps are normal and expected: a gauge that covers the last two weeks still
improves those two weeks. Nothing is interpolated across a gap.

## Licence and provenance

Gauge data is not included because it is not ours to redistribute (PAGASA,
EFCOS, and LGU records each carry their own terms). Keep the file local: it is
gitignored. Record the source and retrieval date in your own notes — the run
detail shows the file path and row count, not who published it.
