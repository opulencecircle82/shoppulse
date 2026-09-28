import { formatJobNumber } from "@/lib/jobNumber";
import { submitCompletionProof, submitStartProof } from "./jobActions";
import { uploadJobPhoto, uploadSignature } from "./uploadJobPhoto";

/**
 * Proof the technician submitted without signal is kept on the phone (IndexedDB) and sent by itself the moment the
 * phone is online again — photo, GPS, the time it was taken and (at the end) the signature travel together, so
 * nothing has to be taken again. It is the same send that runs when there IS signal; only the waiting differs.
 */

export type ProofStage = "START" | "COMPLETE";

export type PendingProof = {
  /** One waiting proof per job and stage: `${ticketId}:${stage}`. */
  key: string;
  ticketId: string;
  shopId: string;
  /** The technician who took it: on a shared phone, one person's saved proof is never sent by another's sign-in. */
  staffId: string;
  stage: ProofStage;
  /** "#JOB-0004", for the message if the job changed while the phone was offline. */
  jobLabel: string;
  photo: Blob | null;
  photoHash: string | null;
  /** Set as soon as the photo has reached the server, so a retry never uploads it twice. */
  photoUrl: string | null;
  signatureDataUrl: string | null;
  signatureUrl: string | null;
  geofenceDistanceM: number | null;
  latitude: number | null;
  longitude: number | null;
  /** When the technician took the photo and tapped submit — this, not the time of sending, becomes the job's start/finish time. */
  capturedAt: string;
  queuedAt: string;
  attempts: number;
  lastError: string | null;
};

export function newPendingProof(input: {
  ticketId: string;
  shopId: string;
  staffId: string;
  jobNumber: number | null;
  stage: ProofStage;
  photo: Blob | null;
  photoHash: string | null;
  signatureDataUrl: string | null;
  geofenceDistanceM: number | null;
  latitude: number | null;
  longitude: number | null;
  capturedAt: Date;
}): PendingProof {
  return {
    key: `${input.ticketId}:${input.stage}`,
    ticketId: input.ticketId,
    shopId: input.shopId,
    staffId: input.staffId,
    stage: input.stage,
    jobLabel: formatJobNumber(input.jobNumber, input.ticketId),
    photo: input.photo,
    photoHash: input.photoHash,
    photoUrl: null,
    signatureDataUrl: input.signatureDataUrl,
    signatureUrl: null,
    geofenceDistanceM: input.geofenceDistanceM,
    latitude: input.latitude,
    longitude: input.longitude,
    capturedAt: input.capturedAt.toISOString(),
    queuedAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
  };
}

/** The phone has no signal (or the request timed out) — as opposed to the server saying no. */
export function isOfflineError(error: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const text =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);
  return /failed to fetch|networkerror|network request failed|network error|load failed|timed out|timeout|err_internet|err_network/i.test(
    text
  );
}

/**
 * Uploads the photo (and signature), then records the proof on the job — only if the job is still at the stage
 * this proof was for. Returns "skipped" when it isn't (cancelled, or already updated), so an old proof can never
 * push a finished job backwards. Progress (the uploaded photo's link) is written onto `proof` as it happens.
 */
export async function sendProof(proof: PendingProof): Promise<"sent" | "skipped"> {
  if (proof.photo && !proof.photoUrl) {
    proof.photoUrl = await uploadJobPhoto(proof.shopId, proof.ticketId, proof.photo);
  }

  if (proof.stage === "START") {
    const applied = await submitStartProof({
      ticketId: proof.ticketId,
      photoUrl: proof.photoUrl,
      photoHash: proof.photoHash,
      geofenceDistanceM: proof.geofenceDistanceM,
      latitude: proof.latitude,
      longitude: proof.longitude,
      capturedAt: proof.capturedAt,
      onlyIfStatus: "SCHEDULED",
    });
    return applied ? "sent" : "skipped";
  }

  if (proof.signatureDataUrl && !proof.signatureUrl) {
    proof.signatureUrl = await uploadSignature(proof.shopId, proof.ticketId, proof.signatureDataUrl);
  }
  const applied = await submitCompletionProof({
    ticketId: proof.ticketId,
    photoUrl: proof.photoUrl,
    photoHash: proof.photoHash,
    geofenceDistanceM: proof.geofenceDistanceM,
    latitude: proof.latitude,
    longitude: proof.longitude,
    signatureUrl: proof.signatureUrl,
    capturedAt: proof.capturedAt,
    onlyIfStatus: "IN_PROGRESS",
  });
  return applied ? "sent" : "skipped";
}

// ---- Storage on the phone ------------------------------------------------------------------------------------

const DB_NAME = "shoppulse-tech";
const STORE = "proof-outbox";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("This phone can't keep proof for later."));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "key" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Couldn't open the phone's storage."));
  });
}

async function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = work(transaction.objectStore(STORE));
    transaction.oncomplete = () => {
      db.close();
      resolve(request.result);
    };
    transaction.onerror = transaction.onabort = () => {
      db.close();
      reject(transaction.error ?? new Error("The phone's storage failed."));
    };
  });
}

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

/** Runs `listener` whenever the waiting list changes. */
export function subscribeOutbox(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** What is waiting on this phone, oldest first — for one technician when `staffId` is given. */
export async function loadPendingProofs(staffId?: string): Promise<PendingProof[]> {
  const all = await run<PendingProof[]>("readonly", (store) => store.getAll());
  return all
    .filter((proof) => staffId === undefined || proof.staffId === staffId)
    .sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
}

/** Keeps the proof on the phone. Resolves false when the phone can't store it (then the caller shows the error). */
export async function savePendingProof(proof: PendingProof): Promise<boolean> {
  try {
    await run("readwrite", (store) => store.put(proof));
    notify();
    return true;
  } catch {
    return false;
  }
}

async function removePendingProof(key: string): Promise<void> {
  await run("readwrite", (store) => store.delete(key));
}

// ---- Sending what is waiting ---------------------------------------------------------------------------------

export type FlushResult = {
  sent: number;
  /** Proofs dropped because the job had moved on (cancelled or already updated). */
  skipped: PendingProof[];
  offline: boolean;
};

let flushing: Promise<FlushResult> | null = null;

/** Sends what this technician has waiting, oldest first. Safe to call from anywhere, any number of times: one run at a time. */
export function flushPendingProofs(staffId: string): Promise<FlushResult> {
  if (!flushing) {
    flushing = doFlush(staffId).finally(() => {
      flushing = null;
    });
  }
  return flushing;
}

async function doFlush(staffId: string): Promise<FlushResult> {
  const result: FlushResult = { sent: 0, skipped: [], offline: false };

  let waiting: PendingProof[];
  try {
    waiting = await loadPendingProofs(staffId);
  } catch {
    return result;
  }

  for (const proof of waiting) {
    try {
      const outcome = await sendProof(proof);
      await removePendingProof(proof.key);
      if (outcome === "sent") result.sent += 1;
      else result.skipped.push(proof);
    } catch (error) {
      const offline = isOfflineError(error);
      if (!offline) {
        proof.attempts += 1;
        proof.lastError = error instanceof Error ? error.message : "It couldn't be sent.";
      }
      await run("readwrite", (store) => store.put(proof)).catch(() => undefined);
      if (offline) {
        result.offline = true;
        break;
      }
    }
  }

  notify();
  return result;
}
