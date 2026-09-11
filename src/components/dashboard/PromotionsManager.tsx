"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Plus, X, Megaphone, Globe, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/lib/supabase/client";
import type { Shop, ShopPromotion } from "@/lib/supabase/types";
import { stockPhotoForCategory } from "@/lib/location/categoryStockPhotos";
import PhoneFrame from "./PhoneFrame";

type DailyStat = { day: string; views: number; clicks: number };
type Totals = { total_views: number; total_clicks: number };

const CANVAS_W = 600;
const CANVAS_H = 400;

function generateDiscountCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "SAVE-";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function renderPromotionImage(
  canvas: HTMLCanvasElement,
  params: { shopName: string; logoUrl: string | null; title: string; discountCode: string | null }
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;

  const gradient = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
  gradient.addColorStop(0, "#2563EB");
  gradient.addColorStop(1, "#0F172A");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  if (params.logoUrl) {
    try {
      const logo = await loadImage(params.logoUrl);
      const size = 72;
      ctx.save();
      ctx.beginPath();
      ctx.arc(56 + size / 2, 48 + size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(logo, 56, 48, size, size);
      ctx.restore();
    } catch {
      // Logo failed to load (e.g. CORS) — continue without it.
    }
  }

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "600 18px system-ui, sans-serif";
  ctx.fillText(params.shopName, params.logoUrl ? 148 : 56, 90);

  ctx.font = "700 40px system-ui, sans-serif";
  wrapText(ctx, params.title, 56, 190, CANVAS_W - 112, 46);

  if (params.discountCode) {
    ctx.fillStyle = "#F97316";
    const badgeY = CANVAS_H - 90;
    ctx.fillRect(56, badgeY, 260, 48);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "700 20px system-ui, sans-serif";
    ctx.fillText(`CODE: ${params.discountCode}`, 72, badgeY + 32);
  }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(" ");
  let line = "";
  let lineY = y;

  for (const word of words) {
    const testLine = line + word + " ";
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, lineY);
      line = word + " ";
      lineY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, lineY);
}

