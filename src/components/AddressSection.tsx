"use client";

import AddressInput, { Address } from "./AddressInput";
import AddressList from "./AddressList";

interface AddressSectionProps {
  addresses: Address[];
  setAddresses: (addresses: Address[]) => void;
}

export default function AddressSection({ addresses, setAddresses }: AddressSectionProps) {
  const handleAddAddress = (address: Address) => {
    if (addresses.length >= 15) return;
    
    // Check for duplicates based on coordinates (approximate match to handle float precision)
    const isDuplicate = addresses.some(existing => {
      const [exLon, exLat] = existing.coordinates;
      const [newLon, newLat] = address.coordinates;
      const epsilon = 0.0001; // ~11 meters
      return Math.abs(exLon - newLon) < epsilon && Math.abs(exLat - newLat) < epsilon;
    });

    if (isDuplicate) {
      // Optional: You could add a toast notification here
      console.warn("Address already exists");
      return;
    }

    setAddresses([...addresses, address]);
  };

  return (
    <div className="bg-card p-6 shadow-sm border border-border xl:col-span-2 space-y-2 flex flex-col max-h-[calc(100vh-200px)]">
      <AddressInput onAddAddress={handleAddAddress} disabled={addresses.length >= 15} />
      <div className="flex-1 overflow-y-auto min-h-0">
        <AddressList addresses={addresses} setAddresses={setAddresses} />
      </div>
    </div>
  );
}
