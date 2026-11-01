# Terrain raster assets

The six selectable map styles are rendered from the supplied georeferenced GeoTIFFs.
Each `full.png` is 784 × 508 pixels and has transparent NoData pixels. The images
are placed using the EPSG:4326 bounds recorded in `map-assets/manifest.json`.

The 3D terrain selector defaults to Copernicus GLO-90 (COP90), which covers the
full raster extent. The previous local GLO-30 DEM is retained as a higher-detail
local option. Raw source archives and the COP90 ASCII grid are in `source-data/`.

Serve this folder over HTTP (for example, `npm install` then a local static server);
opening `index.html` directly as a `file://` URL will block the local data fetches.
