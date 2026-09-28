"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Clock, Mail, MapPin, Navigation, Phone } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { JobTicket, Shop } from "@/lib/supabase/types";
import { distanceKm, formatDistance } from "@/lib/geo/distance";
import JobProgress from "./JobProgress";
import { formatDateOnly, timeAgo } from "@/lib/dashboard/format";
import SelectedProductsPicker from "./SelectedProductsPicker";

/**
 * The details behind a booking request row's "Manage Job" button: what the
 * customer asked for, how far away they are, how to reach them and the parts
 * they'll need. Accept / Reject sit on the row itself.
 */
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

  async function handleProductsChange(next: { product_id: string; name: string; price: number; quantity: number }[]) {
    await supabase.from("job_tickets").update({ selected_products: next }).eq("id", ticket.id);
    onChanged();
  }

  return (
    <div>
      <JobProgress status={ticket.status} />

      {ticket.description && (
        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
          {ticket.description}
        </p>
      )}

      {ticket.discount_percent && (
        <span className="mt-2 inline-block rounded-full bg-brand-orange/10 px-2.5 py-1 text-[11px] font-semibold text-brand-orange-dark">
          {ticket.discount_percent}% discount applied
        </span>
      )}

      {ticket.request_photo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ticket.request_photo_url}
          alt="Request photo"
          className="mt-2 h-16 w-16 rounded-lg object-cover"
        />
      )}

      <div className="mt-3 space-y-1.5 text-xs text-slate-600">
        <p className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="min-w-0 break-words">{ticket.service_address}</span>
        </p>
        {ticket.preferred_date && (
          <p className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            Preferred: {formatDateOnly(ticket.preferred_date)}
          </p>
        )}
        <p className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          Requested {timeAgo(ticket.created_at)}
        </p>
        {distance && (
          <p className="flex items-center gap-2 font-medium text-brand-blue">
            <Navigation className="h-3.5 w-3.5 shrink-0" />
            {distance}
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-3">
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
        <SelectedProductsPicker
          shopId={shop.id}
          currency={shop.currency}
          selectedProducts={ticket.selected_products}
          onChange={handleProductsChange}
        />
      </div>
    </div>
  );
}
