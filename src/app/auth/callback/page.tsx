"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { customerSupabase } from "@/lib/supabase/customerClient";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <AuthCallbackPageContent />
    </Suspense>
  );
}

function AuthCallbackPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Owners land on their dashboard by default; GoogleSignInButton passes "/customer" for the
  // customer-facing auth screens so a customer's Google sign-in doesn't land on /dashboard.
  const next = searchParams.get("next") || "/dashboard";
  // Which Supabase client actually started this sign-in (see GoogleSignInButton) — only that
  // same client instance holds the stored PKCE verifier needed to complete the exchange, since
  // owner and customer sessions live in two separate auth clients with separate storage keys.
  const isCustomer = searchParams.get("client") === "customer";
  const client = isCustomer ? customerSupabase : supabase;
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let redirected = false;

    const { data: subscription } = client.auth.onAuthStateChange(
      (_event, session) => {
        if (session && !redirected) {
          redirected = true;
          router.replace(next);
        }
      }
    );

    client.auth.getSession().then(({ data }) => {
      if (data.session && !redirected) {
        redirected = true;
        router.replace(next);
      }
    });

    const timeout = setTimeout(() => setTimedOut(true), 8000);

    return () => {
      subscription.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router, next, client]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-brand-slate px-6 text-center">
      {timedOut ? (
        <>
          <h1 className="text-xl font-semibold text-slate-900">
            Sign-in is taking longer than expected
          </h1>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            Something may have gone wrong completing your Google sign-in.
          </p>
          <Link
            href={isCustomer ? "/customer" : "/login"}
            className="mt-6 text-sm font-medium text-brand-blue hover:text-blue-400"
          >
            ← Back to login
          </Link>
        </>
      ) : (
        <>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
          <p className="mt-4 text-sm text-slate-500">Signing you in...</p>
        </>
      )}
    </main>
  );
}
