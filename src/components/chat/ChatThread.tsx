"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Send } from "lucide-react";
import {
  listConversationMessages,
  markConversationRead,
  sendMessage,
  type ChatMessage,
} from "@/lib/chat/chat";

const POLL_MS = 3000;

export default function ChatThread({
  conversationId,
  currentRole,
  title,
  subtitle,
  initialDraft,
  onBack,
}: {
  conversationId: string;
  currentRole: "owner" | "staff" | "customer";
  title: string;
  subtitle?: string;
  initialDraft?: string;
  onBack?: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(initialDraft ?? "");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatMessage[]>([]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  const load = useCallback(async () => {
    const rows = await listConversationMessages(conversationId);
    messagesRef.current = rows;
    setMessages(rows);
    setLoading(false);
    markConversationRead(conversationId).catch(() => {});
  }, [conversationId]);

  useEffect(() => {
    let active = true;
    const timeoutId = setTimeout(() => {
      load().then(() => {
        if (active) scrollToBottom();
      });
    }, 0);

    const interval = setInterval(async () => {
      try {
        const rows = await listConversationMessages(conversationId);
        if (!active) return;
        const grew = rows.length > messagesRef.current.length;
        messagesRef.current = rows;
        setMessages(rows);
        if (grew) {
          markConversationRead(conversationId).catch(() => {});
          scrollToBottom("smooth");
        }
      } catch {
        // transient network hiccup — next poll will retry
      }
    }, POLL_MS);

    return () => {
      active = false;
      clearTimeout(timeoutId);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    setDraft("");
    try {
      const message = await sendMessage(conversationId, body);
      const next = [...messagesRef.current, message];
      messagesRef.current = next;
      setMessages(next);
      scrollToBottom("smooth");
    } catch {
      setDraft(body);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-2xl bg-white/5">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="shrink-0 text-slate-400 hover:text-white"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{title}</p>
          {subtitle && <p className="truncate text-xs text-slate-400">{subtitle}</p>}
        </div>
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            No messages yet. Say hello!
          </p>
        ) : (
          messages.map((message) => {
            const isMine = message.senderRole === currentRole;
            return (
              <div
                key={message.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                    isMine
                      ? "bg-gradient-to-r from-brand-sky to-brand-blue-dark text-white"
                      : "bg-white/10 text-slate-200"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.body}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      isMine ? "text-white/70" : "text-slate-500"
                    }`}
                  >
                    {new Date(message.createdAt).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t border-white/10 px-3 py-3"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message..."
          className="w-full rounded-full bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-brand-blue focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
