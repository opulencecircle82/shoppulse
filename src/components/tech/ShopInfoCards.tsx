import { guardExternalLink } from "@/lib/tech/externalLinks";
import { ClipboardCheck, Megaphone, Phone } from "lucide-react";
import type { Shop } from "@/lib/supabase/types";

export type ShopInfo = Pick<
  Shop,
  | "shop_name"
  | "mobile_app_welcome"
  | "mobile_app_announcement_title"
  | "mobile_app_announcement"
  | "mobile_app_office_phone"
  | "mobile_app_job_reminder"
>;

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * What the owner wrote for the top of the technician's home screen (App
 * Builder → App Information): a welcome note, an announcement, and the
 * office phone. Shows nothing at all until the owner has filled something in,
 * so the app stays exactly as it was.
 */
export function HomeInfo({ shop }: { shop: ShopInfo }) {
  const welcome = clean(shop.mobile_app_welcome);
  const announcement = clean(shop.mobile_app_announcement);
  const announcementTitle = clean(shop.mobile_app_announcement_title);
  const phone = clean(shop.mobile_app_office_phone);
  if (!welcome && !announcement && !phone) return null;

  return (
    <div className="mt-4 space-y-3">
      {welcome && (
        <div className="rounded-2xl bg-white/5 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-orange">
            From {shop.shop_name}
          </p>
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-200">{welcome}</p>
        </div>
      )}

      {announcement && (
        <div className="rounded-2xl border border-brand-orange/30 bg-brand-orange/10 p-4">
          <p className="flex items-center gap-1.5 text-xs font-bold text-brand-orange">
            <Megaphone className="h-3.5 w-3.5 shrink-0" />
            {announcementTitle ?? "Announcement"}
          </p>
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-200">{announcement}</p>
        </div>
      )}

      {phone && (
        <a
          href={`tel:${phone}`}
          onClick={guardExternalLink}
          className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 px-4 py-3"
        >
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Need help? Call the office
            </span>
            <span className="block truncate text-sm font-semibold text-white">{phone}</span>
          </span>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-emerald/15 text-brand-emerald">
            <Phone className="h-4 w-4" />
          </span>
        </a>
      )}
    </div>
  );
}

/** The owner's standing reminder for every job (safety rules, "call the customer first"...), plus a way to reach the office. */
export function JobReminder({ shop }: { shop: ShopInfo }) {
  const reminder = clean(shop.mobile_app_job_reminder);
  const phone = clean(shop.mobile_app_office_phone);
  if (!reminder && !phone) return null;

  return (
    <div className="mt-4 space-y-2">
      {reminder && (
        <div className="rounded-xl border border-brand-orange/30 bg-brand-orange/10 px-3.5 py-3">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-orange">
            <ClipboardCheck className="h-3.5 w-3.5 shrink-0" />
            Reminder from {shop.shop_name}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">{reminder}</p>
        </div>
      )}
      {phone && (
        <a
          href={`tel:${phone}`}
          onClick={guardExternalLink}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-emerald/15 px-3.5 py-1.5 text-xs font-semibold text-brand-emerald"
        >
          <Phone className="h-3.5 w-3.5" /> Call the office · {phone}
        </a>
      )}
    </div>
  );
}
