"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { fetchCurrentCustomer } from "@/lib/customer/customerAuth";
import { listCustomerConversations, type CustomerShopConversation } from "@/lib/chat/chat";

function timeLabel(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function CustomerMessagesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<CustomerShopConversation[]>([]);

  const load = useCallback(async () => {
    const customer = await fetchCurrentCustomer();
    if (!customer) {
      router.replace("/customer");
      return;
    }
    const rows = await listCustomerConversations();
    setConversations(rows);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const id = setTimeout(() => {
      load();
    }, 0);
    return () => clearTimeout(id);
  }, [load]);

  return (
    <main className="min-h-screen bg-brand-navy px-5 py-6">
      <div className="mx-auto max-w-lg">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm font-medium text-slate-400 hover:text-white"
          >
            ← Back
          </button>
        </header>

        <h1 className="mt-3 text-lg font-bold text-white">Messages</h1>
        <p className="mt-1 text-xs text-slate-400">
          Chats with the businesses you&apos;ve reached out to.
        </p>

        <div className="mt-6">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="rounded-2xl bg-white/5 p-8 text-center shadow-md shadow-black/20">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                <MessageCircle className="h-5 w-5 text-slate-400" />
              </div>
              <p className="mt-3 text-sm text-slate-400">
                No conversations yet. Open a business&apos;s page and tap Chat to
                get started.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {conversations.map((c) => (
                <li key={c.conversationId}>
                  <Link
                    href={`/customer/messages/${c.conversationId}`}
                    className="flex items-center gap-3 rounded-2xl bg-white/5 p-4 shadow-md shadow-black/20 transition-shadow hover:shadow-lg"
                  >
                    {c.shopLogoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.shopLogoUrl}
                        alt=""
                        className="h-11 w-11 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-blue/15 text-sm font-bold text-brand-blue">
                        {c.shopName.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-white">
                          {c.shopName}
                        </p>
                        <span className="shrink-0 text-[10px] text-slate-500">
                          {timeLabel(c.lastMessageAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        {c.lastMessagePreview ?? "No messages yet"}
                      </p>
                    </div>
                    {c.unreadCount > 0 && (
                      <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                        {c.unreadCount > 9 ? "9+" : c.unreadCount}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
