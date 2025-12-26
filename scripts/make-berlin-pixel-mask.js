"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var node_fs_1 = __importDefault(require("node:fs"));
var turf = __importStar(require("@turf/turf"));
// 1) Load Berlin polygons
console.log("Loading GeoJSON...");
var inputPath = "public/assets/lor_prognoseraeume.geojson";
var fc = JSON.parse(node_fs_1.default.readFileSync(inputPath, "utf8"));
console.log("Loaded ".concat(fc.features.length, " features."));
// 2) Get BBox
var bbox = turf.bbox(fc); // [minX, minY, maxX, maxY]
console.log("BBox (Local Units):", bbox);
var minX = bbox[0], minY = bbox[1], maxX = bbox[2], maxY = bbox[3];
// 3) Generate grid manually (Planar calculation)
// The input coordinates seem to be in meters (UTM), so we use meters directly.
var cellSize = 500; // 500 meters
console.log("Generating grid with cell size ".concat(cellSize, " units (meters)..."));
var keptCells = [];
var idx = 0;
var totalCells = 0;
// Iterate x and y
for (var x = minX; x < maxX; x += cellSize) {
    var _loop_1 = function (y) {
        totalCells++;
        // Create cell polygon (counter-clockwise)
        // (x, y) is bottom-left
        var cellPoly = turf.polygon([[
                [x, y],
                [x + cellSize, y],
                [x + cellSize, y + cellSize],
                [x, y + cellSize],
                [x, y]
            ]]);
        var center = turf.centroid(cellPoly);
        // Check if center is in ANY of the original polygons
        var isInside = fc.features.some(function (f) { return turf.booleanPointInPolygon(center, f); });
        if (isInside) {
            idx++;
            cellPoly.properties = {
                id: "bpx_".concat(idx),
                // Store centroid for easier usage later?
                // center: center.geometry.coordinates 
            };
            keptCells.push(cellPoly);
        }
    };
    for (var y = minY; y < maxY; y += cellSize) {
        _loop_1(y);
    }
}
console.log("Processed ".concat(totalCells, " potential cells."));
console.log("Finished filtering. Kept ".concat(keptCells.length, " cells."));
var pixels = turf.featureCollection(keptCells);
// 4) Save mask
node_fs_1.default.mkdirSync("public/masks", { recursive: true });
node_fs_1.default.writeFileSync("public/masks/berlin_pixels.geojson", JSON.stringify(pixels));
console.log("Wrote ".concat(pixels.features.length, " pixels to public/masks/berlin_pixels.geojson"));
