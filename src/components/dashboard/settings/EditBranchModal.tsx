"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Branch } from "@/lib/supabase/types";

const LocationPickerMap = dynamic(
  () => import("@/components/shared/LocationPickerMap"),
  { ssr: false, loading: () => <p className="text-sm text-slate-500">Loading map...</p> }
);

const DAYS = [
  { id: "MON", label: "Mon" },
  { id: "TUE", label: "Tue" },
  { id: "WED", label: "Wed" },
  { id: "THU", label: "Thu" },
  { id: "FRI", label: "Fri" },
  { id: "SAT", label: "Sat" },
  { id: "SUN", label: "Sun" },
] as const;

const inputClass =
  "mt-1.5 w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none";
const labelClass = "block text-xs font-medium text-slate-500";

export default function EditBranchModal({
  branch,
  onClose,
  onSaved,
}: {
  branch: Branch;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(branch.name);
  const [address, setAddress] = useState(branch.address);
  const [contactPhone, setContactPhone] = useState(branch.contact_phone ?? "");
  const [city, setCity] = useState(branch.city ?? "");
  const [region, setRegion] = useState(branch.region ?? "");
  const [latitude, setLatitude] = useState<number | null>(branch.latitude);
  const [longitude, setLongitude] = useState<number | null>(branch.longitude);
  const [openTime, setOpenTime] = useState(branch.business_hours_open ?? "08:00");
  const [closeTime, setCloseTime] = useState(branch.business_hours_close ?? "17:00");
  const [days, setDays] = useState<string[]>(branch.business_days);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);

    if (!address.trim()) {
      setError("Please enter this branch's address.");
      return;
    }
    if (latitude === null || longitude === null) {
      setError("Please drop this branch's pin on the map.");
      return;
    }
    if (days.length === 0) {
      setError("Pick at least one working day.");
      return;
    }
    if (!openTime || !closeTime || closeTime <= openTime) {
      setError("Closing time must be after opening time.");
      return;
    }

    setSaving(true);
    const { error: rpcError } = await supabase.rpc("update_branch", {
      p_branch_id: branch.id,
      p_name: name.trim(),
      p_address: address.trim(),
      p_latitude: latitude,
      p_longitude: longitude,
      p_contact_phone: contactPhone.trim() || null,
      p_city: city.trim() || null,
      p_region: region.trim() || null,
      p_business_hours_open: openTime,
      p_business_hours_close: closeTime,
      p_business_days: days,
    });
    setSaving(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 sm:px-6">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/10">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Edit Branch</h3>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-900" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className={labelClass}>Branch Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Address</label>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>City</label>
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Region</label>
              <input type="text" value={region} onChange={(e) => setRegion(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Contact Number</label>
            <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Operating Days</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <button
                  key={day.id}
                  type="button"
                  onClick={() =>
                    setDays((prev) => (prev.includes(day.id) ? prev.filter((d) => d !== day.id) : [...prev, day.id]))
                  }
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    days.includes(day.id) ? "bg-brand-blue text-white" : "bg-slate-50 text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Opens At</label>
              <input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Closes At</label>
              <input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} className={inputClass} />
            </div>
          </div>

          <LocationPickerMap
            tone="light"
            label="Branch Pin"
            latitude={latitude}
            longitude={longitude}
            onChange={(lat, lng) => {
              setLatitude(lat);
              setLongitude(lng);
            }}
          />
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-900"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
