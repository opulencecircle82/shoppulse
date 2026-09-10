"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import {
  fetchStaffNotifications,
  markAllNotificationsRead,
  type AppNotification,
} from "@/lib/notifications";
import type { JobTicket } from "@/lib/supabase/types";

const POLL_MS = 20000;

export default function NotificationBell({
  staffId,
  tickets,
  onOpenTicket,
  dark = false,
}: {
  staffId: string;
  tickets: JobTicket[];
  onOpenTicket: (ticket: JobTicket) => void;
  dark?: boolean;
}) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const rows = await fetchStaffNotifications(staffId);
    setNotifications(rows);
  }, [staffId]);

  useEffect(() => {
    let active = true;
    const id = setTimeout(() => {
      load();
    }, 0);
    const interval = setInterval(() => {
      if (active) load();
    }, POLL_MS);
    return () => {
      active = false;
      clearTimeout(id);
      clearInterval(interval);
    };
  }, [load]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  async function handleOpen() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) {
      const unreadIds = notifications.filter((n) => !n.readAt).map((n) => n.id);
      if (unreadIds.length > 0) {
        await markAllNotificationsRead(unreadIds);
        load();
      }
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={handleOpen}
        className={
          dark
            ? "relative rounded-full border border-white/20 p-2.5 text-white/80 transition-colors hover:border-white/40 hover:text-white"
            : "relative rounded-full border border-slate-300 p-2.5 text-slate-600 transition-colors hover:border-brand-blue hover:text-brand-blue"
        }
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl bg-white p-2 shadow-xl shadow-black/20 ring-1 ring-slate-200">
          <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Notifications
          </p>
          {notifications.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-slate-400">
              No notifications yet.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  disabled={!n.jobTicketId}
                  onClick={() => {
                    if (!n.jobTicketId) return;
                    const ticket = tickets.find((t) => t.id === n.jobTicketId);
                    if (!ticket) return;
                    setOpen(false);
                    onOpenTicket(ticket);
                  }}
                  className={`block w-full rounded-xl px-2.5 py-2 text-left text-sm transition-colors ${
                    n.jobTicketId ? "hover:bg-brand-slate" : "cursor-default"
                  } ${n.readAt ? "text-slate-500" : "text-slate-900"}`}
                >
                  <p className="font-medium">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-xs text-slate-500">{n.body}</p>}
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
