export interface NormalizedAddress {
  original: string;
  bucket: string; // e.g., PLZ or coarse grid
  hash: string;
}

export function normalizeAddress(street: string, zip: string): NormalizedAddress {
  // Placeholder logic
  // In a real app, this would map to a coarse coordinate or PLZ centroid
  const bucket = zip || "Unknown";
  const hash = Buffer.from(`${street}-${zip}`).toString("base64"); // Simple hash for demo

  return {
    original: `${street}, ${zip}`,
    bucket,
    hash,
  };
}
