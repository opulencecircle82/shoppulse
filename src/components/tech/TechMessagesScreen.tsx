"use client";

import { useEffect, useState } from "react";
import type { Shop } from "@/lib/supabase/types";
import { ensureStaffConversation } from "@/lib/chat/chat";
import ChatThread from "@/components/chat/ChatThread";

export default function TechMessagesScreen({
  shop,
  onBack,
}: {
  shop: Shop;
  onBack: () => void;
}) {
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => {
      ensureStaffConversation().then(setConversationId);
    }, 0);
    return () => clearTimeout(id);
  }, []);

  return (
    <main className="min-h-screen bg-brand-navy px-5 py-6">
      <div className="mx-auto flex h-[calc(100vh-3rem)] max-w-lg flex-col">
        {conversationId ? (
          <ChatThread
            conversationId={conversationId}
            currentRole="staff"
            title={shop.shop_name}
            subtitle="Shop Owner"
            onBack={onBack}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-orange border-t-transparent" />
          </div>
        )}
      </div>
    </main>
  );
}
