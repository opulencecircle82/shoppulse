"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { Globe, Loader2, Palette } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Shop } from "@/lib/supabase/types";
import { stockPhotoForCategory } from "@/lib/location/categoryStockPhotos";

export default function BusinessWebsiteCard({ shop }: { shop: Shop }) {
  const headerInputId = useId();
  const [headerUrl, setHeaderUrl] = useState(shop.website_header_url);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  const siteUrl =
    typeof window !== "undefined" ? `${window.location.origin}/site/${shop.slug}` : "";
  const previewUrl = headerUrl || stockPhotoForCategory(shop.business_category);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const looksLikeImage =
      file.type.startsWith("image/") || /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(file.name);
    if (!looksLikeImage) {
      setUploadError("Please choose an image file.");
      return;
    }
    setUploadError(null);
    setUploading(true);

    const path = `${shop.id}/website-header-${Date.now()}.${file.name.split(".").pop() ?? "jpg"}`;
    const { error } = await supabase.storage
      .from("shop-logos")
      .upload(path, file, { contentType: file.type || "image/jpeg" });

    if (error) {
      setUploadError(error.message);
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("shop-logos").getPublicUrl(path);

    await supabase.from("shops").update({ website_header_url: publicUrl }).eq("id", shop.id);
    setHeaderUrl(publicUrl);
    setUploading(false);
  }

  function copyLink() {
    navigator.clipboard.writeText(siteUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  return (
    <div className="rounded-2xl bg-white/5 p-4 shadow-md shadow-black/20">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-brand-blue" />
        <h3 className="text-sm font-semibold text-white">Your Business Website</h3>
      </div>
      <p className="mt-1 text-xs text-slate-400">
        A free public page for {shop.shop_name} — share it anywhere. Uses a
        stock photo matched to your category until you upload your own header.
      </p>

      <a
        href={siteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex items-center gap-3 rounded-xl bg-white/5 p-2.5 transition-colors hover:bg-white/10"
      >
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{shop.shop_name}</p>
          <p className="truncate text-xs text-brand-blue">
            {siteUrl.replace(/^https?:\/\//, "")}
          </p>
        </div>
      </a>

      <input
        id={headerInputId}
        type="file"
        accept="image/*"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
        className="hidden"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label
          htmlFor={headerInputId}
          className={`inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3.5 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-brand-blue hover:text-brand-blue ${
            uploading ? "pointer-events-none opacity-60" : "cursor-pointer"
          }`}
        >
          {uploading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {uploading ? "Uploading..." : headerUrl ? "Replace Header Photo" : "Upload Header Photo"}
        </label>

        <button
          type="button"
          onClick={copyLink}
          className="rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-3.5 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
        >
          {linkCopied ? "Link copied!" : "Copy Link"}
        </button>

        <Link
          href="/dashboard/website"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3.5 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-brand-blue hover:text-brand-blue"
        >
          <Palette className="h-3.5 w-3.5" />
          Customize
        </Link>
      </div>

      {uploadError && <p className="mt-2 text-xs text-red-400">{uploadError}</p>}

      <div className="mt-4 border-t border-white/10 pt-3">
        <label className="flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-wide text-slate-400">
            Live Website Preview
          </span>
          <span className="flex items-center gap-2 text-slate-400">
            {showPreview ? "Hide" : "Show"}
            <input
              type="checkbox"
              checked={showPreview}
              onChange={(e) => setShowPreview(e.target.checked)}
              className="h-4 w-7 cursor-pointer accent-brand-blue"
            />
          </span>
        </label>

        {showPreview && (
          <div className="mt-2 overflow-hidden rounded-xl border border-white/10 bg-white">
            {/* The real /site/[slug] page, not a mockup — always accurate,
                can't drift out of sync with what a visitor actually sees.
                Fixed height + overflow-hidden shows just the top, like a
                thumbnail; the full page opens via "View Website" (the link
                card above) or "Copy Link". */}
            <iframe
              src={siteUrl}
              title="Website preview"
              className="h-[280px] w-full border-0"
            />
          </div>
        )}
      </div>
    </div>
  );
}
