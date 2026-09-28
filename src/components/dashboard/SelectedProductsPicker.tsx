"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { ShopProduct } from "@/lib/supabase/types";

export type SelectedProduct = {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
};

// Shared between the light owner dashboard and the dark technician app, so
// it takes its colors from a theme instead of hardcoding one surface.
const THEMES = {
  light: {
    label: "text-slate-500",
    add: "text-brand-blue hover:text-brand-blue-dark-dark",
    empty: "text-slate-500",
    row: "bg-slate-50",
    rowName: "text-slate-700",
    price: "text-slate-900",
    remove: "text-slate-400 hover:text-red-500",
    panel: "bg-slate-50",
    option: "hover:bg-slate-100",
    outOfStock: "text-red-600",
  },
  dark: {
    label: "text-slate-400",
    add: "text-brand-blue hover:text-blue-400",
    empty: "text-slate-500",
    row: "bg-white/5",
    rowName: "text-slate-200",
    price: "text-white",
    remove: "text-slate-500 hover:text-red-400",
    panel: "bg-white/5",
    option: "hover:bg-white/10",
    outOfStock: "text-red-400",
  },
} as const;

export default function SelectedProductsPicker({
  shopId,
  currency,
  selectedProducts,
  onChange,
  label = "Products Needed",
  theme = "light",
}: {
  shopId: string;
  currency: string;
  selectedProducts: SelectedProduct[];
  onChange: (next: SelectedProduct[]) => void;
  label?: string;
  theme?: keyof typeof THEMES;
}) {
  const t = THEMES[theme];
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    let active = true;
    const id = setTimeout(async () => {
      const { data } = await supabase
        .from("shop_products")
        .select("*")
        .eq("shop_id", shopId)
        .order("created_at");
      if (active) setProducts((data as ShopProduct[]) ?? []);
    }, 0);
    return () => {
      active = false;
      clearTimeout(id);
    };
  }, [shopId]);

  function addProduct(product: ShopProduct) {
    const existing = selectedProducts.find((p) => p.product_id === product.id);
    if (existing) {
      onChange(
        selectedProducts.map((p) =>
          p.product_id === product.id ? { ...p, quantity: p.quantity + 1 } : p
        )
      );
    } else {
      onChange([
        ...selectedProducts,
        { product_id: product.id, name: product.name, price: product.price, quantity: 1 },
      ]);
    }
    setShowPicker(false);
  }

  function removeProduct(index: number) {
    onChange(selectedProducts.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className={`text-xs font-semibold uppercase tracking-wide ${t.label}`}>{label}</p>
        {products.length > 0 && (
          <button
            type="button"
            onClick={() => setShowPicker((v) => !v)}
            className={`flex items-center gap-1 text-xs font-medium ${t.add}`}
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        )}
      </div>

      {selectedProducts.length === 0 ? (
        <p className={`mt-1 text-xs ${t.empty}`}>None selected yet.</p>
      ) : (
        <div className="mt-1.5 space-y-1">
          {selectedProducts.map((item, index) => (
            <div
              key={`${item.product_id}-${index}`}
              className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs ${t.row}`}
            >
              <span className={t.rowName}>
                {item.name}
                {item.quantity > 1 ? ` ×${item.quantity}` : ""}
              </span>
              <div className="flex items-center gap-2">
                <span className={`font-medium ${t.price}`}>
                  {currency} {(item.price * item.quantity).toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={() => removeProduct(index)}
                  className={t.remove}
                  aria-label="Remove product"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showPicker && (
        <div className={`mt-1.5 max-h-48 space-y-1 overflow-y-auto rounded-lg p-2 ${t.panel}`}>
          {products.map((product) => {
            const outOfStock = product.quantity <= 0;
            return (
              <button
                key={product.id}
                type="button"
                disabled={outOfStock}
                onClick={() => addProduct(product)}
                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs disabled:cursor-not-allowed disabled:opacity-40 ${t.option}`}
              >
                <span className={t.rowName}>
                  {product.name}
                  {outOfStock && <span className={`ml-1.5 ${t.outOfStock}`}>(out of stock)</span>}
                </span>
                <span className={`font-medium ${t.price}`}>
                  {currency} {product.price.toFixed(2)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
