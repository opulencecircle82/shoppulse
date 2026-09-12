"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import type { StaffMember } from "@/lib/supabase/types";
import {
  listStaffConversations,
  listShopCustomerConversations,
  ensureStaffConversation,
  type StaffConversation,
  type ShopCustomerConversation,
} from "@/lib/chat/chat";
import ChatThread from "@/components/chat/ChatThread";

type SelectedThread =
  | { kind: "staff"; conversationId: string; name: string }
  | { kind: "customer"; conversationId: string; name: string };

type TeamRow = {
  staffMemberId: string;
  name: string;
  conversationId: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

function timeLabel(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function MessagesTab({
  staffMember,
  staff,
}: {
  staffMember: StaffMember;
  staff: StaffMember[];
}) {
  const isOwner = staffMember.role === "OWNER";
  const [teamRows, setTeamRows] = useState<TeamRow[]>([]);
  const [customerConvos, setCustomerConvos] = useState<ShopCustomerConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SelectedThread | null>(null);

  const load = useCallback(async () => {
    let staffRows: StaffConversation[] = await listStaffConversations();

    // A staff member's first visit has no conversation row yet — create
    // their one-and-only thread with the owner right away so they land on
    // a working chat instead of an empty state with nothing to click.
    if (!isOwner && staffRows.length === 0) {
      await ensureStaffConversation();
      staffRows = await listStaffConversations();
    }

    if (isOwner) {
      const byStaffId = new Map(staffRows.map((row) => [row.staffMemberId, row]));
      const rows: TeamRow[] = staff
        .filter((s) => s.id !== staffMember.id)
        .map((s) => {
          const existing = byStaffId.get(s.id);
          return {
            staffMemberId: s.id,
            name: s.full_name,
            conversationId: existing?.conversationId ?? null,
            lastMessagePreview: existing?.lastMessagePreview ?? null,
            lastMessageAt: existing?.lastMessageAt ?? null,
            unreadCount: existing?.unreadCount ?? 0,
          };
        })
        .sort((a, b) => {
          if (!a.lastMessageAt && !b.lastMessageAt) return a.name.localeCompare(b.name);
          if (!a.lastMessageAt) return 1;
          if (!b.lastMessageAt) return -1;
          return b.lastMessageAt.localeCompare(a.lastMessageAt);
        });
      setTeamRows(rows);

      const customerRows = await listShopCustomerConversations();
      setCustomerConvos(customerRows);
    } else if (staffRows.length > 0) {
      const row = staffRows[0];
      setTeamRows([
        {
          staffMemberId: row.staffMemberId,
          name: row.counterpartName,
          conversationId: row.conversationId,
          lastMessagePreview: row.lastMessagePreview,
          lastMessageAt: row.lastMessageAt,
          unreadCount: row.unreadCount,
        },
      ]);
      setSelected((prev) =>
        prev ?? { kind: "staff", conversationId: row.conversationId, name: row.counterpartName }
      );
    }

    setLoading(false);
  }, [isOwner, staff, staffMember.id]);

  useEffect(() => {
    let active = true;
    const id = setTimeout(() => {
      load();
    }, 0);
    const interval = setInterval(() => {
      if (active) load();
    }, 20000);
    return () => {
      active = false;
      clearTimeout(id);
      clearInterval(interval);
    };
  }, [load]);

  async function handleOpenStaff(row: TeamRow) {
    const conversationId =
      row.conversationId ?? (await ensureStaffConversation(row.staffMemberId));
    setSelected({ kind: "staff", conversationId, name: row.name });
  }

  const hasAnyConversations = teamRows.length > 0 || customerConvos.length > 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <div className="space-y-4">
        {loading ? (
          <p className="text-sm text-slate-400">Loading conversations...</p>
        ) : !hasAnyConversations ? (
          <div className="rounded-2xl bg-white/5 p-6 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
              <MessageCircle className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-3 text-sm text-slate-400">
              {isOwner
                ? "Add staff to your team to start chatting with them here."
                : "No conversation yet. Send the owner a message to get started."}
            </p>
          </div>
        ) : (
          <>
            {teamRows.length > 0 && (
              <div>
                <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {isOwner ? "Team" : "Owner"}
                </p>
                <div className="mt-2 space-y-1">
                  {teamRows.map((row) => (
                    <button
                      key={row.staffMemberId}
                      type="button"
                      onClick={() => handleOpenStaff(row)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        selected?.conversationId === row.conversationId
                          ? "bg-brand-blue/15"
                          : "hover:bg-white/5"
                      }`}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-blue/15 text-xs font-bold text-brand-blue">
                        {row.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium text-white">
                            {row.name}
                          </p>
                          <span className="shrink-0 text-[10px] text-slate-500">
                            {timeLabel(row.lastMessageAt)}
                          </span>
                        </div>
                        <p className="truncate text-xs text-slate-400">
                          {row.lastMessagePreview ?? "Say hello!"}
                        </p>
                      </div>
                      {row.unreadCount > 0 && (
                        <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                          {row.unreadCount > 9 ? "9+" : row.unreadCount}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isOwner && customerConvos.length > 0 && (
              <div>
                <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Customers
                </p>
                <div className="mt-2 space-y-1">
                  {customerConvos.map((c) => (
                    <button
                      key={c.conversationId}
                      type="button"
                      onClick={() =>
                        setSelected({
                          kind: "customer",
                          conversationId: c.conversationId,
                          name: c.customerName,
                        })
                      }
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        selected?.conversationId === c.conversationId
                          ? "bg-brand-blue/15"
                          : "hover:bg-white/5"
                      }`}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-orange/15 text-xs font-bold text-brand-orange">
                        {c.customerName.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium text-white">
                            {c.customerName}
                          </p>
                          <span className="shrink-0 text-[10px] text-slate-500">
                            {timeLabel(c.lastMessageAt)}
                          </span>
                        </div>
                        <p className="truncate text-xs text-slate-400">
                          {c.lastMessagePreview ?? "No messages yet"}
                        </p>
                      </div>
                      {c.unreadCount > 0 && (
                        <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                          {c.unreadCount > 9 ? "9+" : c.unreadCount}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="min-h-[420px]">
        {selected ? (
          <ChatThread
            key={selected.conversationId}
            conversationId={selected.conversationId}
            currentRole={isOwner ? "owner" : "staff"}
            title={selected.name}
            subtitle={selected.kind === "customer" ? "Customer" : undefined}
          />
        ) : (
          <div className="flex h-full min-h-[420px] items-center justify-center rounded-2xl bg-white/5 text-sm text-slate-400">
            Select a conversation to start chatting.
          </div>
        )}
      </div>
    </div>
  );
}
