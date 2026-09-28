"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Moon, UserMinus, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Shop } from "@/lib/supabase/types";
import { useStaffMembers } from "@/lib/hooks/useStaffMembers";
import {
  fetchNightShiftLog,
  formatResponseTime,
  statsByTechnician,
  type NightOutcome,
  type NightShiftEntry,
} from "@/lib/dashboard/nightShift";
import { formatJobNumber } from "@/lib/jobNumber";
import { formatTimeOfDay } from "@/lib/dashboard/format";
import { hasWorkingSchedule } from "@/components/dashboard/GoLiveButton";

const DAY_ORDER = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const DAY_LABEL: Record<string, string> = {
  MON: "Mon", TUE: "Tue", WED: "Wed", THU: "Thu", FRI: "Fri", SAT: "Sat", SUN: "Sun",
};

function describeOpenHours(shop: Shop): string {
  const days = DAY_ORDER.filter((day) => shop.business_days.includes(day));
  const dayText = days.length === 7 ? "every day" : days.map((day) => DAY_LABEL[day]).join(", ");
  return `${dayText}, ${formatTimeOfDay(shop.business_hours_open ?? "")} – ${formatTimeOfDay(shop.business_hours_close ?? "")}`;
}

const OUTCOME_STYLE: Record<NightOutcome, string> = {
  ACCEPTED: "bg-brand-emerald/15 text-brand-emerald-dark",
  WAITING: "bg-amber-100 text-amber-800",
  MISSED: "bg-red-100 text-red-700",
  CANCELLED: "bg-slate-100 text-slate-600",
};

function outcomeText(entry: NightShiftEntry): string {
  switch (entry.outcome) {
    case "ACCEPTED":
      return `Accepted by ${entry.acceptedByName ?? "a night-shift technician"}${
        entry.acceptedAt ? ` in ${formatResponseTime(entry.createdAt, entry.acceptedAt)}` : ""
      }`;
    case "WAITING":
      return "Waiting for a night-shift technician";
    case "MISSED":
      return entry.alerted.length === 0 ? "Nobody was on your night shift" : "Nobody on the night shift accepted";
    default:
      return "Cancelled or declined";
  }
}

/**
 * Settings → Night Shift. While the shop is closed, an emergency goes to the technicians the owner has put on
 * call: they can accept it without waiting for the owner, and every one is recorded here — who was alerted, who
 * answered and how fast — so an owner can take someone off the night shift and put someone else on.
 */