function PromotionCard({
  promotion,
  shop,
  onChanged,
}: {
  promotion: ShopPromotion;
  shop: Shop;
  onChanged: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generating, setGenerating] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [applying, setApplying] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  async function handleToggleStats() {
    const next = !showStats;
    setShowStats(next);
    if (next && !totals) {
      setLoadingStats(true);
      const [{ data: totalsData }, { data: dailyData }] = await Promise.all([
        supabase.rpc("get_promotion_totals", { p_promotion_id: promotion.id }).maybeSingle(),
        supabase.rpc("get_promotion_daily_stats", { p_promotion_id: promotion.id, p_days: 14 }),
      ]);
      setTotals((totalsData as Totals) ?? { total_views: 0, total_clicks: 0 });
      setDailyStats((dailyData as DailyStat[]) ?? []);
      setLoadingStats(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setPreviewReady(false);
    const canvas = canvasRef.current;
    if (canvas) {
      await renderPromotionImage(canvas, {
        shopName: shop.shop_name,
        logoUrl: shop.logo_url,
        title: promotion.title,
        discountCode: promotion.discount_code,
      });
      setPreviewReady(true);
    }
    setGenerating(false);
  }

  async function handleApply() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setApplying(true);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setApplying(false);
        return;
      }
      const path = `${shop.id}/promotions/${promotion.id}-${Date.now()}.png`;
      const { error } = await supabase.storage
        .from("shop-logos")
        .upload(path, blob, { contentType: "image/png" });

      if (!error) {
        const {
          data: { publicUrl },
        } = supabase.storage.from("shop-logos").getPublicUrl(path);
        await supabase
          .from("shop_promotions")
          .update({ image_url: publicUrl, is_active: true })
          .eq("id", promotion.id);
        onChanged();
      }
      setApplying(false);
      setPreviewReady(false);
    }, "image/png");
  }

  async function toggleActive() {
    await supabase
      .from("shop_promotions")
      .update({ is_active: !promotion.is_active })
      .eq("id", promotion.id);
    onChanged();
  }

  async function handleDelete() {
    if (!window.confirm(`Delete promotion "${promotion.title}"?`)) return;
    await supabase.from("shop_promotions").delete().eq("id", promotion.id);
    onChanged();
  }

  return (
    <div className="rounded-2xl bg-white/5 p-4 shadow-md shadow-black/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{promotion.title}</p>
          {promotion.discount_code && (
            <p className="text-xs text-brand-orange">Code: {promotion.discount_code}</p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            promotion.is_active
              ? "bg-brand-emerald/15 text-brand-emerald"
              : "bg-white/10 text-slate-400"
          }`}
        >
          {promotion.is_active ? "Active" : "Inactive"}
        </span>
      </div>
      {promotion.description && (
        <p className="mt-2 text-xs text-slate-400">{promotion.description}</p>
      )}

      {promotion.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={promotion.image_url}
          alt=""
          className="mt-3 w-full rounded-xl object-cover"
        />
      )}

      <canvas ref={canvasRef} className={`mt-3 w-full rounded-xl ${previewReady ? "block" : "hidden"}`} />

      <div className="mt-3 flex flex-wrap gap-2">
        {previewReady ? (
          <button
            type="button"
            onClick={handleApply}
            disabled={applying}
            className="rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-4 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {applying ? "Applying..." : "Apply"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="rounded-full border border-brand-blue/40 px-4 py-1.5 text-xs font-semibold text-brand-blue transition-colors hover:bg-brand-sky/10 disabled:opacity-60"
          >
            {generating ? "Generating..." : "Generate Image for Ad"}
          </button>
        )}
        <button
          type="button"
          onClick={toggleActive}
          className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:border-brand-blue hover:text-brand-blue"
        >
          {promotion.is_active ? "Deactivate" : "Activate"}
        </button>
        <button
          type="button"
          onClick={handleToggleStats}
          className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:border-brand-blue hover:text-brand-blue"
        >
          {showStats ? "Hide Stats" : "View Stats"}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="rounded-full border border-red-500/40 px-4 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10"
        >
          Delete
        </button>
      </div>

      {showStats && (
        <div className="mt-3 rounded-xl bg-white/5 p-3">
          {loadingStats ? (
            <p className="text-xs text-slate-400">Loading stats...</p>
          ) : (
            <>
              <p className="text-xs text-slate-400">
                <span className="font-semibold text-white">{totals?.total_views ?? 0}</span>{" "}
                views ·{" "}
                <span className="font-semibold text-white">{totals?.total_clicks ?? 0}</span>{" "}
                clicks
              </p>
              <div className="mt-2 h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyStats} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <XAxis
                      dataKey="day"
                      tickFormatter={(d: string) => d.slice(5)}
                      tick={{ fontSize: 10 }}
                      interval={2}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={24} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="views" stroke="#2563EB" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="clicks" stroke="#F97316" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-1 text-[10px] text-slate-500">
                Last 14 days — <span className="text-brand-blue">blue = views</span>,{" "}
                <span className="text-brand-orange">orange = clicks</span>
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function BusinessWebsiteCard({ shop }: { shop: Shop }) {
  const headerInputId = useId();
  const [headerUrl, setHeaderUrl] = useState(shop.website_header_url);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

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
      </div>

      {uploadError && <p className="mt-2 text-xs text-red-400">{uploadError}</p>}
    </div>
  );
}

// A static, always-fake mockup — same convention as the other phone
// previews in CustomizeMobileAppTab (fake shop name, fake sample content,
// regardless of the owner's real data). Showing this shop's actual live
// promotion here would just be a smaller, redundant copy of the real
// carousel a customer sees, or the owner's own real business name/details
// mirrored back at them — a generic sample illustrates the placement
// without either.
function FakePromoCard({
  title,
  business,
  from,
  dim,
}: {
  title: string;
  business: string;
  from: string;
  dim?: boolean;
}) {
  return (
    <div
      className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg shadow-sm shadow-black/20 ${
        dim ? "opacity-60" : ""
      }`}
    >
      <div
        className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${from} p-1 text-center`}
      >
        <p className="line-clamp-2 text-[8px] font-bold text-white">{title}</p>
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-black/40 px-1 py-0.5">
        <p className="truncate text-[6px] font-semibold text-white">{business}</p>
      </div>
    </div>
  );
}

// A static, always-fake mockup of the customer app's home screen — same
// convention as the other phone previews in CustomizeMobileAppTab (fake
// shop name, fake sample content, regardless of the owner's real data).
// Filled out with the surrounding home-screen context (search bar, a
// second promo, a job card) rather than one card floating alone, so it
// reads as "here's where this sits on a real screen" instead of a mostly
// empty box.
function PromotionsPhonePreview() {
  return (
    <PhoneFrame label="Customer App — Promotions Near You">
      <div className="h-[380px] space-y-3 bg-brand-navy p-3">
        <div>
          <p className="text-[8px] text-slate-500">Hi, Customer</p>
          <p className="text-[11px] font-bold text-white">
            Your jobs, all in one place
          </p>
        </div>
        <div className="h-6 rounded-lg bg-white/5" />
        <div>
          <p className="text-[8px] font-semibold uppercase tracking-wide text-slate-500">
            Promotions Near You
          </p>
          <div className="mt-1.5 flex gap-2">
            <FakePromoCard
              title="20% Off First Visit"
              business="Apex Property Services"
              from="from-brand-blue to-slate-900"
            />
            <FakePromoCard
              title="Free Estimate This Week"
              business="Bright Plumbing Co."
              from="from-brand-orange to-slate-900"
              dim
            />
          </div>
        </div>
        <div>
          <p className="text-[8px] font-semibold uppercase tracking-wide text-slate-500">
            Your Jobs
          </p>
          <div className="mt-1.5 rounded-lg bg-white/5 p-2">
            <span className="inline-block rounded-full bg-brand-emerald/15 px-1.5 py-0.5 text-[7px] font-semibold text-brand-emerald">
              APPROVED
            </span>
            <p className="mt-1 text-[9px] font-semibold text-white">AC Repair</p>
            <p className="text-[7px] text-slate-500">Balibago, Angeles City</p>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

// A fake, clearly-labeled "sample account" — same spirit as the phone
// mockup beside it: illustrate what a fully set-up account with active
// promotions looks like, rather than leaving this space as plain
// explainer prose. The "why bother" reasons still show up, just as short
// captions instead of the whole point of the panel.
function PromotionsExplainer() {
  return (
    <div className="rounded-2xl bg-white/5 p-4 shadow-md shadow-black/20">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white">Sample Business</h4>
        <span className="rounded-full bg-brand-emerald/15 px-2 py-0.5 text-[10px] font-semibold text-brand-emerald">
          Active
        </span>
      </div>
      <p className="mt-1 text-[11px] text-slate-500">
        Fake account — shows what a fully set-up profile looks like.
      </p>

      <dl className="mt-3 space-y-1.5 text-xs">
        <div className="flex justify-between gap-3">
          <dt className="shrink-0 text-slate-500">Owner</dt>
          <dd className="truncate text-right text-white">Miguel Reyes</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="shrink-0 text-slate-500">Business</dt>
          <dd className="truncate text-right text-white">
            Reyes Landscaping LLC
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="shrink-0 text-slate-500">Service Area</dt>
          <dd className="truncate text-right text-white">Quezon City Metro</dd>
        </div>
      </dl>

      <div className="mt-3 border-t border-white/10 pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Active Promotions
        </p>
        <ul className="mt-1.5 space-y-1 text-xs text-slate-300">
          <li>
            15% Off Lawn Care{" "}
            <span className="text-slate-500">— ends Dec 30</span>
          </li>
          <li>
            Free Consultation{" "}
            <span className="text-slate-500">— expires Jan 15</span>
          </li>
        </ul>
      </div>

      <div className="mt-3 border-t border-white/10 pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Why bother?
        </p>
        <ul className="mt-1.5 space-y-1 text-[11px] text-slate-400">
          <li>• Libre, awtomatikong nakikita ng malapit na customer</li>
          <li>• Nakakaakit ng bagong customer na hindi pa ka-alam</li>
          <li>• May discount code kaya nakikita mo kung ilan gumamit</li>
        </ul>
      </div>
    </div>
  );
}

function AddPromotionModal({
  shopId,
  onClose,
  onAdded,
}: {
  shopId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [includeDiscountCode, setIncludeDiscountCode] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [saving, setSaving] = useState(false);

  function toggleDiscountCode(checked: boolean) {
    setIncludeDiscountCode(checked);
    setDiscountCode(checked ? generateDiscountCode() : "");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    await supabase.from("shop_promotions").insert({
      shop_id: shopId,
      title,
      description: description || null,
      discount_code: includeDiscountCode ? discountCode : null,
    });
    setSaving(false);
    onAdded();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-brand-navy p-5 shadow-2xl shadow-black/40">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-white">Add a Promotion</p>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Shown to customers browsing services near your city. Free for now.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-2">
          <div>
            <label className="block text-xs font-medium text-slate-400">Title</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="20% Off First Visit"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-brand-blue focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-brand-blue focus:outline-none"
            />
          </div>

          <div>
            <label className="flex items-center gap-2.5 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={includeDiscountCode}
                onChange={(e) => toggleDiscountCode(e.target.checked)}
                className="accent-brand-blue"
              />
              Include a discount code
            </label>
            {includeDiscountCode && (
              <div className="mt-2 flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                <span className="font-mono text-sm font-semibold text-brand-blue">
                  {discountCode}
                </span>
                <button
                  type="button"
                  onClick={() => setDiscountCode(generateDiscountCode())}
                  className="text-xs font-medium text-slate-400 hover:text-brand-blue"
                >
                  Regenerate
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-2 w-full rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Adding..." : "Add Promotion"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function PromotionsManager({ shop }: { shop: Shop }) {
  const [promotions, setPromotions] = useState<ShopPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("shop_promotions")
      .select("*")
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: false });
    setPromotions((data as ShopPromotion[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    const id = setTimeout(() => {
      load();
    }, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop.id]);

  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-2">
        <BusinessWebsiteCard shop={shop} />

        <div>
          <div className="flex flex-wrap items-start justify-center gap-4 lg:justify-start">
            <PromotionsPhonePreview />
            <div className="w-full max-w-sm flex-1">
              <PromotionsExplainer />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">
              Your Promotions ({promotions.length})
            </h3>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" /> Add Promotion
            </button>
          </div>

          {loading && <p className="mt-3 text-sm text-slate-400">Loading...</p>}
          {!loading && promotions.length === 0 && (
            <div className="mt-3 rounded-2xl bg-white/5 p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-blue/10">
                <Megaphone className="h-5 w-5 text-brand-blue" />
              </div>
              <p className="mt-3 text-sm text-slate-400">No promotions created yet.</p>
            </div>
          )}
          <div className="mt-3 space-y-3">
            {promotions.map((promotion) => (
              <PromotionCard
                key={promotion.id}
                promotion={promotion}
                shop={shop}
                onChanged={load}
              />
            ))}
          </div>
        </div>
      </div>

      {showModal && (
        <AddPromotionModal
          shopId={shop.id}
          onClose={() => setShowModal(false)}
          onAdded={() => {
            setShowModal(false);
            load();
          }}
        />
      )}
    </div>
  );
}
