# RiverGuard Laguna Terrain Map

This project renders the complete Laguna-area raster coverage from the supplied
GeoTIFF terrain products. The six raster styles use full-extent, georeferenced
PNG overlays generated from the source GeoTIFFs. The 3D terrain model defaults
to the new full-area Copernicus GLO-90 (COP90) elevation grid.

## Run locally

1. Extract the project ZIP.
2. Open a terminal in the extracted project folder.
3. Install the JavaScript dependencies:

   ```bash
   npm install
   ```

4. Start a local web server from the same folder:

   ```bash
   python -m http.server 8000
   ```

   On Windows, `py -m http.server 8000` can be used instead.
5. Open `http://localhost:8000` in a browser.

Do not open `index.html` directly as a `file://` URL. The app fetches its local
raster images and elevation data, so it must be served over HTTP.

## Map data

- **Raster style selector:** Color relief, Hillshade + Color, Hillshade, Aspect,
  Slope, and Roughness. Each overlay is 784 × 508 pixels and uses the same
  EPSG:4326 extent from the supplied GeoTIFFs.
- **3D elevation model selector:** COP90 covers the complete map area. The
  previous GLO-30 DEM remains available as a higher-detail local-area option.
- **Source files:** Original raster archives and the COP90 ASCII grid are kept
  in `source-data/` for reprocessing. Runtime PNG, JSON, and binary files are
  stored at the project root and under `map-assets/`.

## Notes

The raster PNGs are display derivatives. The original GeoTIFF source archive is
retained in `source-data/viz_COP90_source.tar.gz`; the COP90 elevation source is
retained in `source-data/rasters_COP90_source.tar.gz` and `source-data/COP90/`.
The local GLO-30 data is retained as a separate option and source archive.
