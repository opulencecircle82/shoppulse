import { Camera, TriangleAlert } from "lucide-react";

export default function AboutSection() {
  return (
    <section id="about" className="bg-brand-navy py-24">
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-brand-navy px-3 py-1 text-xs font-medium text-sky-400">
            About ShopPulse
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Built for the businesses that live in the field
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-300">
            ShopPulse is built specifically for field service owners —
            cleaning, HVAC, plumbing, landscaping, and mobile auto — to
            eliminate profit leaks, time theft, and customer chargebacks.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-red-500/20 bg-white/5 p-8">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/15 text-red-400">
              <TriangleAlert className="h-5 w-5" />
            </span>
            <h3 className="mt-5 text-lg font-semibold text-white">
              The Problem
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Unverified field staff logging fake hours, manual timesheets
              open to tampering, and unproven job completion — leading
              directly to client disputes and withheld payments.
            </p>
          </div>

          <div className="rounded-2xl border border-brand-blue/20 bg-white/5 p-8">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-blue/15 text-brand-blue">
              <Camera className="h-5 w-5" />
            </span>
            <h3 className="mt-5 text-lg font-semibold text-white">
              The Solution
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Hardware-enforced proof-of-work requiring real-time camera
              capture and PostGIS-backed GPS verification before any job
              ticket can be closed.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
