"use client";

import { useEffect, useState, forwardRef, useRef, useMemo } from "react";
import { Address } from "./AddressInput";
import type { FeatureCollection, Polygon } from "geojson";
import { Download, X, FileImage, FileCode } from "lucide-react";

interface BadgeGeneratorProps {
  addresses?: Address[]; // Optional to handle initial render if parent doesn't pass it yet
  onDownloadSvg?: () => void;
  onDownloadPng?: () => void;
}

// Hardcoded bounds from the script output (approximate is fine for display, but exact is better)
// BBox: [370000.6842934104, 5799520.396692546, 415785.27460707806, 5837259.277727644]
const bounds = {
  minX: 370000,
  minY: 5799520,
  maxX: 415785,
  maxY: 5837259,
};
const width = bounds.maxX - bounds.minX;
const height = bounds.maxY - bounds.minY;

const mapX = (x: number) => ((x - bounds.minX) / width) * 1000;
const mapY = (y: number) => ((bounds.maxY - y) / height) * 1000; // Flip Y for SVG

const MIN_W = 400;
const MAX_W = 1200;

const BadgeGenerator = forwardRef<SVGSVGElement, BadgeGeneratorProps>(({ addresses = [], onDownloadSvg, onDownloadPng }, ref) => {
  const [grid, setGrid] = useState<FeatureCollection<Polygon> | null>(null);
  const [viewBox, setViewBox] = useState("0 0 1000 1000");
  const [isDragging, setIsDragging] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [displayedAddresses, setDisplayedAddresses] = useState(addresses);
  const [isPointsVisible, setIsPointsVisible] = useState(true);
  const animationFrameRef = useRef<number | null>(null);
  
  // Touch state
  const [touchStartDist, setTouchStartDist] = useState<number | null>(null);

  useEffect(() => {
    if (addresses !== displayedAddresses) {
      setIsPointsVisible(false);
      const timer = setTimeout(() => {
        setDisplayedAddresses(addresses);
        setIsPointsVisible(true);
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setIsPointsVisible(true);
    }
  }, [addresses, displayedAddresses]);

  const pointsBounds = useMemo(() => {
    if (addresses.length === 0) return null;
    const points = addresses
      .filter((a) => a.projectedCoordinates)
      .map((a) => ({
        x: mapX(a.projectedCoordinates![0]),
        y: mapY(a.projectedCoordinates![1]),
      }));
    
    if (points.length === 0) return null;

    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    
    return {
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys)
    };
  }, [addresses]);

  const effectiveMinW = useMemo(() => {
    if (!pointsBounds) return MIN_W;
    // Ensure we can always see all points with some padding (e.g. 100px)
    const requiredSize = Math.max(pointsBounds.width, pointsBounds.height) + 100;
    return Math.max(MIN_W, requiredSize);
  }, [pointsBounds]);

  const effectiveMaxW = Math.max(MAX_W, effectiveMinW);

  useEffect(() => {
    fetch("/masks/berlin_pixels.geojson")
      .then((res) => res.json())
      .then((data) => setGrid(data))
      .catch((err) => console.error("Failed to load grid", err));
  }, []);

  const animateViewBox = (targetViewBox: string) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const start = viewBox.split(" ").map(Number);
    const end = targetViewBox.split(" ").map(Number);
    const startTime = performance.now();
    const duration = 1000; // 1 second

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // Cubic ease out

      const current = start.map((s, i) => s + (end[i] - s) * ease);
      setViewBox(current.join(" "));

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        animationFrameRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  // Calculate optimal viewBox when addresses change
  useEffect(() => {
    if (addresses.length === 0) {
       
      animateViewBox("0 0 1000 1000");
      return;
    }

    const points = addresses
      .filter((a) => a.projectedCoordinates)
      .map((a) => ({
        x: mapX(a.projectedCoordinates![0]),
        y: mapY(a.projectedCoordinates![1]),
      }));

    if (points.length === 0) {
      animateViewBox("0 0 1000 1000");
      return;
    }

    let minX = Math.min(...points.map((p) => p.x));
    let maxX = Math.max(...points.map((p) => p.x));
    let minY = Math.min(...points.map((p) => p.y));
    let maxY = Math.max(...points.map((p) => p.y));

    // If single point (or points very close), add default radius
    if (maxX - minX < 1) {
      minX -= 100;
      maxX += 100;
    }
    if (maxY - minY < 1) {
      minY -= 100;
      maxY += 100;
    }

    // Add padding (50 units approx 2.25km)
    const padding = 50;
    minX -= padding;
    maxX += padding;
    minY -= padding;
    maxY += padding;

    // Ensure square aspect ratio to match container
    let vbWidth = maxX - minX;
    let vbHeight = maxY - minY;

    if (vbWidth > vbHeight) {
      const diff = vbWidth - vbHeight;
      minY -= diff / 2;
      vbHeight = vbWidth;
    } else {
      const diff = vbHeight - vbWidth;
      minX -= diff / 2;
      vbWidth = vbHeight;
    }

    animateViewBox(`${minX} ${minY} ${vbWidth} ${vbHeight}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addresses]);

  const updateViewBox = (x: number, y: number, w: number, h: number) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    const newW = Math.max(effectiveMinW, Math.min(effectiveMaxW, w));
    const newH = Math.max(effectiveMinW, Math.min(effectiveMaxW, h));
    
    // Calculate requested center
    const reqCenterX = x + w / 2;
    const reqCenterY = y + h / 2;
    
    // Clamp center to be within map bounds (0-1000)
    const clampedCenterX = Math.max(0, Math.min(1000, reqCenterX));
    const clampedCenterY = Math.max(0, Math.min(1000, reqCenterY));
    
    const newX = clampedCenterX - newW / 2;
    const newY = clampedCenterY - newH / 2;
    
    setViewBox(`${newX} ${newY} ${newW} ${newH}`);
  };

  const handleZoom = (factor: number) => {
    const [x, y, w, h] = viewBox.split(" ").map(Number);
    const newW = w * factor;
    const newH = h * factor;
    const newX = x + (w - newW) / 2;
    const newY = y + (h - newH) / 2;
    updateViewBox(newX, newY, newW, newH);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    e.preventDefault();
    const factor = e.deltaY < 0 ? 0.9 : 1.1;
    handleZoom(factor);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsDragging(true);
    setStartPoint({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const dx = e.clientX - startPoint.x;
    const dy = e.clientY - startPoint.y;
    
    const container = e.currentTarget;
    const [vx, vy, vw, vh] = viewBox.split(" ").map(Number);
    
    // Calculate scale: SVG units per pixel
    const scale = vw / container.clientWidth;
    
    const newX = vx - dx * scale;
    const newY = vy - dy * scale;
    
    updateViewBox(newX, newY, vw, vh);
    setStartPoint({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getDistance = (t1: React.Touch, t2: React.Touch) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (e.touches.length === 1) {
      setIsDragging(true);
      setStartPoint({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dist = getDistance(e.touches[0], e.touches[1]);
      setTouchStartDist(dist);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Prevent default to stop page scrolling while interacting with map
    // Note: This might require 'touch-action: none' in CSS
    
    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - startPoint.x;
      const dy = e.touches[0].clientY - startPoint.y;
      
      const container = e.currentTarget;
      const [vx, vy, vw, vh] = viewBox.split(" ").map(Number);
      
      const scale = vw / container.clientWidth;
      
      const newX = vx - dx * scale;
      const newY = vy - dy * scale;
      
      updateViewBox(newX, newY, vw, vh);
      setStartPoint({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2 && touchStartDist) {
      const dist = getDistance(e.touches[0], e.touches[1]);
      // If dist increases (zoom in), factor should be < 1
      // factor = startDist / dist
      const factor = touchStartDist / dist;
      
      // Apply zoom
      handleZoom(factor);
      
      // Update start dist for next move to keep it incremental
      setTouchStartDist(dist);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setTouchStartDist(null);
  };

  const [vx, vy, vw, vh] = viewBox.split(" ").map(Number);

  if (!grid) return <div className="text-xs text-muted-foreground">Loading grid...</div>;

  return (
    <div 
      data-testid="badge-container"
      className={`relative w-full h-full group overflow-hidden touch-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <svg ref={ref} viewBox={viewBox} className="w-full h-full transition-all duration-200 ease-out pointer-events-none">
        {/* Draw Grid Cells */}
        <g id="grid-group" className="text-muted-foreground/20">
          {grid.features.map((feature, i) => {
            // Assuming Polygon with one ring (standard for grid cells)
            const coords = feature.geometry.coordinates[0];
            if (!coords) return null;
            const points = coords.map(p => `${mapX(p[0])},${mapY(p[1])}`).join(" ");
            return <polygon key={feature.properties?.id || i} points={points} fill="currentColor" />;
          })}
        </g>

        {/* Draw Path */}
        {addresses.length > 1 && (
          <g id="path-group" className="text-primary" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            <path
              style={{ transition: "d 0.5s ease-in-out" }}
              d={`M ${addresses.map(a => {
                if (!a.projectedCoordinates) return "";
                return `${mapX(a.projectedCoordinates[0])} ${mapY(a.projectedCoordinates[1])}`;
              }).filter(Boolean).join(" L ")}`}
            />
          </g>
        )}

        {/* Draw Points */}
        <g id="points-group" style={{ opacity: isPointsVisible ? 1 : 0, transition: "opacity 0.2s ease-in-out" }}>
          {displayedAddresses.map((a, i) => {
            if (!a.projectedCoordinates) return null;
            return (
              <g key={a.id}>
                <circle
                  cx={mapX(a.projectedCoordinates[0])}
                  cy={mapY(a.projectedCoordinates[1])}
                  r="6"
                  className="text-primary fill-background stroke-current"
                  strokeWidth="2"
                />
                {/* Number label */}
                <text
                  x={mapX(a.projectedCoordinates[0])}
                  y={mapY(a.projectedCoordinates[1])}
                  dy="-10"
                  textAnchor="middle"
                  className="text-[10px] fill-foreground font-bold"
                  style={{ fontSize: "20px" }}
                >
                  {i + 1}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      
      {/* Controls */}
      <div className="absolute bottom-0 right-0 xl:bottom-4 xl:right-4 flex flex-col items-end gap-2 opacity-100 xl:opacity-0 xl:group-hover:opacity-100 transition-opacity">
        {/* Download Menu */}
        {isDownloadOpen && (
          <div className="flex flex-col gap-2 mb-2 animate-in fade-in slide-in-from-bottom-2 items-end">
            <button
              onClick={() => {
                onDownloadSvg?.();
                setIsDownloadOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-2 bg-background/95 backdrop-blur text-foreground shadow-lg rounded-md font-medium text-xs hover:bg-accent transition-colors border border-border whitespace-nowrap"
            >
              <FileCode className="w-4 h-4" />
              Download SVG
            </button>
            <button
              onClick={() => {
                onDownloadPng?.();
                setIsDownloadOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-2 bg-background/95 backdrop-blur text-foreground shadow-lg rounded-md font-medium text-xs hover:bg-accent transition-colors border border-border whitespace-nowrap"
            >
              <FileImage className="w-4 h-4" />
              Download PNG
            </button>
          </div>
        )}

        {/* Download Toggle */}
        <button
          onClick={() => setIsDownloadOpen(!isDownloadOpen)}
          className="p-2 bg-background/80 backdrop-blur-sm border border-border rounded-md shadow-sm hover:bg-accent text-foreground"
          title="Download"
        >
          {isDownloadOpen ? (
            <X className="w-4 h-4" />
          ) : (
            <Download className="w-4 h-4" />
          )}
        </button>

        <div className="h-px w-full bg-border my-1" />

        <button
          onClick={() => handleZoom(0.8)}
          disabled={vw <= effectiveMinW + 1} // Add small epsilon for float comparison
          className="p-2 bg-background/80 backdrop-blur-sm border border-border rounded-md shadow-sm hover:bg-accent text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          title="Zoom In"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
        <button
          onClick={() => handleZoom(1.25)}
          disabled={vw >= effectiveMaxW - 1} // Add small epsilon for float comparison
          className="p-2 bg-background/80 backdrop-blur-sm border border-border rounded-md shadow-sm hover:bg-accent text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          title="Zoom Out"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
      </div>
    </div>
  );
});



BadgeGenerator.displayName = "BadgeGenerator";

export default BadgeGenerator;