export default function NightShiftPanel({ shop, onSaved }: { shop: Shop | null; onSaved: () => void | Promise<void> }) {
  const { staff, loading: staffLoading, refresh: refreshStaff } = useStaffMembers(shop?.id);
  const [log, setLog] = useState<NightShiftEntry[] | null>(null);
  const [logError, setLogError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [pickedId, setPickedId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const shopId = shop?.id;
  const reloadLog = useCallback(() => {
    if (!shopId) return;
    fetchNightShiftLog(30)
      .then((entries) => {
        setLog(entries);
        setLogError(null);
      })
      .catch((e) => setLogError(e instanceof Error ? e.message : "Couldn't load the night shift log."));
  }, [shopId]);

  useEffect(() => {
    const id = setTimeout(reloadLog, 0);
    return () => clearTimeout(id);
  }, [reloadLog]);

  const technicians = useMemo(() => staff.filter((member) => member.role === "TECHNICIAN"), [staff]);
  const onNight = technicians.filter((member) => member.is_night_shift);
  const candidates = technicians.filter((member) => member.is_active && !member.is_night_shift);
  const stats = useMemo(() => statsByTechnician(log ?? []), [log]);

  if (!shop) {
    return <p className="text-sm text-slate-500">Set up your Company Profile first to use the night shift.</p>;
  }

  const hasHours = hasWorkingSchedule(shop);
  const activeOnNight = onNight.filter((member) => member.is_active);

  async function setEnabled(next: boolean) {
    setToggling(true);
    setError(null);
    const { error: updateError } = await supabase
      .from("shops")
      .update({ night_shift_enabled: next })
      .eq("id", shop!.id);
    setToggling(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await onSaved();
  }

  async function setOnNightShift(memberId: string, on: boolean) {
    setBusyId(memberId);
    setError(null);
    const { error: updateError } = await supabase
      .from("staff_members")
      .update({ is_night_shift: on })
      .eq("id", memberId);
    setBusyId(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    if (on) setPickedId("");
    await refreshStaff();
  }

  const answered = (log ?? []).filter((entry) => entry.outcome === "ACCEPTED").length;
  const missed = (log ?? []).filter((entry) => entry.outcome === "MISSED").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue-dark">
          <Moon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Night shift</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            For businesses that get emergencies after closing — hotels, 24/7 stores. While you are closed, an emergency
            request goes straight to the technicians you put on call. They can accept it without waiting for you, and
            every one is recorded below so you can see it.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Turn on night shift</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {hasHours
                ? `You're open ${describeOpenHours(shop)}. Any emergency outside that goes to the night shift.`
                : "Set your working days and hours first — the night shift covers the time you are closed."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={shop.night_shift_enabled}
            aria-label="Night shift"
            disabled={toggling || !hasHours}
            onClick={() => setEnabled(!shop.night_shift_enabled)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              shop.night_shift_enabled ? "bg-brand-blue-dark" : "bg-slate-300"
            }`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
                shop.night_shift_enabled ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">{error}</p>
      )}

      <div>
        <p className="text-sm font-semibold text-slate-900">On night shift ({onNight.length})</p>

        {shop.night_shift_enabled && activeOnNight.length === 0 && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-800">
            Nobody is on your night shift yet. Until you add someone, an after-hours emergency only alerts you.
          </p>
        )}

        {staffLoading ? (
          <p className="mt-2 text-sm text-slate-500">Loading staff...</p>
        ) : technicians.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            You haven&apos;t added any technicians yet. Add one in the Staff tab first.
          </p>
        ) : (
          <>
            <ul className="mt-2 space-y-2">
              {onNight.map((member) => {
                const tally = stats.get(member.id);
                return (
                  <li
                    key={member.id}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-brand-blue/20 bg-brand-blue/5 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {member.full_name}
                        {!member.is_active && (
                          <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            Inactive
                          </span>
                        )}
                      </p>
                      <p className={`mt-0.5 text-xs ${tally && tally.missed > 0 ? "font-medium text-red-600" : "text-slate-500"}`}>
                        {tally
                          ? `Alerted ${tally.alerts} · accepted ${tally.accepted}${tally.missed > 0 ? ` · missed ${tally.missed}` : ""} (last 30 days)`
                          : "No night emergencies yet"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOnNightShift(member.id, false)}
                      disabled={busyId === member.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-red-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                      {busyId === member.id ? "Removing..." : "Remove from night shift"}
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                value={pickedId}
                onChange={(e) => setPickedId(e.target.value)}
                disabled={candidates.length === 0}
                aria-label="Technician to add to the night shift"
                className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue disabled:opacity-60 [color-scheme:light] sm:w-auto sm:max-w-xs sm:flex-1"
              >
                <option value="">
                  {candidates.length === 0 ? "Everyone is already on the night shift" : "Choose a technician..."}
                </option>
                {candidates.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => pickedId && setOnNightShift(pickedId, true)}
                disabled={!pickedId || busyId === pickedId}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue-dark px-4 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Add to night shift
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              A technician who doesn&apos;t answer night emergencies? Remove them here and put someone else on.
            </p>
          </>
        )}
      </div>

      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900">Night emergencies — last 30 days</p>
          {log && log.length > 0 && (
            <p className="text-xs text-slate-500">
              {log.length} in all · {answered} accepted{missed > 0 ? ` · ${missed} missed` : ""}
            </p>
          )}
        </div>

        {logError && <p className="mt-2 text-sm text-red-600">{logError}</p>}
        {!logError && log === null && <p className="mt-2 text-sm text-slate-500">Loading...</p>}
        {log && log.length === 0 && (
          <p className="mt-2 rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
            No emergencies have come in after hours yet. When one does, it is recorded here automatically.
          </p>
        )}

        {log && log.length > 0 && (
          <ul className="mt-2 divide-y divide-slate-100 rounded-2xl border border-slate-200">
            {log.map((entry) => (
              <li key={entry.jobId} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <p className="min-w-0 text-sm font-semibold text-slate-900">
                    <span className="text-slate-500">{formatJobNumber(entry.jobNumber, entry.jobId)}</span> -{" "}
                    {entry.serviceType}
                  </p>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${OUTCOME_STYLE[entry.outcome]}`}>
                    {outcomeText(entry)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  {entry.clientName} · {entry.serviceAddress}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {new Date(entry.createdAt).toLocaleString()}
                  {entry.alerted.length > 0 && ` · Alerted: ${entry.alerted.map((alert) => alert.name).join(", ")}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
