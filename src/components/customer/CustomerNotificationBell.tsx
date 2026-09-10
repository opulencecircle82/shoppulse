"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  fetchCustomerNotifications,
  markAllNotificationsRead,
  type AppNotification,
} from "@/lib/notifications";

const POLL_MS = 20000;

export default function CustomerNotificationBell({
  customerId,
  dark = false,
}: {
  customerId: string;
  dark?: boolean;
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const rows = await fetchCustomerNotifications(customerId);
    setNotifications(rows);
  }, [customerId]);

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
            ? "relative rounded-full p-2 text-white/80 hover:text-white"
            : "relative rounded-full p-2 text-slate-500 hover:text-slate-900"
        }
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl bg-white p-2 shadow-xl shadow-black/20 ring-1 ring-slate-200">
          <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Notifications
          </p>
          {notifications.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-slate-400">
              No notifications yet.
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  disabled={!n.jobTicketId}
                  onClick={() => {
                    if (!n.jobTicketId) return;
                    setOpen(false);
                    router.push(`/client/${n.jobTicketId}`);
                  }}
                  className={`block w-full rounded-xl px-2.5 py-2 text-left text-sm transition-colors ${
                    n.jobTicketId ? "hover:bg-slate-100" : "cursor-default"
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
