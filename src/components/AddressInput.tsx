"use client";

import { useState, useEffect, useRef } from "react";
import proj4 from "proj4";
import { X } from 'lucide-react';


// Define EPSG:25833 (ETRS89 / UTM zone 33N) - used by Berlin official data
proj4.defs("EPSG:25833", "+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs");

function isBerlinPLZ(n: number) {
  return (
    (n >= 10115 && n <= 10999) ||
    (n >= 12099 && n <= 12999) ||
    (n >= 13051 && n <= 13599) ||
    (n >= 14050 && n <= 14199)
  );
}

export interface Address {
  id: string;
  fullAddress: string;
  coordinates: [number, number]; // [lon, lat]
  projectedCoordinates?: [number, number]; // [x, y] in EPSG:25833
}

interface PhotonFeature {
  geometry: {
    coordinates: [number, number];
    type: "Point";
  };
  type: "Feature";
  properties: {
    osm_id?: number;
    osm_type?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    district?: string;
    country?: string;
    state?: string;
  };
}

interface AddressInputProps {
  onAddAddress: (address: Address) => void;
  disabled?: boolean;
}

export default function AddressInput({ onAddAddress, disabled }: AddressInputProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PhotonFeature[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!query || query.length < 3) {
        setSuggestions([]);
        return;
      }

      setIsSearching(true);
      try {
        // Use Photon (Komoot) for better autocomplete
        // BBox for Berlin: 13.0883, 52.3382, 13.7611, 52.6755
        const response = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(
            query
          )}&bbox=13.0883,52.3382,13.7611,52.6755&limit=5&lang=de`
        );
        
        if (!response.ok) throw new Error("Geocoding failed");
        
        const data = await response.json();
        
        // Filter results to ensure they are actually in Berlin
        // The bbox is rectangular, but Berlin is not.
        // We check if city or state is "Berlin".
        const berlinFeatures = (data.features || []).filter((f: PhotonFeature) => {
          const p = f.properties;
          return (
            p.city === "Berlin" || 
            p.state === "Berlin" || 
            // Fallback: Check if postcode is in Berlin range
            (p.postcode && isBerlinPLZ(parseInt(p.postcode, 10)))
          );
        });

        setSuggestions(berlinFeatures);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 300); // 300ms debounce for Photon
    return () => clearTimeout(timeoutId);
  }, [query]);

  const formatAddress = (props: PhotonFeature["properties"]) => {
    const parts = [];
    if (props.name) parts.push(props.name);
    if (props.street) {
      parts.push(`${props.street} ${props.housenumber || ""}`.trim());
    }
    if (props.postcode || props.city) {
      parts.push(`${props.postcode || ""} ${props.city || ""}`.trim());
    }
    return parts.filter(Boolean).join(", ");
  };

  const handleSelect = (feature: PhotonFeature) => {
    const [lon, lat] = feature.geometry.coordinates;
    
    // Convert to EPSG:25833
    let projected: [number, number] | undefined;
    try {
      projected = proj4("EPSG:4326", "EPSG:25833", [lon, lat]) as [number, number];
    } catch (e) {
      console.error("Projection error:", e);
    }

    onAddAddress({
      id: Math.random().toString(36).substr(2, 9),
      fullAddress: formatAddress(feature.properties),
      coordinates: [lon, lat],
      projectedCoordinates: projected,
    });
    setQuery("");
    setSuggestions([]);
  };

  return (
    <div className="space-y-2">
      

      <div className="space-y-3 p-4 bg-muted rounded-lg border border-border" ref={wrapperRef}>
        <h3 className="text-sm font-medium text-foreground">Add Address</h3>
        <div className="relative">
          <input
            type="text"
            placeholder={disabled ? "Limit reached (15 addresses)" : "Search Berlin address..."}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={disabled}
          />
          {isSearching && <div className="absolute right-3 top-2 text-xs text-muted-foreground">Searching...</div>}
          {suggestions.length > 0 && (
            <ul className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
              {suggestions.map((feature, i) => (
                <li
                  key={feature.properties.osm_id || i}
                  className="px-3 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer truncate"
                  onClick={() => handleSelect(feature)}
                  title={formatAddress(feature.properties)}
                >
                  {formatAddress(feature.properties)}
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Powered by Photon (OpenStreetMap).
        </p>
      </div>
    </div>
  );
}

