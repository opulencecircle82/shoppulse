import Link from "next/link";
import { CalendarClock } from "lucide-react";

/**
 * Shown on a business that is closed right now (or hasn't set its hours yet). It can still take
 * requests, so this opens the booking form already set to the next day it works, with the
 * time picker open — the customer chooses an hour and, if that hour is taken, the next day.
 */
export default function ScheduleTomorrowLink({
  slug,
  branchId = null,
  className = "",
}: {
  slug: string;
  branchId?: string | null;
  className?: string;
}) {
  return (
    <Link
      href={`/customer/book/${slug}?schedule=1${branchId ? `&branch=${branchId}` : ""}`}
      className={`flex items-center justify-center gap-2 rounded-full bg-brand-orange/15 px-4 py-2.5 text-xs font-bold text-brand-orange transition-colors hover:bg-brand-orange/25 ${className}`}
    >
      <CalendarClock className="h-3.5 w-3.5" />
      Click to schedule your request for tomorrow
    </Link>
  );
}
