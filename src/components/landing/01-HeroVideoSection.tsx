"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import LaborLeakCounter from "./LaborLeakCounter";
import CurvedLinesBackground from "@/components/ui/CurvedLinesBackground";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "About Us", href: "#about" },
  { label: "Pricing", href: "#pricing" },
];

export default function HeroVideoSection() {
  return (
    <section className="relative overflow-hidden bg-brand-slate">
      <CurvedLinesBackground />

      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-blue text-white font-bold">
            SP
          </span>
          <span className="text-lg font-semibold tracking-tight text-slate-900">
            ShopPulse
          </span>
        </div>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]"
          >
            Get Started Free
          </Link>
        </div>
      </nav>

      <div className="relative z-10 mx-auto max-w-4xl px-6 pb-24 pt-12 text-center lg:px-8 lg:pt-16">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
          Eliminate Field Labor Fraud{" "}
          <span className="text-brand-blue">& Customer Disputes</span> Forever
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
          Stop losing revenue to unverified hours and chargebacks. ShopPulse
          enforces live, GPS-tagged photo proof on every job — trusted by
          service businesses across the{" "}
          <span className="text-slate-900">US, AU, UK, and EU</span>.
        </p>

        {/* GIANT CENTER STAGE ANIMATION CARD */}
        <div className="relative mx-auto mt-12 max-w-3xl">
          <div className="relative overflow-hidden rounded-3xl bg-brand-slate-light p-8 shadow-2xl shadow-red-500/10 ring-1 ring-red-500/20 backdrop-blur sm:p-12">
            <div
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{
                background:
                  "radial-gradient(circle at 50% 0%, rgba(239,68,68,0.15), transparent 60%)",
              }}
              aria-hidden
            />

            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                🚨 ACTIVE LABOR LEAK ALERT
              </span>

              <motion.h2
                animate={{
                  textShadow: [
                    "0 0 16px rgba(239,68,68,0.15)",
                    "0 0 32px rgba(239,68,68,0.35)",
                    "0 0 16px rgba(239,68,68,0.15)",
                  ],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="mt-5 text-4xl font-extrabold tracking-tight text-red-600 sm:text-5xl lg:text-6xl"
              >
                THE CLOCK IS TICKING
                <span className="text-slate-900">...</span>
              </motion.h2>
              <p className="mt-3 text-base text-slate-500 sm:text-lg">
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
            className="rounded-full bg-brand-blue px-8 py-4 text-base font-semibold text-white shadow-[0_0_25px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_35px_rgba(37,99,235,0.5)]"
          >
            Get Started Free →
          </Link>
          <p className="text-sm text-slate-500">
            1 Owner + 1 Tech seat free forever. No credit card required.
          </p>
        </div>
      </div>
    </section>
  );
}
