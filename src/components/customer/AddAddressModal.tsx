"use client";

import { useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import { X } from "lucide-react";
import { COUNTRIES } from "@/lib/location/countries";
import PhilippinesAddressFields from "@/components/shared/PhilippinesAddressFields";
import { createCustomerAddress, type CustomerAddress } from "@/lib/customer/addresses";

const LocationPickerMap = dynamic(
  () => import("@/components/shared/LocationPickerMap"),
  { ssr: false, loading: () => <p className="text-sm text-slate-400">Loading map...</p> }
);

export default function AddAddressModal({
  customerId,
  defaultCountry,
  hasExistingAddresses,
  onClose,
  onCreated,
}: {
  customerId: string;
  defaultCountry: string | null;
  hasExistingAddresses: boolean;
  onClose: () => void;
  onCreated: (address: CustomerAddress) => void;
}) {
  const [label, setLabel] = useState("");
  const [country, setCountry] = useState(defaultCountry || "Philippines");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [barangay, setBarangay] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [makeDefault, setMakeDefault] = useState(!hasExistingAddresses);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const address = await createCustomerAddress({
        customerId,
        label: label.trim(),
        country,
        region,
        city,
        barangay,
        latitude,
        longitude,
        makeDefault,
      });
      onCreated(address);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save address.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-0 py-0 sm:items-center sm:px-6">
      <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-t-3xl bg-brand-navy p-6 shadow-[0_30px_60px_-15px_rgba(14,165,233,0.45)] sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Add New Address</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <input
            type="text"
            required
            placeholder="Label (e.g. Home, Second Home, Office)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-brand-blue focus:outline-none"
          />

          <select
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              setRegion("");
              setCity("");
              setBarangay("");
            }}
            className="w-full rounded-xl bg-white/5 px-3 py-3 text-sm text-white focus:ring-2 focus:ring-brand-blue focus:outline-none [color-scheme:dark]"
          >
            {COUNTRIES.map((c) => (
              <option key={c} value={c} style={{ backgroundColor: "#0F172A", color: "#fff" }}>
                {c}
              </option>
            ))}
          </select>

          {country === "Philippines" ? (
            <PhilippinesAddressFields
              region={region}
              city={city}
              barangay={barangay}
              onRegionChange={setRegion}
              onCityChange={setCity}
              onBarangayChange={setBarangay}
              inputClassName="w-full rounded-xl bg-white/5 px-3 py-3 text-sm text-white focus:ring-2 focus:ring-brand-blue focus:outline-none disabled:opacity-50 [color-scheme:dark]"
            />
          ) : (
            <>
              <input
                type="text"
                placeholder="Region/State"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-brand-blue focus:outline-none"
              />
              <input
                type="text"
                placeholder="Municipality / City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-brand-blue focus:outline-none"
              />
              <input
                type="text"
                placeholder="Barangay"
                value={barangay}
                onChange={(e) => setBarangay(e.target.value)}
                className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-brand-blue focus:outline-none"
              />
            </>
          )}

          <div className="rounded-xl bg-white/5 p-3">
            <LocationPickerMap
              latitude={latitude}
              longitude={longitude}
              onChange={(lat, lng) => {
                setLatitude(lat);
                setLongitude(lng);
              }}
              label="Pin This Address"
              description="Tap the map to drop a pin here, or use your current location."
            />
          </div>

          {hasExistingAddresses && (
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={makeDefault}
                onChange={(e) => setMakeDefault(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/5 text-brand-blue focus:ring-brand-blue"
              />
              Set as my default address
            </label>
          )}

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-6 py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Address"}
          </button>
        </form>
      </div>
    </div>
  );
}
