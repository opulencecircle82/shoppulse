"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ImageUp, Loader2, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Currency, Shop } from "@/lib/supabase/types";

const CURRENCIES: Currency[] = ["USD", "AUD", "GBP", "EUR"];
const RADIUS_PRESETS = [50, 100, 250, 500];
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export default function SetupCustomizePanel({
  shop,
  onSaved,
  isMobileOpen,
  onCloseMobile,
}: {
  shop: Shop;
  onSaved: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const [shopName, setShopName] = useState(shop.shop_name);
  const [logoUrl, setLogoUrl] = useState(shop.logo_url ?? "");
  const [primaryColor, setPrimaryColor] = useState(shop.primary_color_hex);
  const [mandatoryCamera, setMandatoryCamera] = useState(shop.mandatory_live_camera);
  const [showLogo, setShowLogo] = useState(shop.watermark_show_logo);
  const [showTimestamp, setShowTimestamp] = useState(shop.watermark_show_timestamp);
  const [showGps, setShowGps] = useState(shop.watermark_show_gps);
  const [radius, setRadius] = useState(shop.geofence_radius_meters);
  const [currency, setCurrency] = useState<Currency>(shop.currency);
  const [defaultHourlyRate, setDefaultHourlyRate] = useState(shop.default_hourly_rate);
  const [defaultOvertimeMultiplier, setDefaultOvertimeMultiplier] = useState(
    shop.default_overtime_multiplier
  );

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
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
    setSuccess(false);

    const { error: updateError } = await supabase
      .from("shops")
      .update({
        shop_name: shopName,
        logo_url: logoUrl || null,
        primary_color_hex: primaryColor,
        mandatory_live_camera: mandatoryCamera,
        watermark_show_logo: showLogo,
        watermark_show_timestamp: showTimestamp,
        watermark_show_gps: showGps,
        geofence_radius_meters: radius,
        currency,
        default_hourly_rate: defaultHourlyRate,
        default_overtime_multiplier: defaultOvertimeMultiplier,
      })
      .eq("id", shop.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
    onSaved();
  }

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-sm transform overflow-y-auto bg-brand-slate p-6 shadow-2xl shadow-black/40 transition-transform duration-200 lg:static lg:z-auto lg:w-full lg:max-w-none lg:translate-x-0 lg:transform-none lg:overflow-visible lg:rounded-3xl lg:shadow-xl lg:shadow-black/30 ${
          isMobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">
            Setup &amp; Customize
          </h2>
          <button
            type="button"
            onClick={onCloseMobile}
            className="text-slate-500 hover:text-slate-900 lg:hidden"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Syncs to the ShopPulse technician mobile app.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-6">
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">
              Branding &amp; Mobile App Theme
            </p>
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500">
                  Business Name
                </label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-brand-slate-light/40 px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-brand-blue focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500">
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
                  <div className="mt-1.5 flex items-center gap-3 rounded-xl bg-brand-slate-light/40 p-3 shadow-sm shadow-black/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoUrl}
                      alt="Business logo"
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-medium text-brand-blue hover:text-blue-400"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogoUrl("")}
                      className="ml-auto text-slate-500 hover:text-red-400"
                      aria-label="Remove logo"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-brand-slate-light/40 px-4 py-3 text-xs text-slate-500 hover:border-slate-500"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-brand-blue" />
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
                <label className="block text-xs font-medium text-slate-500">
                  Primary Brand Color
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded-lg bg-transparent focus:ring-2 focus:ring-brand-blue focus:outline-none"
                  />
                  <span className="text-xs text-slate-500">{primaryColor}</span>
                </div>
              </div>
            </div>
          </section>

          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">
              Mobile Proof &amp; Anti-Fraud
            </p>
            <div className="mt-3 space-y-2">
              <label className="flex items-center justify-between rounded-xl bg-brand-slate-light/30 px-3 py-2.5 shadow-sm shadow-black/20">
                <div>
                  <span className="text-sm text-slate-600">
                    Mandatory Live Camera
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Disables phone gallery uploads in the tech app
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={mandatoryCamera}
                  onChange={(e) => setMandatoryCamera(e.target.checked)}
                  className="h-4 w-4 shrink-0 accent-brand-blue"
                />
              </label>

              <p className="pt-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Watermark Customizer
              </p>
              <label className="flex items-center justify-between rounded-xl bg-brand-slate-light/30 px-3 py-2 shadow-sm shadow-black/20">
                <span className="text-sm text-slate-600">Company Logo</span>
                <input
                  type="checkbox"
                  checked={showLogo}
                  onChange={(e) => setShowLogo(e.target.checked)}
                  className="h-4 w-4 accent-brand-blue"
                />
              </label>
              <label className="flex items-center justify-between rounded-xl bg-brand-slate-light/30 px-3 py-2 shadow-sm shadow-black/20">
                <span className="text-sm text-slate-600">Live Timestamp</span>
                <input
                  type="checkbox"
                  checked={showTimestamp}
                  onChange={(e) => setShowTimestamp(e.target.checked)}
                  className="h-4 w-4 accent-brand-blue"
                />
              </label>
              <label className="flex items-center justify-between rounded-xl bg-brand-slate-light/30 px-3 py-2 shadow-sm shadow-black/20">
                <span className="text-sm text-slate-600">Exact GPS Coordinates</span>
                <input
                  type="checkbox"
                  checked={showGps}
                  onChange={(e) => setShowGps(e.target.checked)}
                  className="h-4 w-4 accent-brand-blue"
                />
              </label>
            </div>
          </section>

          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">
              Operational Rules
            </p>
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500">
                  Geofence Accuracy
                </label>
                <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                  {RADIUS_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRadius(preset)}
                      className={`rounded-xl px-2 py-1.5 text-xs font-semibold transition-colors ${
                        radius === preset
                          ? "bg-brand-blue text-white"
                          : "bg-brand-slate-light/40 text-slate-500 shadow-sm shadow-black/20 hover:text-slate-900"
                      }`}
                    >
                      {preset}m
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                  className="mt-1 w-full rounded-xl bg-brand-slate-light/40 px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-brand-blue focus:outline-none"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500">
                    Default Hourly Rate
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={defaultHourlyRate}
                    onChange={(e) => setDefaultHourlyRate(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl bg-brand-slate-light/40 px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-brand-blue focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500">
                    Overtime Multiplier
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={0.1}
                    value={defaultOvertimeMultiplier}
                    onChange={(e) =>
                      setDefaultOvertimeMultiplier(Number(e.target.value))
                    }
                    className="mt-1 w-full rounded-xl bg-brand-slate-light/40 px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-brand-blue focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </section>

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-lg border border-brand-emerald/30 bg-brand-emerald/10 px-3.5 py-2.5 text-sm text-brand-emerald">
              Saved &mdash; synced to mobile app config.
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-full bg-brand-blue px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Setup"}
          </button>

          <a
            href="/dashboard/settings"
            className="block text-center text-xs font-medium text-slate-400 hover:text-brand-blue"
          >
            Manage address, staff pay rates & white-label →
          </a>
        </form>
      </aside>
    </>
  );
}
