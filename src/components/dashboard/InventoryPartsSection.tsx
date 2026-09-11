"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, X, Package, History, Pencil } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { ShopProduct, StockMovement } from "@/lib/supabase/types";

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

const inputClass =
  "w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-brand-blue focus:outline-none";
const labelClass = "block text-xs font-medium text-slate-400";

function ItemModal({
  shopId,
  item,
  onClose,
  onSaved,
}: {
  shopId: string;
  item: ShopProduct | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [sku, setSku] = useState(item?.sku ?? "");
  const [category, setCategory] = useState(item?.category ?? "");
  const [unit, setUnit] = useState(item?.unit ?? "pc");
  const [description, setDescription] = useState(item?.description ?? "");
  const [costPrice, setCostPrice] = useState(item ? String(item.cost_price) : "");
  const [price, setPrice] = useState(item ? String(item.price) : "");
  const [quantity, setQuantity] = useState(item ? String(item.quantity) : "");
  const [expiryDate, setExpiryDate] = useState(item?.expiry_date ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const payload = {
      name,
      sku: sku || null,
      category: category || null,
      unit: unit || "pc",
      description: description || null,
      cost_price: Number(costPrice) || 0,
      price: Number(price) || 0,
      quantity: Number(quantity) || 0,
      expiry_date: expiryDate || null,
    };

    if (item) {
      await supabase.from("shop_products").update(payload).eq("id", item.id);
    } else {
      await supabase.from("shop_products").insert({ shop_id: shopId, ...payload });
    }
    setSaving(false);
    onSaved();
  }

  return (
    <Modal title={item ? "Edit Inventory / Part" : "Add Inventory / Part"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="text"
          required
          autoFocus
          placeholder="Item name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            placeholder="SKU (optional)"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className={inputClass}
          />
          <input
            type="text"
            placeholder="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputClass}
          />
        </div>
        <textarea
          rows={2}
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputClass}
        />
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className={labelClass}>Cost</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              className={`mt-1 ${inputClass}`}
            />
          </div>
          <div>
            <label className={labelClass}>Sell Price</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={`mt-1 ${inputClass}`}
            />
          </div>
          <div>
            <label className={labelClass}>Stock</label>
            <input
              type="number"
              min="0"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={`mt-1 ${inputClass}`}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Unit</label>
            <input
              type="text"
              placeholder="pc, kg, bag..."
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className={`mt-1 ${inputClass}`}
            />
          </div>
          <div>
            <label className={labelClass}>Expiry (optional)</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className={`mt-1 ${inputClass}`}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-2 w-full rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Saving..." : item ? "Save Changes" : "Add Inventory / Part"}
        </button>
      </form>
    </Modal>
  );
}

function RestockModal({
  shopId,
  item,
  onClose,
  onSaved,
}: {
  shopId: string;
  item: ShopProduct;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [changeQty, setChangeQty] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const delta = Number(changeQty);
    if (!delta) return;
    setSaving(true);

    await supabase.from("shop_product_stock_movements").insert({
      shop_id: shopId,
      product_id: item.id,
      change_qty: delta,
      note: note || null,
    });
    await supabase
      .from("shop_products")
      .update({ quantity: Math.max(0, item.quantity + delta) })
      .eq("id", item.id);

    setSaving(false);
    onSaved();
  }

  return (
    <Modal title={`Adjust Stock — ${item.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-2">
        <p className="text-xs text-slate-400">
          Current stock: {item.quantity} {item.unit}
        </p>
        <div>
          <label className={labelClass}>
            Quantity to add (use a negative number to remove)
          </label>
          <input
            type="number"
            step="1"
            required
            autoFocus
            value={changeQty}
            onChange={(e) => setChangeQty(e.target.value)}
            className={`mt-1 ${inputClass}`}
          />
        </div>
        <input
          type="text"
          placeholder="Note (optional) — e.g. new delivery, spoilage"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={saving}
          className="mt-2 w-full rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Adjustment"}
        </button>
      </form>
    </Modal>
  );
}

function HistoryModal({
  item,
  onClose,
}: {
  item: ShopProduct;
  onClose: () => void;
}) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = setTimeout(async () => {
      const { data } = await supabase
        .from("shop_product_stock_movements")
        .select("*")
        .eq("product_id", item.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setMovements((data as StockMovement[]) ?? []);
      setLoading(false);
    }, 0);
    return () => clearTimeout(id);
  }, [item.id]);

  return (
    <Modal title={`Stock History — ${item.name}`} onClose={onClose}>
      {loading && <p className="text-sm text-slate-400">Loading...</p>}
      {!loading && movements.length === 0 && (
        <p className="text-sm text-slate-400">No stock adjustments recorded yet.</p>
      )}
      <div className="max-h-80 space-y-2 overflow-y-auto">
        {movements.map((m) => (
          <div key={m.id} className="rounded-xl bg-white/5 px-3 py-2">
            <div className="flex items-center justify-between">
              <span
                className={`text-sm font-semibold ${
                  m.change_qty >= 0 ? "text-brand-emerald" : "text-red-400"
                }`}
              >
                {m.change_qty >= 0 ? "+" : ""}
                {m.change_qty} {item.unit}
              </span>
              <span className="text-[10px] text-slate-500">
                {new Date(m.created_at).toLocaleString()}
              </span>
            </div>
            {m.note && <p className="mt-0.5 text-xs text-slate-400">{m.note}</p>}
          </div>
        ))}
      </div>
    </Modal>
  );
}

export default function InventoryPartsSection({ shopId }: { shopId: string }) {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<ShopProduct | null | "new">(null);
  const [restockItem, setRestockItem] = useState<ShopProduct | null>(null);
  const [historyItem, setHistoryItem] = useState<ShopProduct | null>(null);

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
            Physical items you sell, with cost and stock tracking.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditingItem("new")}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>

      <div className="mt-4">
        {loading && <p className="text-sm text-slate-400">Loading...</p>}
        {!loading && products.length === 0 && (
          <div className="rounded-2xl bg-white/5 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-blue/10">
              <Package className="h-5 w-5 text-brand-blue" />
            </div>
            <p className="mt-3 text-sm text-slate-400">No inventory or parts added yet.</p>
          </div>
        )}
        {!loading && products.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-2 font-medium">SKU</th>
                  <th className="px-3 py-2 font-medium">Item Name</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Unit</th>
                  <th className="px-3 py-2 font-medium">Cost</th>
                  <th className="px-3 py-2 font-medium">Stock</th>
                  <th className="px-3 py-2 font-medium">Total Cost</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Expiry</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {products.map((product) => {
                  const outOfStock = product.quantity === 0;
                  return (
                    <tr key={product.id} className="hover:bg-white/5">
                      <td className="px-3 py-2.5 text-xs text-slate-500">
                        {product.sku ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-white">{product.name}</td>
                      <td className="px-3 py-2.5 text-slate-300">{product.category ?? "—"}</td>
                      <td className="px-3 py-2.5 text-slate-300">{product.unit}</td>
                      <td className="px-3 py-2.5 text-slate-300">
                        {product.cost_price.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-white">
                        {product.quantity}
                      </td>
                      <td className="px-3 py-2.5 text-slate-300">
                        {(product.cost_price * product.quantity).toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            outOfStock
                              ? "bg-red-500/15 text-red-400"
                              : "bg-brand-emerald/15 text-brand-emerald"
                          }`}
                        >
                          {outOfStock ? "Out of Stock" : "In Stock"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-400">
                        {product.expiry_date
                          ? new Date(product.expiry_date).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setRestockItem(product)}
                            className="rounded-full bg-brand-blue/15 px-2.5 py-1 text-[11px] font-semibold text-brand-blue hover:bg-brand-blue/25"
                          >
                            +Add
                          </button>
                          <button
                            type="button"
                            onClick={() => setHistoryItem(product)}
                            aria-label="Stock history"
                            className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                          >
                            <History className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingItem(product)}
                            aria-label="Edit item"
                            className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(product.id)}
                            aria-label="Delete item"
                            className="rounded-full p-1.5 text-slate-400 hover:bg-red-500/15 hover:text-red-400"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingItem && (
        <ItemModal
          shopId={shopId}
          item={editingItem === "new" ? null : editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={() => {
            setEditingItem(null);
            load();
          }}
        />
      )}

      {restockItem && (
        <RestockModal
          shopId={shopId}
          item={restockItem}
          onClose={() => setRestockItem(null)}
          onSaved={() => {
            setRestockItem(null);
            load();
          }}
        />
      )}

      {historyItem && (
        <HistoryModal item={historyItem} onClose={() => setHistoryItem(null)} />
      )}
    </div>
  );
}
