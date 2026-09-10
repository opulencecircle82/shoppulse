"use client";

import { useState, type FormEvent } from "react";
import { signInWithUsername } from "@/lib/tech/staffContext";

export default function TechLoginScreen({ onSignedIn }: { onSignedIn: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signInWithUsername(username.trim(), password);
      onSignedIn();
    } catch {
      setError("Invalid username or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-brand-navy px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-orange text-lg font-bold text-white">
            SP
          </span>
          <h1 className="mt-4 text-xl font-bold text-white">ShopPulse Field App</h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Sign in with the username and password your shop owner gave you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-3">
          <input
            type="text"
            required
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-brand-orange focus:outline-none"
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-white/5 px-4 py-3 pr-12 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-brand-orange focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-4 text-xs font-medium text-slate-400"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-gradient-to-r from-amber-400 to-brand-orange-dark px-6 py-3.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(249,115,22,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Log In"}
          </button>
        </form>
      </div>
    </main>
  );
}
