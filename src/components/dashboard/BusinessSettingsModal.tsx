"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ImageUp, Loader2, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Currency, Shop } from "@/lib/supabase/types";

const CURRENCIES: Currency[] = ["USD", "AUD", "GBP", "EUR"];
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export default function BusinessSettingsModal({
  shop,
  onClose,
  onSaved,
}: {
  shop: Shop;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [shopName, setShopName] = useState(shop.shop_name);
  const [logoUrl, setLogoUrl] = useState(shop.logo_url ?? "");
  const [currency, setCurrency] = useState<Currency>(shop.currency);
  const [radius, setRadius] = useState(shop.geofence_radius_meters);
  const [showLogo, setShowLogo] = useState(shop.watermark_show_logo);
  const [showTimestamp, setShowTimestamp] = useState(shop.watermark_show_timestamp);
  const [showGps, setShowGps] = useState(shop.watermark_show_gps);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function uploadLogo(file: File) {
    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload an image file.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setUploadError("Logo must be under 2MB.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    const path = `${shop.id}/${Date.now()}.${file.name.split(".").pop() ?? "png"}`;
    const { error: uploadErr } = await supabase.storage
      .from("shop-logos")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadErr) {
      setUploading(false);
      setUploadError(uploadErr.message);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("shop-logos").getPublicUrl(path);

    setLogoUrl(publicUrl);
    setUploading(false);
  }

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) uploadLogo(file);
    event.target.value = "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("shops")
      .update({
        shop_name: shopName,
        logo_url: logoUrl || null,
        currency,
        geofence_radius_meters: radius,
        watermark_show_logo: showLogo,
        watermark_show_timestamp: showTimestamp,
        watermark_show_gps: showGps,
      })
      .eq("id", shop.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    onSaved();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-brand-slate p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-white">Business Settings</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-400">
              Business Name
            </label>
            <input
              type="text"
              required
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-brand-slate-light/40 px-3 py-2 text-sm text-white focus:border-brand-emerald focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400">
              Logo
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
            {logoUrl ? (
              <div className="mt-1.5 flex items-center gap-3 rounded-lg border border-slate-600 bg-brand-slate-light/40 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt="Business logo"
                  className="h-12 w-12 rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-medium text-brand-emerald hover:text-emerald-400"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={() => setLogoUrl("")}
                  className="ml-auto text-slate-400 hover:text-red-400"
                  aria-label="Remove logo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-600 bg-brand-slate-light/40 px-4 py-4 text-xs text-slate-400 hover:border-slate-500"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-brand-emerald" />
                ) : (
                  <ImageUp className="h-4 w-4" />
                )}
                {uploading ? "Uploading..." : "Upload logo"}
              </button>
            )}
            {uploadError && (
              <p className="mt-1.5 text-xs text-red-400">{uploadError}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-brand-slate-light/40 px-3 py-2 text-sm text-white focus:border-brand-emerald focus:outline-none"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-400">
                Geofence Radius Tolerance
              </label>
              <span className="text-xs font-semibold text-brand-emerald">
                {radius}m
              </span>
            </div>
            <input
              type="range"
              min={50}
              max={500}
              step={10}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="mt-2 w-full accent-brand-emerald"
            />
          </div>

          <div>
            <p className="text-xs font-medium text-slate-400">
              Watermark Formatting
            </p>
            <div className="mt-2 space-y-2">
              <label className="flex items-center justify-between rounded-lg border border-slate-700 bg-brand-slate-light/30 px-3 py-2">
                <span className="text-sm text-slate-300">Company logo</span>
                <input
                  type="checkbox"
                  checked={showLogo}
                  onChange={(e) => setShowLogo(e.target.checked)}
                  className="h-4 w-4 accent-brand-emerald"
                />
              </label>
              <label className="flex items-center justify-between rounded-lg border border-slate-700 bg-brand-slate-light/30 px-3 py-2">
                <span className="text-sm text-slate-300">Timestamp</span>
                <input
                  type="checkbox"
                  checked={showTimestamp}
                  onChange={(e) => setShowTimestamp(e.target.checked)}
                  className="h-4 w-4 accent-brand-emerald"
                />
              </label>
              <label className="flex items-center justify-between rounded-lg border border-slate-700 bg-brand-slate-light/30 px-3 py-2">
                <span className="text-sm text-slate-300">GPS coordinates</span>
                <input
                  type="checkbox"
                  checked={showGps}
                  onChange={(e) => setShowGps(e.target.checked)}
                  className="h-4 w-4 accent-brand-emerald"
                />
              </label>
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-full bg-brand-emerald px-6 py-3 text-sm font-semibold text-brand-slate shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-shadow hover:shadow-[0_0_30px_rgba(16,185,129,0.75)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </form>
      </div>
    </div>
  );
}
