"use client";

import { useEffect, useId, useState, type ChangeEvent, type FormEvent } from "react";
import dynamic from "next/dynamic";
import { ImageUp, Loader2, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { slugify } from "@/lib/slugify";
import type { Currency, Shop, StaffMember } from "@/lib/supabase/types";
import { COUNTRIES } from "@/lib/location/countries";
import { SERVICE_CATEGORIES, SERVICE_CATEGORY_GROUPS } from "@/lib/location/serviceCategories";
import PhilippinesAddressFields from "@/components/shared/PhilippinesAddressFields";
import { deviceTimeZone } from "@/lib/shopTimezone";

const LocationPickerMap = dynamic(
  () => import("@/components/shared/LocationPickerMap"),
  { ssr: false, loading: () => <p className="text-sm text-slate-500">Loading map...</p> }
);

const CURRENCIES: Currency[] = ["USD", "AUD", "GBP", "EUR"];
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export default function CompanyProfilePanel({
  shop,
  staffMember,
  onSaved,
}: {
  shop: Shop | null;
  /** Null until the shop exists — the owner's own staff row, so their name can be edited afterward too. */
  staffMember: StaffMember | null;
  onSaved: (created: boolean) => void;
}) {
  // A plain email/password or Google sign-in with no display name otherwise leaves this blank forever
  // (nothing else in the app lets an owner correct their own name) — asked for up front instead.
  const [ownerName, setOwnerName] = useState(staffMember?.full_name ?? "");
  const [shopName, setShopName] = useState(shop?.shop_name ?? "");
  const [logoUrl, setLogoUrl] = useState(shop?.logo_url ?? "");
  const [primaryColor, setPrimaryColor] = useState(shop?.primary_color_hex ?? "#0F172A");
  const [address, setAddress] = useState(shop?.address ?? "");
  const [contactPhone, setContactPhone] = useState(shop?.contact_phone ?? "");
  const [currency, setCurrency] = useState<Currency>(shop?.currency ?? "USD");
  const [city, setCity] = useState(shop?.city ?? "");
  const [barangay, setBarangay] = useState(shop?.barangay ?? "");
  const [country, setCountry] = useState(shop?.country ?? "Philippines");
  const [region, setRegion] = useState(shop?.region ?? "");
  const [businessCategory, setBusinessCategory] = useState(shop?.business_category ?? "");
  const [categoryChoice, setCategoryChoice] = useState<string>(() => {
    const initial = shop?.business_category ?? "";
    if (!initial) return "";
    return (SERVICE_CATEGORIES as readonly string[]).includes(initial) ? initial : "Other";
  });
  const [isPubliclyListed, setIsPubliclyListed] = useState(shop?.is_publicly_listed ?? true);
  const [latitude, setLatitude] = useState<number | null>(shop?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(shop?.longitude ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const logoInputId = useId();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Google sign-in sometimes already has a display name — worth a head start, but still editable
  // and still required, rather than silently falling back to the email address at signup like before.
  useEffect(() => {
    if (shop || ownerName) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      const metaName = user?.user_metadata?.full_name as string | undefined;
      if (metaName) setOwnerName(metaName);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop]);

  async function uploadLogo(file: File) {
    const looksLikeImage =
      file.type.startsWith("image/") || /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(file.name);
    if (!looksLikeImage) {
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

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) uploadLogo(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (!ownerName.trim()) {
      setError("Please enter your name.");
      return;
    }
    // Customers and technicians find the business by its address and its pin, so both are required.
    if (!address.trim()) {
      setError("Please enter your business address — customers see it, and it is how your pin is placed on the map.");
      return;
    }
    if (latitude === null || longitude === null) {
      setError("Please drop your business pin on the map (tap the map or use your current location).");
      return;
    }

    setSaving(true);

    if (shop) {
      const { error: updateError } = await supabase
        .from("shops")
        .update({
          shop_name: shopName,
          logo_url: logoUrl || null,
          primary_color_hex: primaryColor,
          address: address.trim(),
          contact_phone: contactPhone || null,
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

      if (updateError) {
        setSaving(false);
        setError(
          updateError.code === "23505"
            ? "This business name is already taken. Please choose a different one."
            : updateError.message
        );
        return;
      }

      if (staffMember && ownerName.trim() !== staffMember.full_name) {
        const { error: nameError } = await supabase
          .from("staff_members")
          .update({ full_name: ownerName.trim() })
          .eq("id", staffMember.id);
        if (nameError) {
          setSaving(false);
          setError(nameError.message);
          return;
        }
      }

      setSaving(false);
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
        p_address: address.trim(),
        p_currency: currency,
        p_owner_full_name: ownerName.trim(),
        p_owner_email: user.email ?? "",
        p_country: country || null,
        p_region: region || null,
        p_city: city || null,
        p_barangay: barangay || null,
      }
    );

    if (rpcError || !newShop) {
      setSaving(false);
      setError(rpcError?.message ?? "Failed to create shop.");
      return;
    }

    // The create call doesn't take the pin, so it goes in right after. If that fails the shop still exists,
    // so carry on — the Company Profile asks for the pin again on the next save.
    await supabase
      .from("shops")
      .update({ latitude, longitude, timezone: deviceTimeZone() })
      .eq("id", (newShop as { id: string }).id);

    setSaving(false);
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
          Your Name
        </label>
        <p className="mt-1 text-xs text-slate-500">
          Shown on your own dashboard and staff list — never left as your email address.
        </p>
        <input
          type="text"
          required
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          className="mt-1.5 w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none"
          placeholder="Juan Dela Cruz"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600">
          Business Name
        </label>
        <input
          type="text"
          required
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
          className="mt-1.5 w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none"
          placeholder="Apex Property Services"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600">
          Business Logo
        </label>
        {/* A JS-triggered `fileInputRef.click()` can lose the browser's
            "user activation" by the time it runs inside some Android
            WebViews, silently failing to open the file/camera picker with
            no visible error. A real <label for=...> triggers the input's
            native default action directly from the tap, with no JS in
            between, so it can't lose activation. */}
        <input
          id={logoInputId}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {logoUrl ? (
          <div className="mt-1.5 flex items-center gap-4 rounded-xl bg-slate-50 p-4 shadow-sm shadow-slate-900/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt="Business logo"
              className="h-16 w-16 rounded-lg object-cover"
            />
            <div className="flex-1">
              <label
                htmlFor={logoInputId}
                className="cursor-pointer text-sm font-medium text-brand-blue hover:text-brand-blue-dark"
              >
                Replace logo
              </label>
            </div>
            <button
              type="button"
              onClick={() => setLogoUrl("")}
              className="text-slate-500 hover:text-red-600"
              aria-label="Remove logo"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label
            htmlFor={logoInputId}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`mt-1.5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
              dragActive
                ? "border-brand-blue bg-brand-blue/5"
                : "border-slate-300 bg-slate-50 hover:border-slate-500"
            }`}
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-brand-blue" />
            ) : (
              <ImageUp className="h-6 w-6 text-slate-500" />
            )}
            <p className="mt-2 text-sm text-slate-500">
              {uploading
                ? "Uploading..."
                : "Drag & drop your logo, or click to browse"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              PNG or JPG, up to 2MB
            </p>
          </label>
        )}

        {uploadError && (
          <p className="mt-2 text-sm text-red-600">{uploadError}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600">
          Primary Brand Color
        </label>
        <p className="mt-1 text-xs text-slate-500">
          Used for accents in your customer booking page and mobile app.
        </p>
        <div className="mt-1.5 flex items-center gap-3">
          <input
            type="color"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="h-10 w-14 cursor-pointer rounded-lg bg-transparent focus:ring-2 focus:ring-brand-blue focus:outline-none"
          />
          <span className="text-sm text-slate-500">{primaryColor}</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600">
          Business Address
        </label>
        <p className="mt-1 text-xs text-slate-500">
          Required — customers see it, and it is how your pin is placed on the map.
        </p>
        <input
          type="text"
          required
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="mt-1.5 w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none"
          placeholder="123 Main St, San Francisco, CA"
        />
      </div>

      {shop && (
        <div>
          <label className="block text-sm font-medium text-slate-600">
            Contact Number
          </label>
          <p className="mt-1 text-xs text-slate-500">
            Shown on invoices you generate for customers.
          </p>
          <input
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className="mt-1.5 w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none"
            placeholder="+1 555 123 4567"
          />
        </div>
      )}

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
          className="mt-1.5 w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-brand-blue focus:outline-none [color-scheme:light]"
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
            inputClassName="mt-1.5 w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-brand-blue focus:outline-none disabled:opacity-50 [color-scheme:light]"
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <input
            type="text"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="Region / State / Province"
            className="mt-1.5 w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none"
          />
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Municipality / City"
            className="mt-1.5 w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none"
          />
          <input
            type="text"
            value={barangay}
            onChange={(e) => setBarangay(e.target.value)}
            placeholder="Barangay"
            className="mt-1.5 w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none"
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
          className="mt-1.5 w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-brand-blue focus:outline-none [color-scheme:light]"
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600">
          Business Category
        </label>
        <select
          value={categoryChoice}
          onChange={(e) => {
            const value = e.target.value;
            setCategoryChoice(value);
            setBusinessCategory(value === "Other" ? "" : value);
          }}
          className="mt-1.5 w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-brand-blue focus:outline-none [color-scheme:light]"
        >
          <option value="">
            Select category
          </option>
          {SERVICE_CATEGORY_GROUPS.map((group) => (
            <optgroup
              key={group.group}
              label={group.group}
            >
              {group.categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </optgroup>
          ))}
          <option value="Other">
            Other
          </option>
        </select>
        {categoryChoice === "Other" && (
          <input
            type="text"
            value={businessCategory}
            onChange={(e) => setBusinessCategory(e.target.value)}
            placeholder="Specify your category"
            className="mt-2 w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none"
          />
        )}
      </div>

      {shop && (
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
      )}

      <LocationPickerMap
        tone="light"
        label="Pin Your Business on the Map (required)"
        latitude={latitude}
        longitude={longitude}
        onChange={(lat, lng) => {
          setLatitude(lat);
          setLongitude(lng);
        }}
        description="Search your address, tap the map, or use your current location — useful when your address has no formal street or house number. Customers will see this exact spot."
        country={country}
        enforceNearMe={!shop}
      />

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg border border-brand-emerald/30 bg-brand-emerald/10 px-3.5 py-2.5 text-sm text-brand-emerald-dark">
          Saved.
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving..." : shop ? "Save Changes" : "Create Shop"}
      </button>
    </form>
  );
}
