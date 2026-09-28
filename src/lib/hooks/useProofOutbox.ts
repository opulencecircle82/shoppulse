"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  flushPendingProofs,
  loadPendingProofs,
  subscribeOutbox,
  type PendingProof,
} from "@/lib/tech/proofOutbox";

const RETRY_MS = 20_000;

/**
 * Keeps the technician's waiting proof moving: tries to send it when the app opens, the moment the phone comes back
 * online, when the app returns to the screen, and every few seconds while anything is still waiting. `onSent` runs
 * after something went through so the job list can refresh.
 */
export function useProofOutbox({ staffId, onSent }: { staffId: string | null; onSent: () => void }) {
  const [pending, setPending] = useState<PendingProof[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const onSentRef = useRef(onSent);

  useEffect(() => {
    onSentRef.current = onSent;
  }, [onSent]);

  const reload = useCallback(() => {
    if (!staffId) return;
    loadPendingProofs(staffId)
      .then(setPending)
      .catch(() => setPending([]));
  }, [staffId]);

  const sendNow = useCallback(async () => {
    if (!staffId) return;
    const result = await flushPendingProofs(staffId);
    if (result.skipped.length > 0) {
      const labels = result.skipped.map((proof) => proof.jobLabel).join(", ");
      setNotice(
        `${labels} changed while you were offline (cancelled or already updated), so the proof you saved for it wasn't needed.`
      );
    }
    if (result.sent + result.skipped.length > 0) onSentRef.current();
  }, [staffId]);

  useEffect(() => {
    if (!staffId) return;
    const first = setTimeout(() => {
      reload();
      sendNow();
    }, 0);
    const stopListening = subscribeOutbox(reload);
    const handleVisible = () => {
      if (document.visibilityState === "visible") sendNow();
    };
    window.addEventListener("online", sendNow);
    document.addEventListener("visibilitychange", handleVisible);
    const interval = setInterval(sendNow, RETRY_MS);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
      stopListening();
      window.removeEventListener("online", sendNow);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, [staffId, reload, sendNow]);

  return { pending, notice, dismissNotice: () => setNotice(null), sendNow };
}
