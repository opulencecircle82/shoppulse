"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import LaborLeakCounter from "./LaborLeakCounter";
import CurvedLinesBackground from "@/components/ui/CurvedLinesBackground";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "About Us", href: "#about" },
  { label: "Pricing", href: "#pricing" },
];

export default function HeroVideoSection() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <section className="relative overflow-hidden bg-brand-navy">
      <CurvedLinesBackground />

      <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] w-full opacity-20 sm:h-[42rem] lg:h-[48rem]">
        <Image
          src="/images/hero-visual-cutout.png"
          alt=""
          fill
          sizes="100vw"
          className="object-contain object-top"
          priority
        />
      </div>

      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-orange text-white font-bold">
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
              className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="text-sm font-medium text-white transition-colors hover:text-slate-200"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-gradient-to-r from-amber-400 to-brand-orange-dark px-5 py-2.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(249,115,22,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(249,115,22,0.5)]"
          >
            Get Started Free
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-white md:hidden"
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {menuOpen && (
        <div className="relative z-10 mx-6 mb-2 flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/5 p-4 md:hidden">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              {link.label}
            </a>
          ))}
          <div className="mt-2 flex flex-col gap-2 border-t border-white/10 pt-3">
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              onClick={() => setMenuOpen(false)}
              className="rounded-full bg-gradient-to-r from-amber-400 to-brand-orange-dark px-5 py-2.5 text-center text-sm font-bold text-white"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      )}

      <div className="relative z-10 mx-auto max-w-4xl px-6 pb-24 pt-12 text-center lg:px-8 lg:pt-16">
        <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
          Eliminate Field Labor Fraud{" "}
          <span className="text-brand-orange">& Customer Disputes</span> Forever
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
          Stop losing revenue to unverified hours and chargebacks. ShopPulse
          enforces live, GPS-tagged photo proof on every job — trusted by
          service businesses across the{" "}
          <span className="text-white">US, AU, UK, and EU</span>.
        </p>

        {/* GIANT CENTER STAGE ANIMATION CARD */}
        <div className="relative mx-auto mt-12 max-w-3xl">
          <div
            className="relative overflow-hidden rounded-3xl border-2 border-[#38BDF8] p-8 shadow-2xl shadow-black/40 sm:p-12"
            style={{ backgroundColor: "#BAE6FD" }}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                background:
                  "radial-gradient(circle at 50% 0%, rgba(37,99,235,0.15), transparent 60%)",
              }}
              aria-hidden
            />

            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-brand-orange-dark px-3 py-1 text-xs font-bold text-brand-navy">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-navy opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-navy" />
                </span>
                🚨 ACTIVE LABOR LEAK ALERT
              </span>

              <motion.h2
                animate={{
                  textShadow: [
                    "0 0 16px rgba(15,23,42,0.08)",
                    "0 0 32px rgba(249,115,22,0.25)",
                    "0 0 16px rgba(15,23,42,0.08)",
                  ],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="mt-5 text-4xl font-extrabold tracking-tight text-brand-navy sm:text-5xl lg:text-6xl"
              >
                THE CLOCK IS TICKING
                <span className="text-brand-orange">...</span>
              </motion.h2>
              <p className="mt-3 text-base text-slate-800 sm:text-lg">
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
            className="rounded-full bg-gradient-to-r from-amber-400 to-brand-orange-dark px-8 py-4 text-base font-bold text-white shadow-[0_0_25px_rgba(249,115,22,0.35)] transition-shadow hover:shadow-[0_0_35px_rgba(249,115,22,0.5)]"
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
