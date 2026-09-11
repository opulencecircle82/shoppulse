"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ImageUp, Plus, X, Wrench, Package } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { ShopService, ShopProduct } from "@/lib/supabase/types";

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-brand-navy p-5 shadow-2xl shadow-black/40">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-white">{title}</p>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function AddServiceModal({
  shopId,
  onClose,
  onAdded,
}: {
  shopId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [extraCost, setExtraCost] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    await supabase.from("shop_services").insert({
      shop_id: shopId,
      name,
      description: description || null,
      price: Number(price) || 0,
      extra_cost: Number(extraCost) || 0,
    });
    setSaving(false);
    onAdded();
  }

  return (
    <Modal title="Add Service" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="text"
          required
          autoFocus
          placeholder="Service name (e.g. Outlet installation)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-brand-blue focus:outline-none"
        />
        <textarea
          rows={2}
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-brand-blue focus:outline-none"
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-slate-400">Price</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1 w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-brand-blue focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400">Extra Cost</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={extraCost}
              onChange={(e) => setExtraCost(e.target.value)}
              className="mt-1 w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-brand-blue focus:outline-none"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="mt-2 w-full rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Adding..." : "Add Service"}
        </button>
      </form>
    </Modal>
  );
}

function ServicesSection({ shopId }: { shopId: string }) {
  const [services, setServices] = useState<ShopService[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("shop_services")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at");
    setServices((data as ShopService[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    const id = setTimeout(() => {
      load();
    }, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  async function handleDelete(id: string) {
    await supabase.from("shop_services").delete().eq("id", id);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Services</h3>
          <p className="mt-1 text-xs text-slate-500">
            Listed on your shop details page so customers know what you offer
            and what it costs.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {loading && <p className="text-sm text-slate-400">Loading...</p>}
        {!loading && services.length === 0 && (
          <div className="rounded-2xl bg-white/5 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-blue/10">
              <Wrench className="h-5 w-5 text-brand-blue" />
            </div>
            <p className="mt-3 text-sm text-slate-400">No services added yet.</p>
          </div>
        )}
        {services.map((service) => (
          <div
            key={service.id}
            className="flex items-start justify-between gap-3 rounded-2xl bg-white/5 p-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">{service.name}</p>
              {service.description && (
                <p className="mt-0.5 text-xs text-slate-400">{service.description}</p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                Price: {service.price.toFixed(2)}
                {service.extra_cost > 0 && ` + ${service.extra_cost.toFixed(2)} extra`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(service.id)}
              className="shrink-0 text-slate-500 hover:text-red-400"
              aria-label="Delete service"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {showModal && (
        <AddServiceModal
          shopId={shopId}
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

function AddProductModal({
  shopId,
  onClose,
  onAdded,
}: {
  shopId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > MAX_PHOTO_BYTES) return;

    setUploading(true);
    const path = `${shopId}/products/${Date.now()}.${file.name.split(".").pop() ?? "jpg"}`;
    const { error } = await supabase.storage
      .from("shop-logos")
      .upload(path, file, { contentType: file.type });

    if (!error) {
      const {
        data: { publicUrl },
      } = supabase.storage.from("shop-logos").getPublicUrl(path);
      setPhotoUrl(publicUrl);
    }
    setUploading(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    await supabase.from("shop_products").insert({
      shop_id: shopId,
      name,
      description: description || null,
      price: Number(price) || 0,
      photo_url: photoUrl || null,
    });
    setSaving(false);
    onAdded();
  }

  return (
    <Modal title="Add Product" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="text"
          required
          autoFocus
          placeholder="Product name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-brand-blue focus:outline-none"
        />
        <textarea
          rows={2}
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-brand-blue focus:outline-none"
        />
        <div>
          <label className="block text-xs font-medium text-slate-400">Price</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-1 w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-brand-blue focus:outline-none"
          />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleFile(e.target.files?.[0])}
          className="hidden"
        />
        {photoUrl ? (
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
            <button
              type="button"
              onClick={() => setPhotoUrl("")}
              className="text-xs text-slate-500 hover:text-red-400"
            >
              Remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/20 py-3 text-xs text-slate-500 hover:border-brand-blue hover:text-brand-blue disabled:opacity-60"
          >
            <ImageUp className="h-4 w-4" />
            {uploading ? "Uploading..." : "Add a photo"}
          </button>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-2 w-full rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Adding..." : "Add Product"}
        </button>
      </form>
    </Modal>
  );
}

function ProductsSection({ shopId }: { shopId: string }) {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("shop_products")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at");
    setProducts((data as ShopProduct[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    const id = setTimeout(() => {
      load();
    }, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  async function handleDelete(id: string) {
    await supabase.from("shop_products").delete().eq("id", id);
    load();
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Products</h3>
          <p className="mt-1 text-xs text-slate-500">
            Physical items you sell, with a photo customers can see.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {loading && <p className="text-sm text-slate-400">Loading...</p>}
        {!loading && products.length === 0 && (
          <div className="col-span-full rounded-2xl bg-white/5 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-blue/10">
              <Package className="h-5 w-5 text-brand-blue" />
            </div>
            <p className="mt-3 text-sm text-slate-400">No products added yet.</p>
          </div>
        )}
        {products.map((product) => (
          <div key={product.id} className="relative rounded-2xl bg-white/5 p-3">
            <button
              type="button"
              onClick={() => handleDelete(product.id)}
              className="absolute right-2 top-2 rounded-full bg-black/30 p-1 text-white hover:bg-red-500/100"
              aria-label="Delete product"
            >
              <X className="h-3 w-3" />
            </button>
            {product.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.photo_url}
                alt=""
                className="h-20 w-full rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-20 w-full items-center justify-center rounded-lg bg-white/5 text-xs text-slate-500">
                No photo
              </div>
            )}
            <p className="mt-2 truncate text-xs font-semibold text-white">{product.name}</p>
            <p className="text-xs text-slate-500">{product.price.toFixed(2)}</p>
          </div>
        ))}
      </div>

      {showModal && (
        <AddProductModal
          shopId={shopId}
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

export default function ServicesTab({ shopId }: { shopId: string }) {
  return (
    <div>
      <ServicesSection shopId={shopId} />
      <ProductsSection shopId={shopId} />
    </div>
  );
}
