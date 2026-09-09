"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Camera, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Shop } from "@/lib/supabase/types";

const FONT_OPTIONS = [
  "Inter",
  "Roboto",
  "Poppins",
  "Montserrat",
  "Nunito",
  "Lato",
  "Open Sans",
] as const;

export default function CustomizeMobileAppTab({
  shop,
  onSaved,
}: {
  shop: Shop;
  onSaved: () => void;
}) {
  const [primaryColor, setPrimaryColor] = useState(shop.primary_color_hex);
  const [accentColor, setAccentColor] = useState(shop.accent_color_hex);
  const [fontFamily, setFontFamily] = useState(shop.mobile_app_font_family);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const linkId = "mobile-app-font-preview";
    let link = document.getElementById(linkId) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
      fontFamily
    )}:wght@400;600;700&display=swap`;
  }, [fontFamily]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const { error: updateError } = await supabase
      .from("shops")
      .update({
        primary_color_hex: primaryColor,
        accent_color_hex: accentColor,
        mobile_app_font_family: fontFamily,
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
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Customize Mobile App
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Theme applied to the ShopPulse technician app (Flutter).
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_280px]">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400">
                Primary Color
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border border-slate-600 bg-transparent"
                />
                <span className="text-xs text-slate-400">{primaryColor}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400">
                Accent Color
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border border-slate-600 bg-transparent"
                />
                <span className="text-xs text-slate-400">{accentColor}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400">
              App Font
            </label>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-600 bg-brand-slate-light/40 px-3 py-2 text-sm text-white focus:border-brand-emerald focus:outline-none"
            >
              {FONT_OPTIONS.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-lg border border-brand-emerald/30 bg-brand-emerald/10 px-3.5 py-2.5 text-sm text-brand-emerald">
              Saved &mdash; the technician app will pick this up on next
              launch.
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-brand-emerald px-6 py-3 text-sm font-semibold text-brand-slate shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-shadow hover:shadow-[0_0_30px_rgba(16,185,129,0.75)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save App Theme"}
          </button>
        </form>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            Live Preview
          </p>
          <div className="mx-auto w-[240px] overflow-hidden rounded-[28px] border-4 border-slate-700 bg-black shadow-2xl">
            <div
              style={{ backgroundColor: primaryColor, fontFamily }}
              className="flex items-center justify-between px-4 py-3"
            >
              <span className="text-sm font-bold text-white">
                {shop.shop_name || "ShopPulse"}
              </span>
              <span className="h-6 w-6 rounded-full bg-white/20" />
            </div>
            <div
              style={{ fontFamily }}
              className="space-y-3 bg-brand-slate p-4"
            >
              <p className="text-xs font-semibold text-slate-300">
                JOB VERIFICATION PROTOCOL
              </p>
              <label className="flex items-center gap-2 text-xs text-slate-400">
                <input type="checkbox" readOnly checked className="accent-current" style={{ accentColor }} />
                Tools &amp; Safety Gear Inspected
              </label>
              <button
                type="button"
                disabled
                style={{ backgroundColor: primaryColor, fontFamily }}
                className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold text-white"
              >
                <Camera className="h-3.5 w-3.5" />
                Take Live Photo Proof
              </button>
              <div
                style={{ fontFamily }}
                className="flex items-center gap-1.5 text-[10px] font-semibold"
              >
                <MapPin className="h-3 w-3" style={{ color: accentColor }} />
                <span style={{ color: accentColor }}>GPS Tagged: 37.7749, -122.4194</span>
              </div>
              <button
                type="button"
                disabled
                style={{ backgroundColor: accentColor, fontFamily }}
                className="w-full rounded-lg py-2.5 text-xs font-bold text-white"
              >
                CLOCK IN &amp; START JOB
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
