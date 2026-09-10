"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Shop, ShopPromotion } from "@/lib/supabase/types";

const CANVAS_W = 600;
const CANVAS_H = 400;

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
    <div className="rounded-2xl bg-brand-slate-light/40 p-4 shadow-md shadow-black/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{promotion.title}</p>
          {promotion.discount_code && (
            <p className="text-xs text-brand-orange">Code: {promotion.discount_code}</p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            promotion.is_active
              ? "bg-brand-emerald/15 text-brand-emerald"
              : "bg-slate-200 text-slate-500"
          }`}
        >
          {promotion.is_active ? "Active" : "Inactive"}
        </span>
      </div>
      {promotion.description && (
        <p className="mt-2 text-xs text-slate-500">{promotion.description}</p>
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
            className="rounded-full bg-brand-blue px-4 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
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
          className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-900 transition-colors hover:border-brand-blue hover:text-brand-blue"
        >
          {promotion.is_active ? "Deactivate" : "Activate"}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="rounded-full border border-red-500/40 px-4 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function PromotionsManager({ shop }: { shop: Shop }) {
  const [promotions, setPromotions] = useState<ShopPromotion[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [saving, setSaving] = useState(false);

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    await supabase.from("shop_promotions").insert({
      shop_id: shop.id,
      title,
      description: description || null,
      discount_code: discountCode || null,
    });
    setSaving(false);
    setTitle("");
    setDescription("");
    setDiscountCode("");
    load();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-3xl bg-brand-slate-light/50 p-6 shadow-xl shadow-black/30"
      >
        <h3 className="text-sm font-semibold text-slate-900">Add a Promotion</h3>
        <p className="text-xs text-slate-400">
          Shown to customers browsing services near your city. Free for now.
        </p>

        <div>
          <label className="block text-xs font-medium text-slate-500">Title</label>
          <input
            type="text"
            required
            placeholder="20% Off First Visit"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-xl bg-brand-slate/60 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500">Description</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-xl bg-brand-slate/60 px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-brand-blue focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500">
            Discount Code (optional)
          </label>
          <input
            type="text"
            value={discountCode}
            onChange={(e) => setDiscountCode(e.target.value)}
            className="mt-1 w-full rounded-xl bg-brand-slate/60 px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-brand-blue focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-brand-blue px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Adding..." : "Add Promotion"}
        </button>
      </form>

      <div>
        <h3 className="text-sm font-semibold text-slate-900">
          Your Promotions ({promotions.length})
        </h3>
        {loading && <p className="mt-3 text-sm text-slate-500">Loading...</p>}
        {!loading && promotions.length === 0 && (
          <p className="mt-3 text-sm text-slate-500">No promotions created yet.</p>
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
  );
}
