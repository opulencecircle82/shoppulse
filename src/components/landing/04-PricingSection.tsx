"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

const CURRENCIES = [
  { code: "USD", symbol: "$" },
  { code: "AUD", symbol: "$" },
  { code: "GBP", symbol: "£" },
  { code: "EUR", symbol: "€" },
] as const;

type CurrencyCode = (typeof CURRENCIES)[number]["code"];

const FREE_INCLUDES = [
  "1 Owner + 1 Technician seat",
  "Full web dashboard access",
  "Unlimited job ticketing",
  "Basic GPS tracking",
  "Invoice generator",
];

const ADD_ONS = [
  {
    name: "Additional Staff Seats",
    price: "29 one-time + 25/mo",
    unit: "per seat",
    description: "Add technicians or managers as your team grows.",
  },
  {
    name: "Quality Booster",
    price: "+5/mo",
    unit: "",
    description:
      "Hardware camera enforcement & auto-watermarked photo proof.",
  },
  {
    name: "Marketing Suite",
    price: "+50/mo",
    unit: "",
    description: "Whitelabel hosted business site & Local Ad Network placement.",
  },
];

export default function PricingSection() {
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const symbol = CURRENCIES.find((c) => c.code === currency)!.symbol;

  return (
    <section id="pricing" className="bg-brand-navy py-24">
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-brand-navy px-3 py-1 text-xs font-medium text-sky-400">
            Pricing
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Free forever. Scale when you&apos;re ready.
          </h2>
        </div>

        <div className="mt-8 flex justify-center">
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
            {CURRENCIES.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => setCurrency(c.code)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  currency === c.code
                    ? "bg-brand-blue text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {c.code} ({c.symbol})
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 mx-auto max-w-md rounded-2xl border border-brand-blue/40 bg-white/5 p-8 shadow-[0_0_40px_rgba(37,99,235,0.15)]">
          <span className="rounded-full bg-brand-blue/15 px-3 py-1 text-xs font-semibold text-brand-blue">
            Free Forever
          </span>
          <p className="mt-4 text-4xl font-bold text-white">
            {symbol}0<span className="text-lg font-medium text-slate-400">/mo</span>
          </p>
          <ul className="mt-6 space-y-3">
            {FREE_INCLUDES.map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-slate-300">
                <Check className="h-4 w-4 shrink-0 text-brand-blue" />
                {item}
              </li>
            ))}
          </ul>
          <Link
            href="/signup"
            className="mt-8 block rounded-full bg-brand-orange px-6 py-3 text-center text-sm font-bold text-white shadow-[0_0_20px_rgba(249,115,22,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(249,115,22,0.5)]"
          >
            Get Started Free
          </Link>
        </div>

        <div className="mt-12">
          <p className="text-center text-sm font-medium uppercase tracking-widest text-slate-400">
            Scalable add-ons
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {ADD_ONS.map((addon) => (
              <div
                key={addon.name}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-md shadow-black/20"
              >
                <h3 className="text-sm font-semibold text-white">{addon.name}</h3>
                <p className="mt-2 text-lg font-bold text-brand-blue">
                  {symbol}
                  {addon.price}
                  {addon.unit && (
                    <span className="ml-1 text-xs font-medium text-slate-400">
                      {addon.unit}
                    </span>
                  )}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {addon.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
