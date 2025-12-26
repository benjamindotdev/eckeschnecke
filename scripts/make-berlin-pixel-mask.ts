import fs from "node:fs";
import * as turf from "@turf/turf";
import type { FeatureCollection, Polygon, MultiPolygon, Feature } from "geojson";

type FC = FeatureCollection<Polygon | MultiPolygon>;

// 1) Load Berlin polygons
console.log("Loading GeoJSON...");
const inputPath = "public/assets/lor_prognoseraeume.geojson";
const fc = JSON.parse(fs.readFileSync(inputPath, "utf8")) as FC;
console.log(`Loaded ${fc.features.length} features.`);

// 2) Get BBox
const bbox = turf.bbox(fc); // [minX, minY, maxX, maxY]
console.log("BBox (Local Units):", bbox);

const [minX, minY, maxX, maxY] = bbox;

// 3) Generate grid manually (Planar calculation)
// The input coordinates seem to be in meters (UTM), so we use meters directly.
const cellSize = 500; // 500 meters
console.log(`Generating grid with cell size ${cellSize} units (meters)...`);

const keptCells: Feature<Polygon>[] = [];
let idx = 0;
let totalCells = 0;

// Iterate x and y
for (let x = minX; x < maxX; x += cellSize) {
  for (let y = minY; y < maxY; y += cellSize) {
    totalCells++;
    
    // Create cell polygon (counter-clockwise)
    // (x, y) is bottom-left
    const cellPoly = turf.polygon([[
      [x, y],
      [x + cellSize, y],
      [x + cellSize, y + cellSize],
      [x, y + cellSize],
      [x, y]
    ]]);

    const center = turf.centroid(cellPoly);

    // Check if center is in ANY of the original polygons
    const isInside = fc.features.some(f => turf.booleanPointInPolygon(center, f as any));

    if (isInside) {
      idx++;
      cellPoly.properties = {
        id: `bpx_${idx}`,
        // Store centroid for easier usage later?
        // center: center.geometry.coordinates 
      };
      keptCells.push(cellPoly);
    }
  }
}

console.log(`Processed ${totalCells} potential cells.`);
console.log(`Finished filtering. Kept ${keptCells.length} cells.`);

const pixels = turf.featureCollection(keptCells);

// 4) Save mask
fs.mkdirSync("public/masks", { recursive: true });
fs.writeFileSync("public/masks/berlin_pixels.geojson", JSON.stringify(pixels));
console.log(`Wrote ${pixels.features.length} pixels to public/masks/berlin_pixels.geojson`);

