"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, X, Wrench, Package } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { ShopService, ShopProduct } from "@/lib/supabase/types";

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
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    await supabase.from("shop_products").insert({
      shop_id: shopId,
      name,
      category: category || null,
      description: description || null,
      cost_price: Number(costPrice) || 0,
      price: Number(price) || 0,
      quantity: Number(quantity) || 0,
    });
    setSaving(false);
    onAdded();
  }

  return (
    <Modal title="Add Inventory / Part" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="text"
          required
          autoFocus
          placeholder="Item name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-brand-blue focus:outline-none"
        />
        <input
          type="text"
          placeholder="Category (e.g. Beverages, Parts)"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-brand-blue focus:outline-none"
        />
        <textarea
          rows={2}
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-brand-blue focus:outline-none"
        />
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-medium text-slate-400">Cost</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              className="mt-1 w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-brand-blue focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400">Sell Price</label>
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
            <label className="block text-xs font-medium text-slate-400">Quantity</label>
            <input
              type="number"
              min="0"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="mt-1 w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-brand-blue focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-2 w-full rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Adding..." : "Add Inventory / Part"}
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
          <h3 className="text-sm font-semibold text-white">Inventory &amp; Parts</h3>
          <p className="mt-1 text-xs text-slate-500">
            Physical items you sell, grouped by category.
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
        {!loading && products.length === 0 && (
          <div className="rounded-2xl bg-white/5 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-blue/10">
              <Package className="h-5 w-5 text-brand-blue" />
            </div>
            <p className="mt-3 text-sm text-slate-400">No inventory or parts added yet.</p>
          </div>
        )}
        {products.map((product) => (
          <div
            key={product.id}
            className="flex items-start justify-between gap-3 rounded-2xl bg-white/5 p-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white">{product.name}</p>
                {product.category && (
                  <span className="shrink-0 rounded-full bg-brand-blue/15 px-2 py-0.5 text-[10px] font-semibold text-brand-blue">
                    {product.category}
                  </span>
                )}
              </div>
              {product.description && (
                <p className="mt-0.5 text-xs text-slate-400">{product.description}</p>
              )}
              <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-500">
                <span>Cost: {product.cost_price.toFixed(2)}</span>
                <span>Sell: {product.price.toFixed(2)}</span>
                <span className={product.quantity === 0 ? "text-red-400" : ""}>
                  Qty: {product.quantity}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(product.id)}
              className="shrink-0 text-slate-500 hover:text-red-400"
              aria-label="Delete item"
            >
              <X className="h-4 w-4" />
            </button>
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
