import { distanceKm } from "@/lib/geo/distance";
import { formatJobNumber } from "@/lib/jobNumber";

/** One row of `job_tickets_map_view`. */
export type MapRow = {
  id: string;
  client_name: string;
  staff_name: string | null;
  status: string;
  service_address: string;
  start_lat: number | null;
  start_lng: number | null;
  end_lat: number | null;
  end_lng: number | null;
  job_number: number | null;
  service_type: string;
  booking_latitude: number | null;
  booking_longitude: number | null;
};

export type MapJob = {
  id: string;
  label: string;
  service: string;
  stage: string;
  tech: string | null;
  open: boolean;
};

/** One client's spot on the owner's map — however many of their jobs are (or were) there. */
export type MapPlace = {
  key: string;
  clientName: string;
  address: string;
  lat: number;
  lng: number;
  /** Open jobs first, then the newest finished ones. */
  jobs: MapJob[];
  hasOpen: boolean;
  /** A technician has captured proof photos at one of these jobs, so the geofence ring applies. */
  hasProof: boolean;
};

export const OPEN_JOB_STAGE: Record<string, string> = {
  PENDING: "Awaiting your approval",
  UNASSIGNED: "Needs a technician",
  SCHEDULED: "Scheduled",
  ESTIMATE_PENDING: "Technician on site",
  IN_PROGRESS: "Work in progress",
};

const FINISHED_STAGE: Record<string, string> = {
  COMPLETED: "Finished — needs your review",
  APPROVED: "Completed",
  DISPUTED: "Disputed",
};

/** Two jobs for the same client this close together are the same place (the customer's door vs. where the technician stood). */
const SAME_PLACE_METERS = 150;

/**
 * Turns the job rows into map places: ONE pin per client per spot. A client with an open request and a
 * finished job from last week — booked to the same address — used to show two pins (the address and where
 * the technician took the proof photo); now both jobs sit under one pin, open jobs listed first.
 * Cancelled and declined requests never get a pin.
 */
export function buildMapPlaces(rows: MapRow[]): MapPlace[] {
  const places: MapPlace[] = [];

  // Open jobs first, so their booked address is what a place is anchored to.
  const sorted = [...rows].sort((a, b) => {
    const openDiff = Number(b.status in OPEN_JOB_STAGE) - Number(a.status in OPEN_JOB_STAGE);
    return openDiff || (b.job_number ?? 0) - (a.job_number ?? 0);
  });

  for (const row of sorted) {
    const open = row.status in OPEN_JOB_STAGE;
    if (!open && !(row.status in FINISHED_STAGE)) continue;

    const proofLat = row.end_lat ?? row.start_lat;
    const proofLng = row.end_lng ?? row.start_lng;
    const hasProof = proofLat !== null && proofLng !== null;
    const lat = row.booking_latitude ?? proofLat;
    const lng = row.booking_longitude ?? proofLng;
    if (lat === null || lng === null) continue;

    const job: MapJob = {
      id: row.id,
      label: formatJobNumber(row.job_number, row.id),
      service: row.service_type,
      stage: open ? OPEN_JOB_STAGE[row.status] : FINISHED_STAGE[row.status],
      tech: row.staff_name,
      open,
    };

    const name = (row.client_name || "").trim().toLowerCase();
    const existing = places.find(
      (place) =>
        place.clientName.trim().toLowerCase() === name &&
        distanceKm({ lat: place.lat, lng: place.lng }, { lat, lng }) * 1000 <= SAME_PLACE_METERS
    );

    if (existing) {
      existing.jobs.push(job);
      existing.hasOpen = existing.hasOpen || open;
      existing.hasProof = existing.hasProof || hasProof;
    } else {
      places.push({
        key: row.id,
        clientName: row.client_name || "Unnamed",
        address: row.service_address,
        lat,
        lng,
        jobs: [job],
        hasOpen: open,
        hasProof,
      });
    }
  }

  return places;
}
