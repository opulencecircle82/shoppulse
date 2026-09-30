"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Volume2,
  VolumeX,
  Navigation as NavigationIcon,
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  CornerUpLeft,
  CornerUpRight,
  RotateCw,
  Undo2,
  Flag,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { JobTicket } from "@/lib/supabase/types";
import { guardExternalLink } from "@/lib/tech/externalLinks";
import { getCurrentPosition, haversineDistanceMeters } from "@/lib/tech/gps";
import { subscribeToJobTickets } from "@/lib/realtime/jobTicketChanges";
import {
  fetchRoute,
  distanceToRouteMeters,
  formatDistance,
  formatDuration,
  speak,
  stopSpeaking,
  type Route,
  type LatLng,
} from "@/lib/tech/navigation";

const TechNavMap = dynamic(() => import("./TechNavMap"), {
  ssr: false,
  loading: () => <div className="flex-1 bg-white/5" />,
});

function mapsUrl(address: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

const STEP_ARRIVAL_METERS = 40;
const DESTINATION_ARRIVAL_METERS = 40;
const ANNOUNCE_FAR_METERS = 300;
const ANNOUNCE_NEAR_METERS = 50;
const OFF_ROUTE_METERS = 70;
const OFF_ROUTE_STREAK_TO_REROUTE = 3;

function TurnIcon({ instruction, className }: { instruction: string; className?: string }) {
  const text = instruction.toLowerCase();
  if (text.includes("arrived")) return <Flag className={className} />;
  if (text.includes("u-turn")) return <Undo2 className={className} />;
  if (text.includes("roundabout")) return <RotateCw className={className} />;
  if (text.includes("sharp left") || text.includes("turn left")) return <CornerUpLeft className={className} />;
  if (text.includes("sharp right") || text.includes("turn right")) return <CornerUpRight className={className} />;
  if (text.includes("bear left")) return <ArrowLeft className={className} />;
  if (text.includes("bear right")) return <ArrowRight className={className} />;
  return <ArrowUp className={className} />;
}

/**
 * In-app turn-by-turn navigation: a free OSRM-routed line on the map, a top banner with the next
 * instruction and distance to it, and the device's own text-to-speech reading each turn aloud —
 * ShopPulse's own stand-in for handing the technician off to Google Maps. Since OSRM's public demo
 * server has no uptime guarantee, every failure here (no route, lost signal) degrades to the same
 * "Open in Google Maps instead" link this screen replaced, never a dead end.
 *
 * Deliberately has no "close and go back" button once a route is showing — this stays open for the
 * whole trip, the same way the job itself only has one way forward at a time. The two ways out are
 * arriving (GPS auto-detect, or the "I've Arrived" button for when the pin's a little off) and the
 * job being cancelled or handed to someone else out from under the technician, caught here by its
 * own live subscription since the app-wide one only runs on the main tab screen.
 */
export default function TechNavigationScreen({
  ticket,
  onExit,
  onArrived,
  onCancelled,
}: {
  ticket: JobTicket;
  /** Only reachable before a route is showing at all (no pin, GPS denied, routing failed) — there is
   * no trip in progress yet to stay locked into. */
  onExit: () => void;
  /** Arrival confirmed (by GPS or by hand) — hands off into the job's Start Job / proof step. */
  onArrived: (ticket: JobTicket) => void;
  /** The job was cancelled or reassigned away from this technician while they were en route. */
  onCancelled: () => void;
}) {
  const destination = useMemo<LatLng | null>(
    () =>
      ticket.booking_latitude !== null && ticket.booking_longitude !== null
        ? { lat: ticket.booking_latitude, lng: ticket.booking_longitude }
        : null,
    [ticket.booking_latitude, ticket.booking_longitude]
  );

  const [route, setRoute] = useState<Route | null>(null);
  // Starts already resolved (no spinner) when there's no exact pin to route to at all, rather than
  // flipping it off from an effect once mounted.
  const [loading, setLoading] = useState(destination !== null);
  const [routeError, setRouteError] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [position, setPosition] = useState<LatLng | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [arrived, setArrived] = useState(false);
  const [muted, setMuted] = useState(false);

  // Read fresh inside the long-lived watchPosition/subscription callbacks below without having to
  // tear them down and re-subscribe every time one of these changes — onCancelled in particular is
  // an inline callback from the parent, a fresh function reference on every one of its renders, and
  // putting it directly in an effect's dependency array would re-subscribe (and re-run the immediate
  // check) on every single one of those renders instead of just once per navigation session.
  const mutedRef = useRef(muted);
  const routeRef = useRef<Route | null>(null);
  const stepIndexRef = useRef(0);
  const arrivedRef = useRef(false);
  const announcedRef = useRef<Set<string>>(new Set());
  const offRouteStreakRef = useRef(0);
  const onCancelledRef = useRef(onCancelled);
  useEffect(() => {
    mutedRef.current = muted;
    routeRef.current = route;
    stepIndexRef.current = stepIndex;
    arrivedRef.current = arrived;
    onCancelledRef.current = onCancelled;
  });

  const loadRoute = useCallback(
    async (from: LatLng) => {
      if (!destination) return;
      setLoading(true);
      setRouteError(false);
      const result = await fetchRoute(from, destination);
      setLoading(false);
      if (!result) {
        setRouteError(true);
        return;
      }
      setRoute(result);
      // Step 0 is OSRM's "depart" maneuver — its location IS the starting point, so there's nothing
      // ahead to drive toward or announce for it. Step 1 (or the final "arrive" step, on a route with
      // no turns at all) is the first real thing to navigate toward.
      setStepIndex(result.steps.length > 1 ? 1 : 0);
      announcedRef.current = new Set();
      offRouteStreakRef.current = 0;
    },
    [destination]
  );

  const handlePositionUpdate = useCallback((here: LatLng) => {
    const currentRoute = routeRef.current;
    if (!currentRoute || arrivedRef.current) return;

    const steps = currentRoute.steps;
    const idx = stepIndexRef.current;
    const step = steps[idx];
    if (!step) return;

    const distToManeuver = haversineDistanceMeters(here.lat, here.lng, step.location.lat, step.location.lng);
    const isLastStep = idx === steps.length - 1;

    const farKey = `${idx}-far`;
    const nearKey = `${idx}-near`;
    if (distToManeuver <= ANNOUNCE_FAR_METERS && !announcedRef.current.has(farKey)) {
      announcedRef.current.add(farKey);
      if (!mutedRef.current) speak(`In ${Math.round(distToManeuver / 10) * 10} meters, ${step.instruction}`);
    }
    if (distToManeuver <= ANNOUNCE_NEAR_METERS && !announcedRef.current.has(nearKey)) {
      announcedRef.current.add(nearKey);
      if (!mutedRef.current) speak(step.instruction);
    }

    if (isLastStep && distToManeuver <= DESTINATION_ARRIVAL_METERS) {
      setArrived(true);
      if (!mutedRef.current) speak("You have arrived at your destination.");
      return;
    }
    if (!isLastStep && distToManeuver <= STEP_ARRIVAL_METERS) {
      setStepIndex(idx + 1);
      return;
    }

    const offRoute = distanceToRouteMeters(here, currentRoute.geometry) > OFF_ROUTE_METERS;
    if (offRoute) {
      offRouteStreakRef.current += 1;
      if (offRouteStreakRef.current >= OFF_ROUTE_STREAK_TO_REROUTE) {
        offRouteStreakRef.current = 0;
        if (!mutedRef.current) speak("Recalculating route.");
        loadRoute(here);
      }
    } else {
      offRouteStreakRef.current = 0;
    }
  }, [loadRoute]);

  useEffect(() => {
    if (!destination) return;
    let cancelled = false;

    getCurrentPosition()
      .then((pos) => {
        if (cancelled) return;
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(here);
        loadRoute(here);
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
          setLocationError(true);
        }
      });

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(here);
        handlePositionUpdate(here);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 }
    );

    return () => {
      cancelled = true;
      navigator.geolocation.clearWatch(watchId);
      stopSpeaking();
    };
  }, [destination, loadRoute, handlePositionUpdate]);

  // The app-wide job poll/realtime subscription only runs while on the main tab screen (so it can
  // never yank a technician out of a job mid-checklist) — this screen is just as "not the main tab",
  // so without its own check here a job cancelled or reassigned while the technician is en route
  // would go completely unnoticed until they physically arrived.
  useEffect(() => {
    let active = true;

    async function checkStillMine() {
      const { data } = await supabase
        .from("job_tickets")
        .select("status, assigned_staff_id")
        .eq("id", ticket.id)
        .maybeSingle();
      if (!active || !data) return;
      if (data.status !== "SCHEDULED" || data.assigned_staff_id !== ticket.assigned_staff_id) {
        active = false;
        stopSpeaking();
        onCancelledRef.current();
      }
    }

    // Also checked once immediately, not just on the next live change — a job could already be
    // cancelled or reassigned by the time this screen opens (a reconnect after being offline, a
    // stale ticket passed in), and that shouldn't need to wait for a fresh event to be caught.
    checkStillMine();
    const stop = subscribeToJobTickets(`nav-${ticket.id}`, `id=eq.${ticket.id}`, checkStillMine);
    return () => {
      active = false;
      stop();
    };
    // onCancelled is read from onCancelledRef, not listed here, precisely so a fresh inline callback
    // from the parent on every render doesn't tear down and recreate this subscription each time.
  }, [ticket.id, ticket.assigned_staff_id]);

  const currentStep = route?.steps[stepIndex] ?? null;
  const distanceToNext = position && currentStep
    ? haversineDistanceMeters(position.lat, position.lng, currentStep.location.lat, currentStep.location.lng)
    : null;
  const remainingSteps = route ? route.steps.slice(stepIndex) : [];
  const remainingDistance = remainingSteps.reduce((sum, s) => sum + s.distanceMeters, 0);

  return (
    <main className="fixed inset-0 z-50 flex flex-col bg-brand-navy">
      {!destination || routeError || locationError ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <NavigationIcon className="h-10 w-10 text-slate-500" />
          <p className="mt-4 text-lg font-bold text-white">
            {locationError
              ? "Couldn't get your location"
              : !destination
                ? "No exact pin for this address"
                : "Couldn't load a route right now"}
          </p>
          <p className="mt-1.5 max-w-xs text-sm text-slate-400">
            {locationError
              ? "Make sure Location is turned on for ShopPulse, then try again."
              : "You can still get there with Google Maps."}
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            {locationError && (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex items-center gap-1.5 rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-white"
              >
                <RefreshCw className="h-4 w-4" /> Try again
              </button>
            )}
            <a
              href={mapsUrl(ticket.service_address)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={guardExternalLink}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-6 py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)]"
            >
              <NavigationIcon className="h-4 w-4" /> Open in Google Maps
            </a>
            <button type="button" onClick={onExit} className="text-sm font-semibold text-slate-400">
              Back
            </button>
          </div>
        </div>
      ) : loading ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
          <p className="text-sm text-slate-400">Finding the best route...</p>
        </div>
      ) : arrived ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-emerald/15">
            <Flag className="h-7 w-7 text-brand-emerald" />
          </span>
          <p className="mt-4 text-xl font-bold text-white">You&apos;ve arrived</p>
          <p className="mt-1.5 text-sm text-slate-400">{ticket.service_address}</p>
          <button
            type="button"
            onClick={() => onArrived(ticket)}
            className="mt-6 rounded-full bg-gradient-to-r from-brand-emerald to-brand-emerald-dark px-6 py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(16,185,129,0.35)]"
          >
            Start Job
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 bg-brand-blue px-4 py-4 shadow-lg">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
              <TurnIcon instruction={currentStep?.instruction ?? ""} className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold text-white">
                {currentStep?.instruction ?? "Continue"}
              </p>
              {distanceToNext !== null && (
                <p className="text-xs text-blue-100">in {formatDistance(distanceToNext)}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white"
              aria-label={muted ? "Unmute voice directions" : "Mute voice directions"}
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>

          <div className="relative flex-1">
            {route && <TechNavMap position={position} destination={destination} routeGeometry={route.geometry} />}
          </div>

          <div className="border-t border-white/10 bg-white/5 px-5 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">
                  {formatDuration((remainingDistance / (route?.distanceMeters || 1)) * (route?.durationSeconds || 0))}
                </p>
                <p className="text-xs text-slate-400">{formatDistance(remainingDistance)} remaining</p>
              </div>
              <a
                href={mapsUrl(ticket.service_address)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={guardExternalLink}
                className="text-xs font-semibold text-brand-sky"
              >
                Open in Google Maps
              </a>
            </div>
            {/* GPS auto-detects arrival within 40m — this is for when the pin's a little off (a big
                compound, weak signal) and the technician is really there before that triggers. */}
            <button
              type="button"
              onClick={() => {
                setArrived(true);
                stopSpeaking();
              }}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-white/10 py-2.5 text-sm font-semibold text-white"
            >
              <CheckCircle2 className="h-4 w-4" /> I&apos;ve Arrived
            </button>
          </div>
        </>
      )}
    </main>
  );
}
