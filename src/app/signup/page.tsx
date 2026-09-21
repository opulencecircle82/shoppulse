"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import GlowingWavesBackground from "@/components/landing/GlowingWavesBackground";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEmailSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (!data.session) {
      setError("Check your email to confirm your account, then log in.");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brand-navy px-6 py-16">
      <GlowingWavesBackground />
      <div className="relative z-10 w-full max-w-md rounded-3xl bg-brand-navy p-8 shadow-2xl shadow-black/40 ring-1 ring-white/10">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-blue text-white font-bold">
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

        <div className="mt-8">
          <GoogleSignInButton label="Sign up with Google" />
        </div>

        <div className="mt-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs font-medium text-slate-500">
            Or sign up with email
          </span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={handleEmailSignup} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-400">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-brand-blue focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400">Password</label>
            <input
              type="password"
              required
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-brand-blue focus:outline-none"
            />
          </div>
          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              "Creating account..."
            ) : (
              <>
                Create Account <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-brand-blue hover:text-blue-400"
          >
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
