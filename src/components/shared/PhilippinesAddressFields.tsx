"use client";

import { useEffect, useState } from "react";
import { PH_REGIONS } from "@/lib/location/phRegions";

type CityOption = { name: string; mun_code: string };
type BarangayOption = { name: string; mun_code: string };

// Real cascading Region -> Municipality/City -> Barangay dropdowns backed
// by the official PSGC dataset, fetched on demand from /api/geo/* (the
// full city/barangay lists are too large — 1,600+ / 41,000+ rows — to
// ship to the client up front). Only used when Country is Philippines;
// other countries fall back to free text in the caller.
//
// The three fields are stored as plain text (region/city/barangay names)
// on shops/customers, so this component tracks selection by name — it
// re-resolves the region's reg_code and the city's mun_code internally
// just to drive the next fetch, but never stores codes anywhere.
export default function PhilippinesAddressFields({
  region,
  city,
  barangay,
  onRegionChange,
  onCityChange,
  onBarangayChange,
  inputClassName,
}: {
  region: string;
  city: string;
  barangay: string;
  onRegionChange: (name: string) => void;
  onCityChange: (name: string) => void;
  onBarangayChange: (name: string) => void;
  inputClassName: string;
}) {
  const [cities, setCities] = useState<CityOption[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [barangays, setBarangays] = useState<BarangayOption[]>([]);
  const [loadingBarangays, setLoadingBarangays] = useState(false);

  const regionCode = PH_REGIONS.find((r) => r.name === region)?.reg_code ?? null;
  const cityMunCode = cities.find((c) => c.name === city)?.mun_code ?? null;

  useEffect(() => {
    if (!regionCode) return;
    let active = true;
    const id = setTimeout(() => {
      setLoadingCities(true);
      fetch(`/api/geo/cities?region=${regionCode}`)
        .then((res) => res.json())
        .then((data) => {
          if (active) setCities(data.cities ?? []);
        })
        .finally(() => {
          if (active) setLoadingCities(false);
        });
    }, 0);
    return () => {
      active = false;
      clearTimeout(id);
    };
  }, [regionCode]);

  useEffect(() => {
    if (!cityMunCode) return;
    let active = true;
    const id = setTimeout(() => {
      setLoadingBarangays(true);
      fetch(`/api/geo/barangays?mun=${cityMunCode}`)
        .then((res) => res.json())
        .then((data) => {
          if (active) setBarangays(data.barangays ?? []);
        })
        .finally(() => {
          if (active) setLoadingBarangays(false);
        });
    }, 0);
    return () => {
      active = false;
      clearTimeout(id);
    };
  }, [cityMunCode]);

  return (
    <>
      <select
        value={region}
        onChange={(e) => {
          onRegionChange(e.target.value);
          onCityChange("");
          onBarangayChange("");
        }}
        className={inputClassName}
      >
        <option value="">Select region</option>
        {PH_REGIONS.map((r) => (
          <option key={r.reg_code} value={r.name}>
            {r.name}
          </option>
        ))}
      </select>

      <select
        value={city}
        onChange={(e) => {
          onCityChange(e.target.value);
          onBarangayChange("");
        }}
        disabled={!regionCode || loadingCities}
        className={inputClassName}
      >
        <option value="">
          {loadingCities ? "Loading..." : "Select municipality/city"}
        </option>
        {cities.map((c) => (
          <option key={c.mun_code} value={c.name}>
            {c.name}
          </option>
        ))}
      </select>

      <select
        value={barangay}
        onChange={(e) => onBarangayChange(e.target.value)}
        disabled={!cityMunCode || loadingBarangays}
        className={inputClassName}
      >
        <option value="">
          {loadingBarangays ? "Loading..." : "Select barangay"}
        </option>
        {barangays.map((b) => (
          <option key={b.name} value={b.name}>
            {b.name}
          </option>
        ))}
      </select>
    </>
  );
}
