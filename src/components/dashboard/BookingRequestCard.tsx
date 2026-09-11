"use client";

import { useEffect, useState } from "react";
import { Mail, Phone } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { JobTicket, Shop } from "@/lib/supabase/types";
import { distanceKm, formatDistance } from "@/lib/geo/distance";
import SelectedProductsPicker from "./SelectedProductsPicker";

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

  async function handleProductsChange(next: { product_id: string; name: string; price: number; quantity: number }[]) {
    await supabase.from("job_tickets").update({ selected_products: next }).eq("id", ticket.id);
    onChanged();
  }

  return (
    <div className="rounded-2xl border border-brand-blue/20 bg-white/5 p-4 shadow-md shadow-black/20">
      <p className="text-sm font-semibold text-white">{ticket.client_name}</p>
      <p className="mt-0.5 text-xs text-slate-400">{ticket.service_type}</p>
      {ticket.description && (
        <p className="mt-1 text-xs text-slate-400">{ticket.description}</p>
      )}
      {ticket.request_photo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ticket.request_photo_url}
          alt="Request photo"
          className="mt-1.5 h-16 w-16 rounded-lg object-cover"
        />
      )}
      <p className="mt-1 text-xs text-slate-500">{ticket.service_address}</p>
      {ticket.preferred_date && (
        <p className="mt-1 text-xs text-slate-400">
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
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-brand-blue"
          >
            <Mail className="h-3 w-3" /> Email
          </a>
        )}
        {ticket.client_phone && (
          <a
            href={`tel:${ticket.client_phone}`}
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-brand-blue"
          >
            <Phone className="h-3 w-3" /> Call
          </a>
        )}
      </div>

      <div className="mt-3">
        <SelectedProductsPicker
          shopId={shop.id}
          currency={shop.currency}
          selectedProducts={ticket.selected_products}
          onChange={handleProductsChange}
        />
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
          className="flex-1 rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-red-400 hover:text-red-400 disabled:opacity-60"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
