"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { DASHBOARD_TABS, type DashboardTabId } from "./DashboardSidebarNav";

const SUPPORT_EMAIL = "support@shoppulse.com";

const DASHBOARD_LINKS: DashboardTabId[] = ["home", "board", "map", "proof", "staff", "messages"];
const BUSINESS_LINKS: DashboardTabId[] = ["services", "reviews", "ads", "mobile"];

const PAGE_LINKS = [
  { label: "Business Settings", href: "/dashboard/settings" },
  { label: "Edit Free Website", href: "/dashboard/website" },
];

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Support", href: "/support" },
];

const LINK_CLASS =
  "flex min-h-11 items-center text-sm text-slate-400 transition-colors hover:text-white sm:min-h-0 sm:py-1";

function tabLabel(id: DashboardTabId) {
  return DASHBOARD_TABS.find((tab) => tab.id === id)?.label ?? id;
}

export default function DashboardFooter({
  onSelectTab,
}: {
  onSelectTab: (tab: DashboardTabId) => void;
}) {
  function goToTab(id: DashboardTabId) {
    onSelectTab(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <footer className="mt-12 bg-brand-navy">
      <div className="mx-auto max-w-[1600px] px-6 py-12 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-orange text-sm font-bold text-white">
                SP
              </span>
              <span className="text-lg font-semibold tracking-tight text-white">ShopPulse</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
              Live camera and GPS proof of work for field service owners, so every hour and every
              invoice is backed by evidence.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white">Dashboard</p>
            <ul className="mt-3 space-y-0.5">
              {DASHBOARD_LINKS.map((id) => (
                <li key={id}>
                  <button type="button" onClick={() => goToTab(id)} className={LINK_CLASS}>
                    {tabLabel(id)}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white">Your Business</p>
            <ul className="mt-3 space-y-0.5">
              {BUSINESS_LINKS.map((id) => (
                <li key={id}>
                  <button type="button" onClick={() => goToTab(id)} className={LINK_CLASS}>
                    {tabLabel(id)}
                  </button>
                </li>
              ))}
              {PAGE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={LINK_CLASS}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white">Contact</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Questions about your account, billing, or the mobile apps? Email us and we will
              reply as soon as we can.
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mt-3 flex min-h-11 items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white sm:min-h-0 sm:py-1"
            >
              <Mail className="h-4 w-4 shrink-0" />
              {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div className="flex flex-wrap items-center gap-x-6">
            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex min-h-11 items-center text-xs text-slate-400 transition-colors hover:text-white sm:min-h-0 sm:py-2"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} ShopPulse. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
