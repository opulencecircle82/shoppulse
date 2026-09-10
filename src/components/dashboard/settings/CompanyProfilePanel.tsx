"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import dynamic from "next/dynamic";
import { ImageUp, Loader2, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { slugify } from "@/lib/slugify";
import type { Currency, Shop } from "@/lib/supabase/types";
import { COUNTRIES } from "@/lib/location/countries";
import PhilippinesAddressFields from "@/components/shared/PhilippinesAddressFields";

const LocationPickerMap = dynamic(
  () => import("@/components/shared/LocationPickerMap"),
  { ssr: false, loading: () => <p className="text-sm text-slate-500">Loading map...</p> }
);

const CURRENCIES: Currency[] = ["USD", "AUD", "GBP", "EUR"];
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export default function CompanyProfilePanel({
  shop,
  onSaved,
}: {
  shop: Shop | null;
  onSaved: (created: boolean) => void;
}) {
  const [shopName, setShopName] = useState(shop?.shop_name ?? "");
  const [logoUrl, setLogoUrl] = useState(shop?.logo_url ?? "");
  const [address, setAddress] = useState(shop?.address ?? "");
  const [currency, setCurrency] = useState<Currency>(shop?.currency ?? "USD");
  const [city, setCity] = useState(shop?.city ?? "");
  const [barangay, setBarangay] = useState(shop?.barangay ?? "");
  const [country, setCountry] = useState(shop?.country ?? "Philippines");
  const [region, setRegion] = useState(shop?.region ?? "");
  const [businessCategory, setBusinessCategory] = useState(shop?.business_category ?? "");
  const [isPubliclyListed, setIsPubliclyListed] = useState(shop?.is_publicly_listed ?? true);
  const [latitude, setLatitude] = useState<number | null>(shop?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(shop?.longitude ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const ownerKey = shop?.id ?? user?.id ?? "temp";
    const extension = file.name.split(".").pop() ?? "png";
    const path = `${ownerKey}/${Date.now()}.${extension}`;

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

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) uploadLogo(file);
  }

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
          city: city || null,
          barangay: barangay || null,
          country: country || null,
          region: region || null,
          business_category: businessCategory || null,
          is_publicly_listed: isPubliclyListed,
          latitude,
          longitude,
        })
        .eq("id", shop.id);

      setSaving(false);
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setSuccess(true);
      onSaved(false);
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

    const { data: newShop, error: rpcError } = await supabase.rpc(
      "create_shop_and_owner",
      {
        p_shop_name: shopName,
        p_slug: slugify(shopName),
        p_logo_url: logoUrl || null,
        p_address: address || null,
        p_currency: currency,
        p_owner_full_name:
          (user.user_metadata?.full_name as string | undefined) ??
          user.email ??
          "Owner",
        p_owner_email: user.email ?? "",
        p_country: country || null,
        p_region: region || null,
        p_city: city || null,
        p_barangay: barangay || null,
      }
    );

    setSaving(false);

    if (rpcError || !newShop) {
      setError(rpcError?.message ?? "Failed to create shop.");
      return;
    }

    setSuccess(true);
    onSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {!shop && (
        <p className="rounded-lg border border-brand-blue/30 bg-brand-sky/10 px-4 py-3 text-sm text-brand-blue">
          Welcome! Set up your shop profile to get started.
        </p>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-600">
          Business Name
        </label>
        <input
          type="text"
          required
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
          className="mt-1.5 w-full rounded-xl bg-brand-slate px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none"
          placeholder="Apex Property Services"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600">
          Business Logo
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {logoUrl ? (
          <div className="mt-1.5 flex items-center gap-4 rounded-xl bg-brand-slate p-4 shadow-sm shadow-black/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt="Business logo"
              className="h-16 w-16 rounded-lg object-cover"
            />
            <div className="flex-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-sm font-medium text-brand-blue hover:text-blue-400"
              >
                Replace logo
              </button>
            </div>
            <button
              type="button"
              onClick={() => setLogoUrl("")}
              className="text-slate-500 hover:text-red-400"
              aria-label="Remove logo"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`mt-1.5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
              dragActive
                ? "border-brand-blue bg-brand-blue/5"
                : "border-slate-300 bg-brand-slate hover:border-slate-500"
            }`}
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-brand-blue" />
            ) : (
              <ImageUp className="h-6 w-6 text-slate-400" />
            )}
            <p className="mt-2 text-sm text-slate-500">
              {uploading
                ? "Uploading..."
                : "Drag & drop your logo, or click to browse"}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              PNG or JPG, up to 2MB
            </p>
          </div>
        )}

        {uploadError && (
          <p className="mt-2 text-sm text-red-400">{uploadError}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600">
          Business Address
        </label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="mt-1.5 w-full rounded-xl bg-brand-slate px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none"
          placeholder="123 Main St, San Francisco, CA"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600">
          Country
        </label>
        <select
          value={country}
          onChange={(e) => {
            setCountry(e.target.value);
            setRegion("");
            setCity("");
            setBarangay("");
          }}
          className="mt-1.5 w-full rounded-xl bg-brand-slate px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-brand-blue focus:outline-none"
        >
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {country === "Philippines" ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <PhilippinesAddressFields
            region={region}
            city={city}
            barangay={barangay}
            onRegionChange={setRegion}
            onCityChange={setCity}
            onBarangayChange={setBarangay}
            inputClassName="mt-1.5 w-full rounded-xl bg-brand-slate px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-brand-blue focus:outline-none disabled:opacity-50"
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <input
            type="text"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="Region / State / Province"
            className="mt-1.5 w-full rounded-xl bg-brand-slate px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none"
          />
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Municipality / City"
            className="mt-1.5 w-full rounded-xl bg-brand-slate px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none"
          />
          <input
            type="text"
            value={barangay}
            onChange={(e) => setBarangay(e.target.value)}
            placeholder="Barangay"
            className="mt-1.5 w-full rounded-xl bg-brand-slate px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-600">
          Primary Operating Currency
        </label>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value as Currency)}
          className="mt-1.5 w-full rounded-xl bg-brand-slate px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-brand-blue focus:outline-none"
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {shop && (
        <>
          <div>
            <label className="block text-sm font-medium text-slate-600">
              Business Category
            </label>
            <input
              type="text"
              value={businessCategory}
              onChange={(e) => setBusinessCategory(e.target.value)}
              className="mt-1.5 w-full rounded-xl bg-brand-slate px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none"
              placeholder="Plumbing, Cleaning..."
            />
          </div>

          <label className="flex items-center gap-2.5 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={isPubliclyListed}
              onChange={(e) => setIsPubliclyListed(e.target.checked)}
              className="accent-brand-blue"
            />
            List my business in the customer app&apos;s &quot;Find Services
            Near You&quot; directory
          </label>

          <LocationPickerMap
            latitude={latitude}
            longitude={longitude}
            onChange={(lat, lng) => {
              setLatitude(lat);
              setLongitude(lng);
            }}
            description="Tap anywhere on the map to drop a pin — useful when your address has no formal street or house number. Customers will see this exact spot."
          />
        </>
      )}

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
        className="rounded-full bg-brand-blue px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving..." : shop ? "Save Changes" : "Create Shop"}
      </button>
    </form>
  );
}
