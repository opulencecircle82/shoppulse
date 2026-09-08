"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const CURRENCIES = ["USD", "AUD", "GBP", "EUR"] as const;

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [shopName, setShopName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>("USD");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          shop_name: shopName,
          currency,
        },
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      router.push("/dashboard");
    } else {
      setConfirmationSent(true);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-slate px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-brand-slate-light/40 p-8 shadow-2xl">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-emerald text-brand-slate font-bold">
            SP
          </span>
          <span className="text-lg font-semibold tracking-tight text-white">
            ShopPulse
          </span>
        </Link>

        <h1 className="mt-6 text-2xl font-bold text-white">
          Create your free account
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          1 Owner + 1 Tech seat free forever. No credit card required.
        </p>

        {confirmationSent ? (
          <div className="mt-8 rounded-lg border border-brand-emerald/30 bg-brand-emerald/10 p-4 text-sm text-brand-emerald">
            Check your inbox at <strong>{email}</strong> to confirm your
            account, then log in.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-medium text-slate-300"
              >
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-600 bg-brand-slate px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-brand-emerald focus:outline-none"
                placeholder="Jane Rivera"
              />
            </div>

            <div>
              <label
                htmlFor="shopName"
                className="block text-sm font-medium text-slate-300"
              >
                Shop Name
              </label>
              <input
                id="shopName"
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-600 bg-brand-slate px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-brand-emerald focus:outline-none"
                placeholder="Apex Property Services"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-300"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-600 bg-brand-slate px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-brand-emerald focus:outline-none"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-300"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-600 bg-brand-slate px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-brand-emerald focus:outline-none"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label
                htmlFor="currency"
                className="block text-sm font-medium text-slate-300"
              >
                Currency
              </label>
              <select
                id="currency"
                value={currency}
                onChange={(e) =>
                  setCurrency(e.target.value as (typeof CURRENCIES)[number])
                }
                className="mt-1.5 w-full rounded-lg border border-slate-600 bg-brand-slate px-3.5 py-2.5 text-sm text-white focus:border-brand-emerald focus:outline-none"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-brand-emerald px-6 py-3 text-sm font-semibold text-brand-slate shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-shadow hover:shadow-[0_0_30px_rgba(16,185,129,0.75)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating account..." : "Get Started Free"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-brand-emerald hover:text-emerald-400"
          >
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
