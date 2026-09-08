"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";
import { slugify } from "@/lib/slugify";
import type { Currency, Shop } from "@/lib/supabase/types";

const CURRENCIES: Currency[] = ["USD", "AUD", "GBP", "EUR"];

export default function CompanyProfilePanel({
  shop,
  onSaved,
}: {
  shop: Shop | null;
  onSaved: () => void;
}) {
  const [shopName, setShopName] = useState(shop?.shop_name ?? "");
  const [logoUrl, setLogoUrl] = useState(shop?.logo_url ?? "");
  const [address, setAddress] = useState(shop?.address ?? "");
  const [currency, setCurrency] = useState<Currency>(shop?.currency ?? "USD");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    if (shop) {
      const { error: updateError } = await supabase
        .from("shops")
        .update({
          shop_name: shopName,
          logo_url: logoUrl || null,
          address: address || null,
          currency,
        })
        .eq("id", shop.id);

      setSaving(false);
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setSuccess(true);
      onSaved();
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      setError("You must be signed in.");
      return;
    }

    const { data: newShop, error: insertShopError } = await supabase
      .from("shops")
      .insert({
        shop_name: shopName,
        slug: slugify(shopName),
        logo_url: logoUrl || null,
        address: address || null,
        currency,
      })
      .select()
      .single();

    if (insertShopError || !newShop) {
      setSaving(false);
      setError(insertShopError?.message ?? "Failed to create shop.");
      return;
    }

    const { error: insertStaffError } = await supabase
      .from("staff_members")
      .insert({
        shop_id: newShop.id,
        auth_user_id: user.id,
        full_name:
          (user.user_metadata?.full_name as string | undefined) ??
          user.email ??
          "Owner",
        email: user.email ?? "",
        role: "OWNER",
      });

    setSaving(false);

    if (insertStaffError) {
      setError(insertStaffError.message);
      return;
    }

    setSuccess(true);
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {!shop && (
        <p className="rounded-lg border border-brand-sky/30 bg-brand-sky/10 px-4 py-3 text-sm text-brand-sky">
          Welcome! Set up your shop profile to get started.
        </p>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-300">
          Business Name
        </label>
        <input
          type="text"
          required
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-slate-600 bg-brand-slate px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-brand-emerald focus:outline-none"
          placeholder="Apex Property Services"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300">
          Business Logo URL
        </label>
        <input
          type="url"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-slate-600 bg-brand-slate px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-brand-emerald focus:outline-none"
          placeholder="https://example.com/logo.png"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300">
          Business Address
        </label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-slate-600 bg-brand-slate px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-brand-emerald focus:outline-none"
          placeholder="123 Main St, San Francisco, CA"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300">
          Primary Operating Currency
        </label>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value as Currency)}
          className="mt-1.5 w-full rounded-lg border border-slate-600 bg-brand-slate px-3.5 py-2.5 text-sm text-white focus:border-brand-emerald focus:outline-none"
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
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
          Saved.
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-full bg-brand-emerald px-6 py-3 text-sm font-semibold text-brand-slate shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-shadow hover:shadow-[0_0_30px_rgba(16,185,129,0.75)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving..." : shop ? "Save Changes" : "Create Shop"}
      </button>
    </form>
  );
}
