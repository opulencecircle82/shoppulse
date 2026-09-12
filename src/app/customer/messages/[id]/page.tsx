"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { fetchCurrentCustomer } from "@/lib/customer/customerAuth";
import { listCustomerConversations, type CustomerShopConversation } from "@/lib/chat/chat";
import ChatThread from "@/components/chat/ChatThread";

export default function CustomerConversationPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const conversationId = params.id as string;
  const prefill = searchParams.get("prefill") ?? undefined;

  const [loading, setLoading] = useState(true);
  const [conversation, setConversation] = useState<CustomerShopConversation | null>(null);

  useEffect(() => {
    const id = setTimeout(async () => {
      const customer = await fetchCurrentCustomer();
      if (!customer) {
        router.replace("/customer");
        return;
      }
      const rows = await listCustomerConversations();
      const match = rows.find((r) => r.conversationId === conversationId) ?? null;
      setConversation(match);
      setLoading(false);
    }, 0);
    return () => clearTimeout(id);
  }, [conversationId, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-navy">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
      </main>
    );
  }

  if (!conversation) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-navy px-6 text-center">
        <p className="text-sm text-slate-400">
          We couldn&apos;t find this conversation.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-navy px-5 py-6">
      <div className="mx-auto flex h-[calc(100vh-3rem)] max-w-lg flex-col">
        <ChatThread
          conversationId={conversation.conversationId}
          currentRole="customer"
          title={conversation.shopName}
          initialDraft={prefill}
          onBack={() => router.push("/customer/messages")}
        />
      </div>
    </main>
  );
}
