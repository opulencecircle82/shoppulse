"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Shop } from "@/lib/supabase/types";
import WorkingHoursPanel from "./settings/WorkingHoursPanel";

/** A shop is LIVE once it is listed for customers AND has told them when it works. */
export function isShopLive(shop: Pick<Shop, "is_publicly_listed" | "business_hours_open" | "business_hours_close" | "business_days">): boolean {
  return shop.is_publicly_listed && hasWorkingSchedule(shop);
}

export function hasWorkingSchedule(
  shop: Pick<Shop, "business_hours_open" | "business_hours_close" | "business_days">
): boolean {
  return Boolean(shop.business_hours_open && shop.business_hours_close && shop.business_days.length > 0);
}

/**
 * The owner's LIVE switch, in the dashboard header. Not live: a "Go LIVE" button. If the shop hasn't
 * set its working days and hours yet, it first asks for them ("Please input your working days") and
 * goes live the moment they're saved. Live: a green "LIVE NOW" badge that opens a small menu to edit
 * the working days or take the business offline.
 */
export default function GoLiveButton({ shop, onChanged }: { shop: Shop; onChanged: () => void }) {
  const [showHours, setShowHours] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasSchedule = hasWorkingSchedule(shop);
  const live = isShopLive(shop);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /** Returns whether it worked, so the hours form can stay open on a failure. */
  async function setListed(listed: boolean): Promise<boolean> {
    setBusy(true);
    setError(null);
    const { error: updateError } = await supabase
      .from("shops")
      .update({ is_publicly_listed: listed })
      .eq("id", shop.id);
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return false;
    }
    setMenuOpen(false);
    onChanged();
    return true;
  }

  async function handleHoursSaved() {
    // The working days are saved — that was the only thing missing, so go live now.
    if (await setListed(true)) setShowHours(false);
  }

  function handleClick() {
    if (live) {
      setMenuOpen((open) => !open);
    } else if (!hasSchedule) {
      setError(null);
      setShowHours(true);
    } else {
      void setListed(true);
    }
  }

  return (
    <div className="relative mt-3" ref={containerRef}>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        aria-expanded={live ? menuOpen : undefined}
        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-shadow disabled:cursor-not-allowed disabled:opacity-60 ${
          live
            ? "bg-brand-emerald/15 text-brand-emerald-dark ring-1 ring-brand-emerald/30"
            : "bg-gradient-to-r from-red-500 to-brand-orange text-white shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.45)]"
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full ${live ? "animate-pulse bg-brand-emerald" : "bg-white"}`}
          aria-hidden="true"
        />
        {busy ? "Please wait..." : live ? "LIVE NOW" : "Go LIVE"}
      </button>
      {!live && (
        <p className="mt-1.5 text-[11px] text-slate-500">
          {hasSchedule
            ? "Not live yet — tap to show your business to customers."
            : "Not live yet — set your working days to go live."}
        </p>
      )}
      {error && !showHours && (
        <p role="alert" className="mt-1.5 text-[11px] text-red-600">
          {error}
        </p>
      )}

      {live && menuOpen && (
        <div className="absolute left-0 top-full z-40 mt-2 w-64 rounded-2xl bg-white p-3 shadow-xl shadow-slate-900/10 ring-1 ring-slate-200">
          <p className="text-xs text-slate-600">
            You&apos;re live — customers nearby can find and book you.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setShowHours(true);
              }}
              className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-brand-blue hover:text-brand-blue"
            >
              Edit working days
            </button>
            <button
              type="button"
              onClick={() => void setListed(false)}
              disabled={busy}
              className="rounded-full border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/10 disabled:opacity-60"
            >
              Take offline
            </button>
          </div>
        </div>
      )}

      {showHours && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 sm:px-6">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Please input your working days</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {live
                    ? "Change the days and hours customers see."
                    : "Customers need to know when you work before you go live. Save them and your business goes LIVE right away."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHours(false)}
                aria-label="Close"
                className="shrink-0 rounded-full p-1.5 text-slate-400 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5">
              <WorkingHoursPanel
                shop={shop}
                onSaved={handleHoursSaved}
                submitLabel={live ? "Save Changes" : "Save & go LIVE"}
              />
            </div>
            {error && (
              <p role="alert" className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">
                {error}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
