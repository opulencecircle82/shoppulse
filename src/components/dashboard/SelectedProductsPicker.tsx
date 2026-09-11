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

export default function SelectedProductsPicker({
  shopId,
  currency,
  selectedProducts,
  onChange,
  label = "Products Needed",
}: {
  shopId: string;
  currency: string;
  selectedProducts: SelectedProduct[];
  onChange: (next: SelectedProduct[]) => void;
  label?: string;
}) {
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
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        {products.length > 0 && (
          <button
            type="button"
            onClick={() => setShowPicker((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-brand-blue hover:text-blue-400"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        )}
      </div>

      {selectedProducts.length === 0 ? (
        <p className="mt-1 text-xs text-slate-500">None selected yet.</p>
      ) : (
        <div className="mt-1.5 space-y-1">
          {selectedProducts.map((item, index) => (
            <div
              key={`${item.product_id}-${index}`}
              className="flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-1.5 text-xs"
            >
              <span className="text-slate-200">
                {item.name}
                {item.quantity > 1 ? ` ×${item.quantity}` : ""}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">
                  {currency} {(item.price * item.quantity).toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={() => removeProduct(index)}
                  className="text-slate-500 hover:text-red-400"
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
        <div className="mt-1.5 max-h-48 space-y-1 overflow-y-auto rounded-lg bg-white/5 p-2">
          {products.map((product) => {
            const outOfStock = product.quantity <= 0;
            return (
              <button
                key={product.id}
                type="button"
                disabled={outOfStock}
                onClick={() => addProduct(product)}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="text-slate-200">
                  {product.name}
                  {outOfStock && <span className="ml-1.5 text-red-400">(out of stock)</span>}
                </span>
                <span className="font-medium text-white">
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
