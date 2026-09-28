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

// The thread is shared: the tech and customer apps are dark, the owner's
// dashboard is light. Every color that depends on the background lives here,
// so a message from the other person is never white text on a white page.
const THEMES = {
  dark: {
    shell: "bg-white/5",
    divider: "border-white/10",
    back: "text-slate-400 hover:text-white",
    title: "text-white",
    muted: "text-slate-400",
    theirs: "bg-white/10 text-slate-200",
    theirsTime: "text-slate-500",
    input: "bg-white/5 text-white placeholder:text-slate-500",
  },
  light: {
    shell: "border border-slate-200/70 bg-white shadow-sm shadow-slate-900/5",
    divider: "border-slate-100",
    back: "text-slate-500 hover:text-slate-900",
    title: "text-slate-900",
    muted: "text-slate-500",
    theirs: "bg-slate-100 text-slate-800",
    theirsTime: "text-slate-500",
    input: "border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400",
  },
} as const;

export default function ChatThread({
  conversationId,
  currentRole,
  title,
  subtitle,
  initialDraft,
  onBack,
  theme = "dark",
}: {
  conversationId: string;
  currentRole: "owner" | "staff" | "customer";
  title: string;
  subtitle?: string;
  initialDraft?: string;
  onBack?: () => void;
  /** "light" on the owner dashboard; the tech and customer apps use the default "dark". */
  theme?: "dark" | "light";
}) {
  const t = THEMES[theme];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(initialDraft ?? "");
  const [sending, setSending] = useState(false);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatMessage[]>([]);

  // Scroll only the message list. scrollIntoView() would also drag the whole page along —
  // on the owner dashboard that yanked the screen away from the chat header.
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const list = messagesScrollRef.current;
    list?.scrollTo({ top: list.scrollHeight, behavior });
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
    <div className={`flex h-full min-h-0 flex-col overflow-hidden rounded-2xl ${t.shell}`}>
      <div className={`flex items-center gap-3 border-b px-4 py-3 ${t.divider}`}>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className={`-ml-2 shrink-0 rounded-full p-2 ${t.back}`}
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="min-w-0">
          <p className={`truncate text-sm font-semibold ${t.title}`}>{title}</p>
          {subtitle && <p className={`truncate text-xs ${t.muted}`}>{subtitle}</p>}
        </div>
      </div>

      <div ref={messagesScrollRef} className="flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <p className={`py-8 text-center text-sm ${t.muted}`}>
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
                      : t.theirs
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.body}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      isMine ? "text-white/70" : t.theirsTime
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
      </div>

      <form
        onSubmit={handleSend}
        className={`flex items-center gap-2 border-t px-3 py-3 ${t.divider}`}
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message..."
          className={`w-full rounded-full px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none ${t.input}`}
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
