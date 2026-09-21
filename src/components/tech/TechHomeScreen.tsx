"use client";

import { useEffect, useRef, useState } from "react";
import {
  MapPin,
  ClipboardList,
  CheckCircle2,
  Award,
  MessageCircle,
  Siren,
  Navigation as NavigationIcon,
  Phone,
  MessageSquare,
  Wrench,
  Quote,
  Clock,
} from "lucide-react";
import type { Shop, JobTicket } from "@/lib/supabase/types";
import type { TechStats } from "@/lib/tech/todayTask";
import { clockIn, clockOut, type StaffContext } from "@/lib/tech/staffContext";
import { listStaffConversations } from "@/lib/chat/chat";
import { playMessageChime } from "@/lib/chat/chime";
import { supabase } from "@/lib/supabase/client";
import {
  listNearbyEmergencyJobs,
  claimEmergencyJob,
  type NearbyEmergencyJob,
} from "@/lib/tech/jobActions";
import TechNotificationBell from "./TechNotificationBell";

const EMERGENCY_POLL_MS = 15000;

function mapsUrl(address: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

export default function TechHomeScreen({
  shop,
  staffContext,
  task,
  queue,
  stats,
  onOpenTask,
  onOpenTicket,
  onOpenMessages,
  onRefresh,
}: {
  shop: Shop;
  staffContext: StaffContext;
  task: JobTicket | null;
  queue: JobTicket[];
  stats: TechStats;
  onOpenTask: (ticket: JobTicket) => void;
  onOpenTicket: (jobTicketId: string) => void;
  onOpenMessages: () => void;
  onRefresh: () => void;
}) {
  const [responding, setResponding] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const unreadRef = useRef(0);
  const [emergencyJobs, setEmergencyJobs] = useState<NearbyEmergencyJob[]>([]);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [isClockedIn, setIsClockedIn] = useState(staffContext.isClockedIn);
  const [clockLoading, setClockLoading] = useState(false);

  useEffect(() => {
    let active = true;
    function loadUnread() {
      listStaffConversations().then((rows) => {
        if (!active) return;
        const total = rows.reduce((sum, r) => sum + r.unreadCount, 0);
        if (total > unreadRef.current) playMessageChime();
        unreadRef.current = total;
        setUnreadMessages(total);
      });
    }
    loadUnread();
    const interval = setInterval(loadUnread, 20000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Polls rather than waiting for the technician to notice the bell —
  // an emergency job sitting unclaimed for minutes defeats the point.
  useEffect(() => {
    let active = true;
    function loadEmergencyJobs() {
      listNearbyEmergencyJobs()
        .then((jobs) => {
          if (active) setEmergencyJobs(jobs);
        })
        .catch(() => {});
    }
    loadEmergencyJobs();
    const interval = setInterval(loadEmergencyJobs, EMERGENCY_POLL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  async function handleClaimEmergencyJob(jobId: string) {
    setClaimingId(jobId);
    setClaimError(null);
    try {
      await claimEmergencyJob(jobId);
      onRefresh();
    } catch (e) {
      setClaimError(e instanceof Error ? e.message : "Could not claim this job.");
      setEmergencyJobs((prev) => prev.filter((j) => j.id !== jobId));
    } finally {
      setClaimingId(null);
    }
  }

  async function handleToggleClock() {
    setClockLoading(true);
    try {
      if (isClockedIn) {
        await clockOut();
        setIsClockedIn(false);
      } else {
        await clockIn();
        setIsClockedIn(true);
      }
    } finally {
      setClockLoading(false);
    }
  }

  async function handleAcceptJob() {
    if (!task) return;
    setResponding(true);
    await supabase.rpc("accept_job_assignment", { p_ticket_id: task.id });
    setResponding(false);
    onRefresh();
  }

  async function handleDeclineJob() {
    if (!task) return;
    setResponding(true);
    await supabase.rpc("decline_job_assignment", { p_ticket_id: task.id });
    setResponding(false);
    onRefresh();
  }

  const isInProgress = task?.status === "IN_PROGRESS";
  const needsAcceptance =
    task?.status === "SCHEDULED" && !task.staff_accepted_at;
  const activeChecklist = task ? (isInProgress ? task.end_checklist : task.start_checklist) : [];

  return (
    <main className="min-h-screen bg-brand-navy px-5 py-6">
      <div className="mx-auto max-w-lg">
        <header className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            {staffContext.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={staffContext.avatarUrl}
                alt=""
                className="h-11 w-11 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-orange text-base font-bold text-white">
                {staffContext.fullName.slice(0, 1).toUpperCase() || "?"}
              </span>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="truncate text-sm font-bold text-white">
                  {staffContext.fullName}
                </p>
                <span className="shrink-0 rounded-full bg-brand-blue/15 px-1.5 py-0.5 text-[9px] font-bold text-brand-blue">
                  {staffContext.role}
                </span>
                {isClockedIn && (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-brand-emerald/15 px-1.5 py-0.5 text-[9px] font-bold text-brand-emerald">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-emerald" />
                    Clocked In
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-slate-400">{shop.shop_name}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onOpenMessages}
              className="relative rounded-full p-2 text-white/80 hover:text-white"
              aria-label="Messages"
            >
              <MessageCircle className="h-5 w-5" />
              {unreadMessages > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadMessages > 9 ? "9+" : unreadMessages}
                </span>
              )}
            </button>

            <TechNotificationBell staffId={staffContext.staffId} onOpenTicket={onOpenTicket} />
          </div>
        </header>

        <button
          type="button"
          onClick={handleToggleClock}
          disabled={clockLoading}
          className={`mt-4 flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            isClockedIn
              ? "border border-white/20 text-slate-300 hover:bg-white/5"
              : "bg-gradient-to-r from-brand-orange to-brand-orange-dark text-white shadow-[0_0_20px_rgba(249,115,22,0.35)]"
          }`}
        >
          <Clock className="h-4 w-4" />
          {clockLoading ? "Please wait..." : isClockedIn ? "Clock Out" : "Clock In"}
        </button>

        <div className="pb-24">
          <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/5 p-4">
                <div className="flex items-center gap-1.5 text-brand-emerald">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <p className="text-[10px] font-semibold uppercase tracking-wide">
                    Today
                  </p>
                </div>
                <p className="mt-1.5 text-2xl font-bold text-white">
                  {stats.completedToday}
                </p>
                <p className="text-[11px] text-slate-500">Jobs completed</p>
              </div>
              <div className="rounded-2xl bg-white/5 p-4">
                <div className="flex items-center gap-1.5 text-brand-orange">
                  <Award className="h-3.5 w-3.5" />
                  <p className="text-[10px] font-semibold uppercase tracking-wide">
                    All Time
                  </p>
                </div>
                <p className="mt-1.5 text-2xl font-bold text-white">
                  {stats.completedTotal}
                </p>
                <p className="text-[11px] text-slate-500">Total completed</p>
              </div>
            </div>

            {emergencyJobs.length > 0 && (
              <div className="mt-6">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-red-400">
                  <Siren className="h-3.5 w-3.5" />
                  Emergency Jobs Nearby ({emergencyJobs.length})
                </p>
                {claimError && (
                  <p className="mt-1.5 text-xs text-red-400">{claimError}</p>
                )}
                <div className="mt-2 space-y-2">
                  {emergencyJobs.map((job) => (
                    <div
                      key={job.id}
                      className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-white">{job.serviceType}</p>
                        <span className="shrink-0 text-xs font-semibold text-red-300">
                          {job.distanceKm < 1
                            ? `${Math.round(job.distanceKm * 1000)}m away`
                            : `${job.distanceKm.toFixed(1)}km away`}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-300">{job.serviceAddress}</p>
                      {job.description && (
                        <p className="mt-1 text-xs text-slate-400">{job.description}</p>
                      )}
                      <button
                        type="button"
                        onClick={() => handleClaimEmergencyJob(job.id)}
                        disabled={claimingId === job.id}
                        className="mt-3 w-full rounded-full bg-gradient-to-r from-red-500 to-red-700 px-4 py-2.5 text-xs font-bold text-white shadow-[0_0_20px_rgba(239,68,68,0.35)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {claimingId === job.id ? "Claiming..." : "Claim This Job"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Active Task
            </p>

            {!task ? (
              <div className="mt-3 rounded-2xl bg-white/5 p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                  <ClipboardList className="h-5 w-5 text-slate-400" />
                </div>
                <p className="mt-3 text-sm text-slate-400">
                  No job assigned to you right now. Check back later.
                </p>
              </div>
            ) : needsAcceptance ? (
              <div className="mt-3 w-full rounded-2xl bg-white/5 p-5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold text-amber-400">
                  NEEDS YOUR CONFIRMATION
                </span>
                <p className="mt-3 text-lg font-bold text-white">
                  {task.client_name}
                </p>
                <p className="mt-0.5 text-sm text-slate-300">
                  {task.service_type}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {task.service_address}
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={handleAcceptJob}
                    disabled={responding}
                    className="flex-1 rounded-full bg-gradient-to-r from-amber-400 to-brand-orange-dark px-4 py-2.5 text-xs font-bold text-white shadow-[0_0_20px_rgba(249,115,22,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] disabled:opacity-60"
                  >
                    Accept Job
                  </button>
                  <button
                    type="button"
                    onClick={handleDeclineJob}
                    disabled={responding}
                    className="flex-1 rounded-full border border-white/20 px-4 py-2.5 text-xs font-bold text-slate-300 disabled:opacity-60"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded-2xl bg-white/5 p-5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-emerald/15 px-2.5 py-1 text-[10px] font-bold text-brand-emerald">
                    {isInProgress ? "IN PROGRESS" : "SCHEDULED"}
                  </span>
                  {task.is_emergency && (
                    <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-1 text-[10px] font-bold text-red-400">
                      <Siren className="h-3 w-3" /> EMERGENCY
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onOpenTask(task)}
                  className="mt-3 block w-full text-left"
                >
                  <p className="text-lg font-bold text-white">{task.client_name}</p>
                  <p className="mt-0.5 text-sm text-slate-300">{task.service_type}</p>
                </button>

                {task.description && (
                  <div className="mt-3 flex gap-2 rounded-xl bg-black/20 p-3">
                    <Quote className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                    <p className="text-xs italic text-slate-300">{task.description}</p>
                  </div>
                )}

                {activeChecklist.length > 0 && (
                  <div className="mt-3 rounded-xl bg-black/20 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        <Wrench className="h-3 w-3 text-brand-orange" />
                        {isInProgress ? "End Task Checklist" : "Start Task Checklist"}
                      </p>
                      <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-bold text-slate-300">
                        0/{activeChecklist.length} Ready
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1.5">
                      {activeChecklist.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-2 text-xs text-slate-300"
                        >
                          <span className="h-3 w-3 shrink-0 rounded-sm border border-slate-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {task.client_phone && (
                  <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-black/20 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Customer
                      </p>
                      <p className="truncate text-sm text-white">{task.client_name}</p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <a
                        href={`tel:${task.client_phone}`}
                        className="flex items-center gap-1 rounded-full bg-brand-emerald/15 px-3 py-1.5 text-xs font-semibold text-brand-emerald"
                      >
                        <Phone className="h-3 w-3" /> Call
                      </a>
                      <a
                        href={`sms:${task.client_phone}`}
                        className="flex items-center gap-1 rounded-full bg-brand-blue/15 px-3 py-1.5 text-xs font-semibold text-brand-blue"
                      >
                        <MessageSquare className="h-3 w-3" /> Text
                      </a>
                    </div>
                  </div>
                )}

                <p className="mt-3 flex items-center gap-1 text-xs text-slate-500">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {task.service_address}
                </p>

                <a
                  href={mapsUrl(task.service_address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-5 py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)]"
                >
                  <NavigationIcon className="h-4 w-4" /> Start Navigation
                </a>

                <button
                  type="button"
                  onClick={() => onOpenTask(task)}
                  className="mt-2 flex w-full items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-brand-orange-dark px-5 py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(249,115,22,0.35)]"
                >
                  {isInProgress ? "Complete Job" : "Start Job"}
                </button>
              </div>
            )}

            {queue.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Other Schedule Today
                  </p>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                    {queue.length} task{queue.length > 1 ? "s" : ""} remaining
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {queue.map((job, index) => (
                    <div
                      key={job.id}
                      className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-orange/15 text-brand-orange">
                        <Wrench className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-white">
                            {job.client_name}
                          </p>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                              index === 0
                                ? "bg-brand-orange/15 text-brand-orange"
                                : "bg-white/10 text-slate-400"
                            }`}
                          >
                            {index === 0 ? "NEXT" : "LATER"}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-400">
                          {job.service_type} · {job.service_address}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      </div>
    </main>
  );
}
