"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CircleQuestionMark } from "lucide-react";

/**
 * A small (?) button that opens a popover with longer explanatory copy, so
 * a section title can stay one clean line instead of carrying a paragraph.
 */
export default function HelpTip({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <span ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors before:absolute before:-inset-2 before:content-[''] hover:bg-slate-200/70 hover:text-brand-blue focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:outline-none"
      >
        <CircleQuestionMark className="h-[18px] w-[18px]" />
      </button>
      {open && (
        <div
          role="tooltip"
          className="absolute left-1/2 top-full z-30 mt-2 w-[min(24rem,80vw)] -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-4 text-left text-xs leading-relaxed text-slate-600 shadow-xl shadow-slate-900/10"
        >
          {children}
        </div>
      )}
    </span>
  );
}
