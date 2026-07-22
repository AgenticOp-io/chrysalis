/**
 * Vendor island entry — same `@arcgis/core` imports as Module_Manager
 * `coverage-map/lib/arcgisMapController.ts`. Built with Module_Manager's **Vite**
 * (source toolchain), not CDN AMD/ESM or a custom esbuild dialect (DESIGN D6441).
 *
 * `__WISP_ARCGIS_VERSION__` is injected at build time from node_modules/@arcgis/core.
 */
import esriConfig from "@arcgis/core/config.js";
import Map from "@arcgis/core/Map.js";
import MapView from "@arcgis/core/views/MapView.js";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import OpenStreetMapLayer from "@arcgis/core/layers/OpenStreetMapLayer.js";
import Graphic from "@arcgis/core/Graphic.js";
import Point from "@arcgis/core/geometry/Point.js";
import Polygon from "@arcgis/core/geometry/Polygon.js";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol.js";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol.js";
import Sketch from "@arcgis/core/widgets/Sketch.js";

/** @type {string} */
// eslint-disable-next-line no-undef
const ARCGIS_VERSION =
  typeof __WISP_ARCGIS_VERSION__ !== "undefined" ? __WISP_ARCGIS_VERSION__ : "4.34";

/** Workers / fonts / wasm on Esri assets CDN matching installed package (not JS ESM CDN). */
esriConfig.assetsPath = `https://js.arcgis.com/${ARCGIS_VERSION}/@arcgis/core/assets`;

export {
  esriConfig,
  Map,
  MapView,
  GraphicsLayer,
  OpenStreetMapLayer,
  Graphic,
  Point,
  Polygon,
  SimpleMarkerSymbol,
  SimpleFillSymbol,
  Sketch,
};
