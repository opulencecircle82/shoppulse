"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";
import type { LocalNetworkAd } from "@/lib/supabase/types";

export default function LocalAdManager({ shopId }: { shopId: string }) {
  const [ads, setAds] = useState<LocalNetworkAd[]>([]);
  const [loading, setLoading] = useState(true);

  const [businessCategory, setBusinessCategory] = useState("");
  const [adHeadline, setAdHeadline] = useState("");
  const [adBody, setAdBody] = useState("");
  const [targetZipCodes, setTargetZipCodes] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [clickUrl, setClickUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadAds() {
    setLoading(true);
    const { data } = await supabase
      .from("local_network_ads")
      .select("*")
      .eq("shop_id", shopId);
    setAds((data as LocalNetworkAd[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    const id = setTimeout(() => {
      loadAds();
    }, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const { error: insertError } = await supabase
      .from("local_network_ads")
      .insert({
        shop_id: shopId,
        business_category: businessCategory,
        ad_headline: adHeadline,
        ad_body: adBody,
        target_zip_codes: targetZipCodes
          ? targetZipCodes.split(",").map((z) => z.trim()).filter(Boolean)
          : null,
        promo_code: promoCode || null,
        click_url: clickUrl,
      });

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setBusinessCategory("");
    setAdHeadline("");
    setAdBody("");
    setTargetZipCodes("");
    setPromoCode("");
    setClickUrl("");
    loadAds();
  }

  async function toggleActive(ad: LocalNetworkAd) {
    await supabase
      .from("local_network_ads")
      .update({ is_active: !ad.is_active })
      .eq("id", ad.id);
    loadAds();
  }

  async function deleteAd(ad: LocalNetworkAd) {
    if (!window.confirm(`Delete ad "${ad.ad_headline}"?`)) return;
    await supabase.from("local_network_ads").delete().eq("id", ad.id);
    loadAds();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-3xl bg-brand-slate-light/50 p-6 shadow-xl shadow-black/30"
      >
        <h3 className="text-sm font-semibold text-white">
          Create Local Ad Unit
        </h3>

        <div>
          <label className="block text-xs font-medium text-slate-400">
            Business Category
          </label>
          <input
            type="text"
            required
            placeholder="Plumbing, Electrical..."
            value={businessCategory}
            onChange={(e) => setBusinessCategory(e.target.value)}
            className="mt-1 w-full rounded-xl bg-brand-slate/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-brand-emerald focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400">
            Ad Headline
          </label>
          <input
            type="text"
            required
            value={adHeadline}
            onChange={(e) => setAdHeadline(e.target.value)}
            className="mt-1 w-full rounded-xl bg-brand-slate/60 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-brand-emerald focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400">
            Ad Body
          </label>
          <textarea
            required
            rows={2}
            value={adBody}
            onChange={(e) => setAdBody(e.target.value)}
            className="mt-1 w-full rounded-xl bg-brand-slate/60 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-brand-emerald focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400">
            Target Zip Codes (comma-separated)
          </label>
          <input
            type="text"
            placeholder="94103, 94107"
            value={targetZipCodes}
            onChange={(e) => setTargetZipCodes(e.target.value)}
            className="mt-1 w-full rounded-xl bg-brand-slate/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-brand-emerald focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400">
              Promo Code
            </label>
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              className="mt-1 w-full rounded-xl bg-brand-slate/60 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-brand-emerald focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400">
              Click URL
            </label>
            <input
              type="url"
              required
              value={clickUrl}
              onChange={(e) => setClickUrl(e.target.value)}
              className="mt-1 w-full rounded-xl bg-brand-slate/60 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-brand-emerald focus:outline-none"
            />
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
          className="rounded-full bg-brand-emerald px-6 py-2.5 text-sm font-semibold text-brand-slate transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Creating..." : "Create Ad"}
        </button>
      </form>

      <div>
        <h3 className="text-sm font-semibold text-white">
          Active Ad Units ({ads.length})
        </h3>
        {loading && <p className="mt-3 text-sm text-slate-400">Loading...</p>}
        {!loading && ads.length === 0 && (
          <p className="mt-3 text-sm text-slate-400">No ads created yet.</p>
        )}
        <div className="mt-3 space-y-3">
          {ads.map((ad) => (
            <div
              key={ad.id}
              className="rounded-2xl bg-brand-slate-light/40 p-4 shadow-md shadow-black/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {ad.ad_headline}
                  </p>
                  <p className="text-xs text-slate-500">
                    {ad.business_category}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    ad.is_active
                      ? "bg-brand-emerald/15 text-brand-emerald"
                      : "bg-slate-700/50 text-slate-400"
                  }`}
                >
                  {ad.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-400">{ad.ad_body}</p>
              {ad.target_zip_codes && ad.target_zip_codes.length > 0 && (
                <p className="mt-1 text-xs text-slate-500">
                  Zips: {ad.target_zip_codes.join(", ")}
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => toggleActive(ad)}
                  className="rounded-full border border-slate-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:border-brand-sky hover:text-brand-sky"
                >
                  {ad.is_active ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  onClick={() => deleteAd(ad)}
                  className="rounded-full border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
