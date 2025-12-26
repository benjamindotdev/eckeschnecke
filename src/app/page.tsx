"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import AddressSection from "@/components/AddressSection";
import MapSection from "@/components/MapSection";
import { Address } from "@/components/AddressInput";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  const [addresses, setAddresses] = useState<Address[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem("eckeschnecke-addresses");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved addresses", e);
        return [];
      }
    }
    return [];
  });
  const svgRef = useRef<SVGSVGElement>(null);

  // Save addresses to local storage whenever they change
  useEffect(() => {
    localStorage.setItem("eckeschnecke-addresses", JSON.stringify(addresses));
  }, [addresses]);

  const prepareSvgForExport = async () => {
    if (!svgRef.current) return null;

    const svgEl = svgRef.current;
    
    // Capture the current viewBox from the DOM element to match the user's zoom/pan
    let currentViewBox = "0 0 1000 1000";
    if (svgEl.viewBox && svgEl.viewBox.baseVal) {
        const vb = svgEl.viewBox.baseVal;
        currentViewBox = `${vb.x} ${vb.y} ${vb.width} ${vb.height}`;
    } else {
        currentViewBox = svgEl.getAttribute("viewBox") || "0 0 1000 1000";
    }
    
    // Get colors
    const computedStyle = window.getComputedStyle(svgEl);
    const textColor = computedStyle.color;
    
    // Get background color
    let bgColor = "#ffffff";
    const card = svgEl.closest(".bg-card");
    if (card) {
        bgColor = window.getComputedStyle(card).backgroundColor;
    }

    // Check dark mode
    const isDark = document.documentElement.classList.contains("dark");

    // Fetch Logo
    let logoTag = "";
    try {
        const res = await fetch("/logo.svg");
        if (res.ok) {
            const text = await res.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, "image/svg+xml");
            const svg = doc.documentElement;
            
            if (svg && svg.tagName.toLowerCase() === "svg") {
                svg.setAttribute("x", "50");
                svg.setAttribute("y", "25");
                svg.setAttribute("width", "100");
                svg.setAttribute("height", "100");
                
                const serializer = new XMLSerializer();
                const serializedSvg = serializer.serializeToString(svg);

                if (isDark) {
                    logoTag = `<g style="filter: invert(1);">${serializedSvg}</g>`;
                } else {
                    logoTag = serializedSvg;
                }
            }
        }
    } catch (e) {
        console.error("Failed to fetch logo", e);
    }

    // Clone for inlining colors (map content)
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    const inlineColor = (id: string) => {
      const originalEl = svgEl.querySelector(`#${id}`);
      const cloneEl = clone.querySelector(`#${id}`);
      if (originalEl && cloneEl) {
        const style = window.getComputedStyle(originalEl);
        const color = style.color;
        (cloneEl as SVGElement).style.color = color;
        if (cloneEl.getAttribute("stroke") === "currentColor") cloneEl.setAttribute("stroke", color);
        if (cloneEl.getAttribute("fill") === "currentColor") cloneEl.setAttribute("fill", color);
      }
    };
    inlineColor("grid-group");
    inlineColor("path-group");

    // Handle points specifically (deep inline)
    const pointsGroup = svgEl.querySelector("#points-group");
    const clonePointsGroup = clone.querySelector("#points-group");
    
    if (pointsGroup && clonePointsGroup) {
        const originalElements = pointsGroup.querySelectorAll("circle, text");
        const cloneElements = clonePointsGroup.querySelectorAll("circle, text");
        
        for (let i = 0; i < originalElements.length; i++) {
            const el = originalElements[i];
            const cloneEl = cloneElements[i] as SVGElement;
            const style = window.getComputedStyle(el);
            
            // Explicitly set fill and stroke from computed style
            cloneEl.style.fill = style.fill;
            cloneEl.style.stroke = style.stroke;
            cloneEl.style.color = style.color;
        }
    }

    const mapContent = clone.innerHTML;

    const width = 1000;
    const mapHeight = 1000;
    const headerHeight = 150;
    const footerHeight = 100;
    const totalHeight = headerHeight + mapHeight + footerHeight;

    // Helper to fetch font as base64
    const fetchFontAsBase64 = async (url: string) => {
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.error("Failed to load font", url, e);
        return "";
      }
    };

    const bartleFont = await fetchFontAsBase64("/assets/fonts/BBH_Bartle/BBHBartle-Regular.ttf");
    const workSansFont = await fetchFontAsBase64("/assets/fonts/Work_Sans/WorkSans-VariableFont_wght.ttf");

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${totalHeight}" width="${width}" height="${totalHeight}" style="font-family: 'Work Sans', sans-serif;">
  <defs>
    <style>
      @font-face {
        font-family: 'BBH Bartle';
        src: url('${bartleFont}') format('truetype');
      }
      @font-face {
        font-family: 'Work Sans';
        src: url('${workSansFont}') format('truetype');
      }
    </style>
  </defs>
  <rect width="${width}" height="${totalHeight}" fill="${bgColor}" />
  
  <!-- Header -->
  <g>
      ${logoTag}
      <text x="170" y="100" font-size="50" font-weight="bold" fill="${textColor}" style="font-family: 'BBH Bartle', serif;">EckeSchnecke</text>
  </g>

  <!-- Map -->
  <svg x="0" y="${headerHeight}" width="${width}" height="${mapHeight}" viewBox="${currentViewBox}">
      ${mapContent}
  </svg>

  <!-- Footer -->
  <g>
      <text x="${width/2}" y="${totalHeight - 40}" font-size="30" font-weight="bold" fill="${textColor}" text-anchor="middle" opacity="0.6">built by benjamin.dev</text>
  </g>
</svg>`;
  };

  const handleDownloadSvg = async () => {
    const svgData = await prepareSvgForExport();
    if (!svgData) return;

    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = "eckeschnecke-badge.svg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPng = async () => {
    const svgData = await prepareSvgForExport();
    if (!svgData) return;

    const img = new window.Image();
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1000;
      canvas.height = 1250; // Updated height
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, 1000, 1250);
      
      const pngUrl = canvas.toDataURL("image/png");
      
      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = "eckeschnecke-badge.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };

    img.onerror = (e) => {
        console.error("Failed to load SVG for PNG conversion", e);
    };

    img.src = url;
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card z-10 shrink-0">
        <div className="flex items-center gap-4">
          <Image
            src="/logo.svg"
            alt="EckeSchnecke Logo"
            width={40}
            height={40}
            className="dark:invert shrink-0"
            priority
          />
          <h1 className="text-lg md:text-2xl font-bold tracking-tight">
            EckeSchnecke
          </h1>
        </div>
        <ThemeToggle />
      </header>

      <main className="max-w-7xl mx-auto sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col-reverse md:gap-8 md:grid md:grid-cols-6">
          <AddressSection addresses={addresses} setAddresses={setAddresses} />

          <MapSection 
            addresses={addresses} 
            ref={svgRef} 
            onDownloadSvg={handleDownloadSvg}
            onDownloadPng={handleDownloadPng}
          />
        </div>
      </main>

      <footer className="border-t border-border bg-card mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} EckeSchnecke. All rights reserved.
          </p>
          <div className="flex flex-row gap-2 items-center">
            <span className="hidden md:inline text-sm text-inherit opacity-80">Built by</span>
            <a
                href="https://benjamin.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-opacity hover:opacity-100"
                aria-label="Built by benjamin.dev"
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src="/benjamin.webp"
                    alt="benjamin.dev"
                    className="h-5 w-5 rounded-full object-cover"
                />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}


