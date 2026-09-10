"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import {
  fetchStaffNotifications,
  markAllNotificationsRead,
  type AppNotification,
} from "@/lib/notifications";

const POLL_MS = 20000;

export default function TechNotificationBell({ staffId }: { staffId: string }) {
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
        className="relative rounded-full p-2 text-slate-400 hover:text-white"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-orange px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl bg-brand-navy p-2 shadow-xl shadow-black/40 ring-1 ring-white/10">
          <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Notifications
          </p>
          {notifications.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-slate-500">
              No notifications yet.
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-xl px-2.5 py-2 text-sm ${
                    n.readAt ? "text-slate-400" : "text-white"
                  }`}
                >
                  <p className="font-medium">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-xs text-slate-500">{n.body}</p>}
                  <p className="mt-0.5 text-[10px] text-slate-600">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
