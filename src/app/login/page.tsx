"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import CurvedLinesBackground from "@/components/ui/CurvedLinesBackground";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Self-service accounts only ever sign up with Google — but accounts an
  // admin creates directly from /devside (no signup flow) get an email +
  // password instead, since there's no OAuth consent step to run on
  // someone else's behalf. Without this form those accounts would have a
  // working login with nowhere to use it.
  async function handleEmailLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError("Invalid email or password.");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brand-slate px-6 py-16">
      <CurvedLinesBackground />
      <div className="relative z-10 w-full max-w-md rounded-3xl bg-brand-slate-light/50 p-8 shadow-2xl shadow-black/40">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-blue text-white font-bold">
            SP
          </span>
          <span className="text-lg font-semibold tracking-tight text-slate-900">
            ShopPulse
          </span>
        </Link>

        <h1 className="mt-6 text-2xl font-bold text-slate-900">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-500">
          Log in to your ShopPulse dashboard.
        </p>

        <div className="mt-8">
          <GoogleSignInButton label="Continue with Google" />
        </div>

        <div className="mt-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-300" />
          <span className="text-xs font-medium text-slate-400">
            Or sign in with email
          </span>
          <div className="h-px flex-1 bg-slate-300" />
        </div>

        <form onSubmit={handleEmailLogin} className="mt-4 space-y-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl bg-brand-slate-light/60 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl bg-brand-slate-light/60 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none"
          />
          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-brand-blue hover:text-blue-400"
          >
            Get started free
          </Link>
        </p>
      </div>
    </main>
  );
}
