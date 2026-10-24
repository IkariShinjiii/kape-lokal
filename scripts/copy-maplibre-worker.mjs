// MapLibre runs tile parsing in a web worker. Next's bundler can't package it, so the
// worker file is served from /public and passed to MapLibre with setWorkerUrl().
// Runs after npm install so the copy always matches the installed version.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";

const source = "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs";
if (existsSync(source)) {
  mkdirSync("public/vendor", { recursive: true });
  copyFileSync(source, "public/vendor/maplibre-gl-worker.mjs");
}
