import Link from "next/link";

const FOOTER_LINKS = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Support", href: "/support" },
];

export default function Footer() {
  return (
    <footer className="bg-brand-navy">
      <div className="mx-auto max-w-4xl px-6 py-20 text-center lg:px-8">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Ready to eliminate labor fraud?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300">
          Get started free — no credit card required, live in minutes.
        </p>
        <Link
          href="/signup"
          className="mt-8 inline-block rounded-full bg-brand-orange px-8 py-4 text-base font-bold text-white shadow-[0_0_25px_rgba(249,115,22,0.35)] transition-shadow hover:shadow-[0_0_35px_rgba(249,115,22,0.5)]"
        >
          Get Started Free →
        </Link>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-10 text-center sm:flex-row sm:justify-between sm:text-left lg:px-8">
          <p className="text-sm text-slate-400">
            © 2026 ShopPulse. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-slate-400 transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
