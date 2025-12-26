import { forwardRef } from "react";
import BadgeGenerator from "./BadgeGenerator";
import { Address } from "./AddressInput";

interface MapSectionProps {
  addresses: Address[];
  onDownloadSvg: () => void;
  onDownloadPng: () => void;
}

const MapSection = forwardRef<SVGSVGElement, MapSectionProps>(({ addresses, onDownloadSvg, onDownloadPng }, ref) => {
  return (
    <div className="bg-card p-6 shadow-sm border border-border xl:col-span-4">
      <div className="aspect-square bg-muted rounded-lg flex items-center justify-center p-4 overflow-hidden relative">
        <BadgeGenerator 
          addresses={addresses} 
          ref={ref} 
          onDownloadSvg={onDownloadSvg}
          onDownloadPng={onDownloadPng}
        />
      </div>
    </div>
  );
});

MapSection.displayName = "MapSection";

export default MapSection;
