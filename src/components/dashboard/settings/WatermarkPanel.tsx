"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Shop } from "@/lib/supabase/types";

export default function WatermarkPanel({
  shop,
  onSaved,
  showContinue = false,
  continueLabel = "Continue →",
  onContinue,
}: {
  shop: Shop | null;
  onSaved: () => void;
  showContinue?: boolean;
  continueLabel?: string;
  onContinue?: () => void;
}) {
  const [mandatoryCamera, setMandatoryCamera] = useState(
    shop?.mandatory_live_camera ?? true
  );
  const [showLogo, setShowLogo] = useState(shop?.watermark_show_logo ?? true);
  const [showTimestamp, setShowTimestamp] = useState(
    shop?.watermark_show_timestamp ?? true
  );
  const [showGps, setShowGps] = useState(shop?.watermark_show_gps ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!shop) {
    return (
      <p className="text-sm text-slate-400">
        Set up your Company Profile first to customize photo watermarks.
      </p>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const { error: updateError } = await supabase
      .from("shops")
      .update({
        mandatory_live_camera: mandatoryCamera,
        watermark_show_logo: showLogo,
        watermark_show_timestamp: showTimestamp,
        watermark_show_gps: showGps,
      })
      .eq("id", shop!.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
    onSaved();

    if (showContinue) {
      onContinue?.();
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 shadow-sm shadow-black/20">
          <div>
            <span className="text-sm text-slate-300">Mandatory Live Camera</span>
            <p className="text-xs text-slate-500">
              Disables phone gallery uploads in the tech app &mdash; live
              capture only.
            </p>
          </div>
          <input
            type="checkbox"
            checked={mandatoryCamera}
            onChange={(e) => setMandatoryCamera(e.target.checked)}
            className="h-4 w-4 shrink-0 accent-brand-blue"
          />
        </label>

        <label className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 shadow-sm shadow-black/20">
          <span className="text-sm text-slate-300">
            Overlay company logo
          </span>
          <input
            type="checkbox"
            checked={showLogo}
            onChange={(e) => setShowLogo(e.target.checked)}
            className="h-4 w-4 accent-brand-blue"
          />
        </label>

        <label className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 shadow-sm shadow-black/20">
          <span className="text-sm text-slate-300">Overlay timestamp</span>
          <input
            type="checkbox"
            checked={showTimestamp}
            onChange={(e) => setShowTimestamp(e.target.checked)}
            className="h-4 w-4 accent-brand-blue"
          />
        </label>

        <label className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 shadow-sm shadow-black/20">
          <span className="text-sm text-slate-300">
            Overlay GPS coordinates
          </span>
          <input
            type="checkbox"
            checked={showGps}
            onChange={(e) => setShowGps(e.target.checked)}
            className="h-4 w-4 accent-brand-blue"
          />
        </label>

        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-lg border border-brand-emerald/30 bg-brand-emerald/10 px-3.5 py-2.5 text-sm text-brand-emerald">
            Saved.
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : showContinue ? `Save & ${continueLabel}` : "Save Changes"}
        </button>
      </form>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-slate-400">
          Live Preview
        </p>
        <div className="relative aspect-video overflow-hidden rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 shadow-md shadow-black/20">
          {showLogo && (
            <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-md bg-black/50 px-2 py-1 backdrop-blur">
              <span className="flex h-4 w-4 items-center justify-center rounded bg-brand-blue text-[8px] font-bold text-white">
                {shop.shop_name.slice(0, 1).toUpperCase() || "S"}
              </span>
              <span className="text-[10px] font-semibold text-white">
                {shop.shop_name}
              </span>
            </div>
          )}
          {showTimestamp && (
            <div className="absolute bottom-3 left-3 rounded-md bg-black/50 px-2 py-1 text-[10px] font-medium text-white backdrop-blur">
              Sep 8, 2026 &middot; 4:12 PM
            </div>
          )}
          {showGps && (
            <div className="absolute bottom-3 right-3 rounded-md bg-black/50 px-2 py-1 text-[10px] font-medium text-white backdrop-blur">
              37.7749&deg; N, -122.4194&deg; W
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
