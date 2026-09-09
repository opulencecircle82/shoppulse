import { Camera, MapPin, ShieldCheck, TrendingUp } from "lucide-react";

const FEATURES = [
  {
    icon: Camera,
    title: "Mandatory Live Camera Proof",
    description:
      "Hardware-restricted capture disables device photo gallery uploads, so field staff can't submit pre-existing photos to fake a job.",
  },
  {
    icon: MapPin,
    title: "Real-Time GPS Geofencing & Location Tagging",
    description:
      "Every start and end photo is stamped with precise, PostGIS-backed GPS coordinates to confirm technicians were actually on-site.",
  },
  {
    icon: ShieldCheck,
    title: "Automated Client Approval & Dispute Gate",
    description:
      "Clients review time-stamped, watermarked before/after photos and approve payment or file a dispute before invoices are finalized.",
  },
  {
    icon: TrendingUp,
    title: "Integrated Growth & Google Review Automation Engine",
    description:
      "Every approved job triggers automated review requests and unlocks non-competing local ad placements to drive recurring revenue.",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="bg-brand-navy py-24">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-orange/30 bg-orange-500/10 px-3 py-1 text-xs font-medium text-brand-orange">
            Features
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Everything you need to enforce proof-of-work
          </h2>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-md shadow-black/20 transition-all hover:border-brand-orange/40 hover:shadow-xl hover:shadow-orange-500/10"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-orange-500/15 text-brand-orange">
                <feature.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-lg font-semibold text-white">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
