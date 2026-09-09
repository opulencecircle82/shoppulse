"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MapPin } from "lucide-react";

const SCENARIOS = [
  { text: "Tech clocked in 2 miles away from job site", amount: 35 },
  { text: "Unverified early checkout — Left 1 hour early", amount: 45 },
  { text: "Customer dispute: No before/after photo proof", amount: 120 },
  { text: "Manual timesheet edit — 45 mins unworked labor", amount: 30 },
] as const;

const TICK_MS = 2500;

function formatLoss(amount: number) {
  return `-$${amount.toFixed(2)}`;
}

export default function LaborLeakCounter() {
  const [index, setIndex] = useState(0);
  const [total, setTotal] = useState<number>(SCENARIOS[0].amount);
  const [showBadge, setShowBadge] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => {
        const next = (prev + 1) % SCENARIOS.length;
        setTotal((t) => t + SCENARIOS[next].amount);
        if (next === 0) setShowBadge(true);
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(interval);
  }, []);

  const active = SCENARIOS[index];

  return (
    <div>
      <div className="min-h-[4.5rem] sm:min-h-[4rem]">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex items-start justify-center gap-2.5 text-left sm:items-center"
          >
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="mt-0.5 shrink-0 text-brand-orange sm:mt-0"
              aria-hidden
            >
              <MapPin className="h-5 w-5" />
            </motion.span>
            <div>
              <p className="text-base font-medium leading-snug text-slate-700">
                {active.text}
              </p>
              <span className="mt-1 inline-block rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600">
                +${active.amount.toFixed(2)} loss
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-6 border-t border-slate-200 pt-6 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
          Total Lost This Session
        </p>
        <AnimatePresence mode="popLayout">
          <motion.span
            key={total}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="mt-1 block font-mono text-5xl font-bold tabular-nums text-brand-orange sm:text-6xl"
          >
            {formatLoss(total)}
          </motion.span>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showBadge && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mt-6"
          >
            <motion.p
              animate={{ opacity: [1, 0.7, 1] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center text-sm font-semibold text-brand-emerald"
            >
              ShopPulse Enforces Live Camera + GPS Proof — Eliminating these 4
              leaks automatically.
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
