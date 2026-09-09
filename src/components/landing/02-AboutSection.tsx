import Image from "next/image";
import { Camera, TriangleAlert } from "lucide-react";

export default function AboutSection() {
  return (
    <section id="about" className="bg-brand-slate py-24">
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-blue/30 bg-brand-sky/10 px-3 py-1 text-xs font-medium text-brand-blue">
            About ShopPulse
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Built for the businesses that live in the field
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            ShopPulse is built specifically for field service owners —
            cleaning, HVAC, plumbing, landscaping, and mobile auto — to
            eliminate profit leaks, time theft, and customer chargebacks.
          </p>
        </div>

        <div className="relative mx-auto mt-12 aspect-[16/9] max-w-4xl overflow-hidden rounded-3xl shadow-xl shadow-slate-900/10">
          <Image
            src="/images/hero-visual.jpg"
            alt="Field technicians reviewing a job on ShopPulse from the job site"
            fill
            sizes="(min-width: 1024px) 896px, 100vw"
            className="object-cover"
            priority={false}
          />
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-red-500/20 bg-brand-slate-light/40 p-8">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/15 text-red-400">
              <TriangleAlert className="h-5 w-5" />
            </span>
            <h3 className="mt-5 text-lg font-semibold text-slate-900">
              The Problem
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Unverified field staff logging fake hours, manual timesheets
              open to tampering, and unproven job completion — leading
              directly to client disputes and withheld payments.
            </p>
          </div>

          <div className="rounded-2xl border border-brand-blue/20 bg-brand-slate-light/40 p-8">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-blue/15 text-brand-blue">
              <Camera className="h-5 w-5" />
            </span>
            <h3 className="mt-5 text-lg font-semibold text-slate-900">
              The Solution
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
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
