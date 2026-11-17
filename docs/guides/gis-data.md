# Verified local GIS layers — what the map is allowed to draw

The map draws an OpenStreetMap basemap and nothing else until a local GIS file
has passed verification. That is why the layer panel says:

> RiverGuard overlays are hidden until verified local GIS data is added.

That sentence is a statement about the repository, not a configuration gap. No
hazard polygon, boundary or station marker ships with this checkout, and the app
will not fetch one at runtime either: a hazard shape that came from nowhere is
worse than no shape at all.

---

## 1. How the gate works

```
data/gis/manifest.json          ← what a human says the layers are
        │
        │  npm run gis:verify  (checks provenance, checksum, geometry, extent)
        ▼
apps/web/src/generated/gis-layers.json   ← the only GIS state the app reads
        │
        ├── GET /api/gis/layers        → the layer panel, legends, credits
        └── GET /api/gis/layers/<id>   → the geometry, re-hashed per request
        ▼
apps/web/src/components/map/RiverMap.tsx  ← MapLibre fill / line / circle layers
```

The artifact is committed. A layer therefore becomes drawable only through a
reviewed diff — you edit the manifest, run the verifier, and the resulting JSON
is part of the change. A file that fails verification is written to `rejected`
and shown in the panel as a warning with the reason; it is never drawn.

Three independent refusals, by design:

| When                          | What happens                                                           |
| ----------------------------- | ---------------------------------------------------------------------- |
| Not in the manifest           | Invisible. The app never scans `data/gis` for files.                   |
| In the manifest, fails checks | Listed under "failed verification" in the panel, with the first error. |
| Verified, then edited on disk | `GET /api/gis/layers/<id>` answers **409** and the map says so.        |

## 2. What verification checks

- **Provenance is complete**: publisher, `https://` source URL, licence,
  retrieval date, `verifiedBy`, `verifiedAt`. Dates must be real and not in the
  future.
- **The reviewed bytes are the served bytes**: `sha256` in the manifest matches
  the file.
- **The geometry parses and is the declared kind**: `polygon`, `line` or `point`,
  inside a `FeatureCollection`.
- **Coordinates are WGS84**, `EPSG:4326` — longitude ±180, latitude ±90. A
  projected file (e.g. Philippine Area of Responsibility grids in metres) is
  rejected rather than plotted off the coast of Africa.
- **Everything falls inside the declared `bbox`**, which also catches a layer
  pasted from the wrong region.
- **Polygon rings are closed** and have at least four positions; polygons cover
  real area.
- **Attributes exist on every feature**, and every value of the class property
  has a colour in `classColors`.

What it cannot check: whether the map is scientifically right, current, or
licensed for redistribution. `verifiedBy` / `verifiedAt` is where a human puts
their name on that.

## 3. Adding a layer

1. Drop the file in `data/gis/`, e.g. `data/gis/flood-susceptibility.geojson`.
   Convert shapefiles/KML/GeoPackage with QGIS (_Save features as → GeoJSON_,
   CRS `EPSG:4326`). The geometry stays out of git (`.gitignore`); the manifest
   entry is committed.
2. Copy the shape of `data/gis/manifest.example.json` into
   `data/gis/manifest.json` and fill in every field, including who verified it.
3. Fill in the checksum and check it:

   ```bash
   npm run gis:verify -- --write-hashes   # writes sha256 into the manifest
   npm run gis:verify                     # must print ✓ for every layer
   ```

4. Reload the map. The layer appears in **Map layers** with its feature count,
   publisher and licence; selecting it draws it and shows the class legend.
5. Commit `data/gis/manifest.json` and `apps/web/src/generated/gis-layers.json`
   together, so the verification state is reviewable.

`npm run gis:verify` exits non-zero when any declared layer is rejected, which
makes it usable as a check before deploying.

## 4. Manifest fields

| Field                | Required     | Meaning                                                           |
| -------------------- | ------------ | ----------------------------------------------------------------- |
| `id`                 | yes          | Kebab-case; becomes `gis:<id>` and the API path segment.          |
| `title`              | yes          | Row label in the panel.                                           |
| `classification`     | yes          | `hazard`, `boundary` or `stations`.                               |
| `description`        | no           | Shown in the map's overlay summary card.                          |
| `file`               | yes          | Bare `.geojson` filename inside `data/gis` (no folders, no `..`). |
| `sha256`             | yes          | 64 hex characters; `--write-hashes` fills it in.                  |
| `bbox`               | yes          | `[minLon, minLat, maxLon, maxLat]`; every coordinate must fit.    |
| `geometry`           | yes          | `polygon`, `line` or `point`.                                     |
| `requiredProperties` | no           | Properties every feature must carry.                              |
| `classProperty`      | with colours | Property used to colour the layer.                                |
| `classColors`        | with classes | `{ "low": "#fde68a", … }` — every value needs a colour.           |
| `fillOpacity`        | no           | `0`–`1`, default `0.45`.                                          |
| `strokeColor`        | no           | Hex colour for outlines, lines and points.                        |
| `source.publisher`   | yes          | Who published the data.                                           |
| `source.url`         | yes          | `https://` page the file came from.                               |
| `source.license`     | yes          | Licence, as published.                                            |
| `source.retrievedAt` | yes          | `YYYY-MM-DD` you downloaded it.                                   |
| `source.note`        | no           | Product or version, e.g. "50-year flood hazard map".              |
| `verifiedBy`         | yes          | Who checked the file against the publisher's copy.                |
| `verifiedAt`         | yes          | When.                                                             |

## 5. Environment

| Variable            | Default                                  | Use                                                          |
| ------------------- | ---------------------------------------- | ------------------------------------------------------------ |
| `GIS_DATA_DIR`      | `<repo>/data/gis`                        | Point verification/reading at another directory.             |
| `GIS_ARTIFACT_PATH` | `apps/web/src/generated/gis-layers.json` | Test against a scratch artifact without touching the commit. |

## 6. What is deliberately _not_ here

- **No predictions as geometry.** The model works at city level, so its output
  is a number per city per day. The "Experimental outlook" row in the panel says
  that instead of extrapolating a raster from four city values.
- **No third-party GIS API.** No tile service, geocoder or ArcGIS endpoint is
  contacted for RiverGuard data; the basemap is the only remote map service and
  it is covered by the OSM tile policy.
- **No invented fallback.** If verification produced nothing, the map is honest
  about it rather than showing a decorative outline of Metro Manila.
