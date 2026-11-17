# `data/gis` — verified local GIS layers

**RiverGuard ships no GIS geometry.** The map shows the OpenStreetMap basemap and
nothing else until a layer in this directory passes verification. That is why the
map says "RiverGuard overlays are hidden until verified local GIS data is added":
it is the honest state of the repository, not a missing setting.

Map boundaries, hazard layers and monitoring-station points are read from local
files only. Nothing here is fetched at runtime, so the app works offline and no
third-party service is asked to serve "RiverGuard data".

## Files

| Path                       | Committed? | What it is                                                            |
| -------------------------- | ---------- | --------------------------------------------------------------------- |
| `manifest.json`            | yes        | The layers this build may draw. Empty by default — that is correct.   |
| `manifest.example.json`    | yes        | Every field, with placeholder values. Copy entries from it.           |
| `*.geojson`                | **no**     | The geometry itself. Usually tens of MB and licence-bound.            |
| `README.md`                | yes        | This file.                                                            |

`.gitignore` keeps `*.geojson` out of version control so a licence-bound or
large file cannot be committed by accident. If a licence clearly allows
committing a small file, remove the ignore line deliberately — it is a decision,
not a default.

## Adding a layer

1. Put the file here, e.g. `data/gis/flood-susceptibility.geojson`.
   - Must be **GeoJSON**, `FeatureCollection`, coordinates in **WGS84**
     (longitude, latitude — `EPSG:4326`). Reproject first if it is in a
     projected CRS; the verifier rejects coordinates outside ±180/±90.
   - Shapefiles, KML and GeoPackage are fine as a starting point, but convert to
     GeoJSON before adding (QGIS: *Export → Save features as → GeoJSON*, CRS
     `EPSG:4326`).
2. Describe it in `manifest.json`, using the fields in
   `manifest.example.json`. Every provenance field is required: publisher, URL,
   licence, retrieval date, who verified it and when.
3. Run:

   ```bash
   npm run gis:verify -- --write-hashes
   ```

   `--write-hashes` fills in `sha256` from the file you just added. Review the
   diff it made to `manifest.json`.
4. Run `npm run gis:verify` again with no flags. It must print `✓` for the layer.
5. Restart the dev server if it is running, reload the map, and the layer appears
   in **Map layers** with its own legend and credit line.

## What verification does — and does not — prove

It proves the file is structurally sound and that its recorded provenance is
complete: checksum matches, geometry parses, coordinates are valid WGS84 inside
the declared bounding box, the declared attribute exists on every feature, the
class values are all covered by the colour map, and the dates are real and not in
the future. The app then reads only the layers that passed; anything that fails
is listed in the layer panel as rejected, never drawn.

It does **not** prove the data is scientifically correct, current, or that you
have the right to redistribute it. Those are the reviewer's responsibility, and
the `verifiedBy` / `verifiedAt` fields are where that claim is recorded.

## Where to get data

RiverGuard cannot be the authority on this, and this repository deliberately
does not bundle a guess. Sources used in Philippine local-government contexts
generally include the national hazard-mapping agencies, the inter-agency
disaster portals, the national statistics authority for administrative
boundaries, and OSM extracts (ODbL) for roads and rivers. Check the licence on
the page you download from and record it verbatim in `manifest.json`; if the
licence forbids redistribution, keep the file local and out of git.
