"use client";

import { useEffect, useState } from "react";
import { Mail, Phone, Plus, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { JobTicket, Shop, ShopProduct } from "@/lib/supabase/types";
import { distanceKm, formatDistance } from "@/lib/geo/distance";

export default function BookingRequestCard({
  ticket,
  shop,
  onChanged,
}: {
  ticket: JobTicket;
  shop: Shop;
  onChanged: () => void;
}) {
  const [distance, setDistance] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [showProductPicker, setShowProductPicker] = useState(false);

  useEffect(() => {
    if (shop.latitude === null || shop.longitude === null) return;
    let active = true;
    const id = setTimeout(async () => {
      const { data } = await supabase
        .rpc("get_customer_location_for_ticket", { p_ticket_id: ticket.id })
        .maybeSingle();
      if (!active || !data) return;
      const row = data as { latitude: number | null; longitude: number | null };
      if (row.latitude === null || row.longitude === null) return;
      const km = distanceKm(
        { lat: shop.latitude!, lng: shop.longitude! },
        { lat: row.latitude, lng: row.longitude }
      );
      setDistance(formatDistance(km));
    }, 0);
    return () => {
      active = false;
      clearTimeout(id);
    };
  }, [ticket.id, shop.latitude, shop.longitude]);

  useEffect(() => {
    let active = true;
    const id = setTimeout(async () => {
      const { data } = await supabase
        .from("shop_products")
        .select("*")
        .eq("shop_id", shop.id)
        .order("created_at");
      if (active) setProducts((data as ShopProduct[]) ?? []);
    }, 0);
    return () => {
      active = false;
      clearTimeout(id);
    };
  }, [shop.id]);

  async function handleAccept() {
    setBusy(true);
    await supabase.rpc("accept_booking_request", { p_ticket_id: ticket.id });
    setBusy(false);
    onChanged();
  }

  async function handleReject() {
    setBusy(true);
    await supabase.rpc("reject_booking_request", { p_ticket_id: ticket.id });
    setBusy(false);
    onChanged();
  }

  async function addProduct(product: ShopProduct) {
    const next = [
      ...ticket.selected_products,
      { product_id: product.id, name: product.name, price: product.price, quantity: 1 },
    ];
    await supabase.from("job_tickets").update({ selected_products: next }).eq("id", ticket.id);
    setShowProductPicker(false);
    onChanged();
  }

  async function removeProduct(index: number) {
    const next = ticket.selected_products.filter((_, i) => i !== index);
    await supabase.from("job_tickets").update({ selected_products: next }).eq("id", ticket.id);
    onChanged();
  }

  return (
    <div className="rounded-2xl border border-brand-blue/20 bg-brand-slate-light/40 p-4 shadow-md shadow-black/20">
      <p className="text-sm font-semibold text-slate-900">{ticket.client_name}</p>
      <p className="mt-0.5 text-xs text-slate-500">{ticket.service_type}</p>
      {ticket.description && (
        <p className="mt-1 text-xs text-slate-500">{ticket.description}</p>
      )}
      {ticket.request_photo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ticket.request_photo_url}
          alt="Request photo"
          className="mt-1.5 h-16 w-16 rounded-lg object-cover"
        />
      )}
      <p className="mt-1 text-xs text-slate-400">{ticket.service_address}</p>
      {ticket.preferred_date && (
        <p className="mt-1 text-xs text-slate-500">
          Preferred date: {new Date(ticket.preferred_date).toLocaleDateString()}
        </p>
      )}
      {distance && (
        <p className="mt-1 text-xs font-medium text-brand-blue">{distance}</p>
      )}

      <div className="mt-2 flex flex-wrap gap-3">
        {ticket.client_email && (
          <a
            href={`mailto:${ticket.client_email}`}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-brand-blue"
          >
            <Mail className="h-3 w-3" /> Email
          </a>
        )}
        {ticket.client_phone && (
          <a
            href={`tel:${ticket.client_phone}`}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-brand-blue"
          >
            <Phone className="h-3 w-3" /> Call
          </a>
        )}
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Products Needed
          </p>
          {products.length > 0 && (
            <button
              type="button"
              onClick={() => setShowProductPicker((v) => !v)}
              className="flex items-center gap-1 text-xs font-medium text-brand-blue hover:text-blue-400"
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          )}
        </div>

        {ticket.selected_products.length === 0 ? (
          <p className="mt-1 text-xs text-slate-400">None selected yet.</p>
        ) : (
          <div className="mt-1.5 space-y-1">
            {ticket.selected_products.map((item, index) => (
              <div
                key={`${item.product_id}-${index}`}
                className="flex items-center justify-between rounded-lg bg-brand-slate/60 px-2.5 py-1.5 text-xs"
              >
                <span className="text-slate-700">{item.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900">
                    {shop.currency} {item.price.toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeProduct(index)}
                    className="text-slate-400 hover:text-red-400"
                    aria-label="Remove product"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showProductPicker && (
          <div className="mt-1.5 space-y-1 rounded-lg bg-brand-slate/60 p-2">
            {products.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => addProduct(product)}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs hover:bg-brand-slate"
              >
                <span className="text-slate-700">{product.name}</span>
                <span className="font-medium text-slate-900">
                  {shop.currency} {product.price.toFixed(2)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleAccept}
          disabled={busy}
          className="flex-1 rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          Accept
        </button>
        <button
          type="button"
          onClick={handleReject}
          disabled={busy}
          className="flex-1 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-red-400 hover:text-red-400 disabled:opacity-60"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
