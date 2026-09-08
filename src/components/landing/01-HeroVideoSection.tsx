"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import LaborLeakCounter from "./LaborLeakCounter";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "About Us", href: "#about" },
  { label: "Pricing", href: "#pricing" },
];

export default function HeroVideoSection() {
  return (
    <section className="relative overflow-hidden bg-brand-slate">
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-brand-emerald/20 blur-[120px]"
        aria-hidden
      />

      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-emerald text-brand-slate font-bold">
            SP
          </span>
          <span className="text-lg font-semibold tracking-tight text-white">
            ShopPulse
          </span>
        </div>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-300 transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-slate-300 transition-colors hover:text-white"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-brand-emerald px-5 py-2.5 text-sm font-semibold text-brand-slate shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-shadow hover:shadow-[0_0_30px_rgba(16,185,129,0.75)]"
          >
            Get Started Free
          </Link>
        </div>
      </nav>

      <div className="relative z-10 mx-auto max-w-4xl px-6 pb-24 pt-12 text-center lg:px-8 lg:pt-16">
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
          Eliminate Field Labor Fraud{" "}
          <span className="text-brand-emerald">& Customer Disputes</span>{" "}
          Forever
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
          Stop losing revenue to unverified hours and chargebacks. ShopPulse
          enforces live, GPS-tagged photo proof on every job — trusted by
          service businesses across the{" "}
          <span className="text-white">US, AU, UK, and EU</span>.
        </p>

        {/* GIANT CENTER STAGE ANIMATION CARD */}
        <div className="relative mx-auto mt-12 max-w-3xl">
          <div className="relative overflow-hidden rounded-3xl border border-red-500/30 bg-brand-slate-light/60 p-8 shadow-[0_0_70px_rgba(239,68,68,0.25)] backdrop-blur sm:p-12">
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                background:
                  "radial-gradient(circle at 50% 0%, rgba(239,68,68,0.3), transparent 60%)",
              }}
              aria-hidden
            />

            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                🚨 ACTIVE LABOR LEAK ALERT
              </span>

              <motion.h2
                animate={{
                  textShadow: [
                    "0 0 20px rgba(239,68,68,0.35)",
                    "0 0 45px rgba(239,68,68,0.75)",
                    "0 0 20px rgba(239,68,68,0.35)",
                  ],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="mt-5 text-4xl font-extrabold tracking-tight text-red-400 sm:text-5xl lg:text-6xl"
              >
                THE CLOCK IS TICKING<span className="text-white">...</span>
              </motion.h2>
              <p className="mt-3 text-base text-slate-400 sm:text-lg">
                How much money have you lost today?
              </p>

              <div className="mt-8">
                <LaborLeakCounter />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3">
          <Link
            href="/signup"
            className="rounded-full bg-brand-emerald px-8 py-4 text-base font-semibold text-brand-slate shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-shadow hover:shadow-[0_0_35px_rgba(16,185,129,0.75)]"
          >
            Get Started Free →
          </Link>
          <p className="text-sm text-slate-400">
            1 Owner + 1 Tech seat free forever. No credit card required.
          </p>
        </div>
      </div>
    </section>
  );
}
