"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { UPDATE_APP_EVENT } from "@/lib/tech/externalLinks";

const SHOW_MS = 8000;

/**
 * A short notice at the bottom of the screen, shown when a technician taps Maps, Call or Text in an
 * older copy of the Android app (see guardExternalLink) — those copies can't open other apps.
 */
export default function UpdateAppNotice() {
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function show() {
      setVisible(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setVisible(false), SHOW_MS);
    }
    window.addEventListener(UPDATE_APP_EVENT, show);
    return () => {
      window.removeEventListener(UPDATE_APP_EVENT, show);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-24 z-[2000] mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-brand-orange/40 bg-brand-navy p-4 shadow-2xl shadow-black/50"
    >
      <Download className="mt-0.5 h-5 w-5 shrink-0 text-brand-orange" />
      <div>
        <p className="text-sm font-bold text-white">Update the ShopPulse app</p>
        <p className="mt-0.5 text-xs text-slate-300">
          This version can&apos;t open Maps, calls or texts from here. Ask your owner for the new download link.
        </p>
      </div>
    </div>
  );
}
