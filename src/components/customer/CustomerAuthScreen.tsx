"use client";

import { useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import { signInCustomer, signUpCustomer } from "@/lib/customer/customerAuth";
import { COUNTRIES } from "@/lib/location/countries";
import { PHILIPPINES_REGIONS } from "@/lib/location/philippinesRegions";

const LocationPickerMap = dynamic(
  () => import("@/components/shared/LocationPickerMap"),
  { ssr: false, loading: () => <p className="text-sm text-slate-500">Loading map...</p> }
);

export default function CustomerAuthScreen({ onSignedIn }: { onSignedIn: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("Philippines");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [barangay, setBarangay] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmEmailSent, setConfirmEmailSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "signup") {
        const { needsEmailConfirmation } = await signUpCustomer({
          fullName,
          email,
          phone,
          password,
          country,
          region,
          city,
          barangay,
          latitude,
          longitude,
        });
        if (needsEmailConfirmation) {
          setConfirmEmailSent(true);
          return;
        }
      } else {
        await signInCustomer(email, password);
      }
      onSignedIn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (confirmEmailSent) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-blue text-lg font-bold text-white">
          SP
        </span>
        <h1 className="mt-4 text-xl font-bold text-slate-900">Check your email</h1>
        <p className="mt-1.5 max-w-xs text-sm text-slate-500">
          We sent a confirmation link to {email}. Open it, then come back here
          and log in.
        </p>
        <button
          type="button"
          onClick={() => {
            setConfirmEmailSent(false);
            setMode("login");
          }}
          className="mt-6 rounded-full bg-brand-blue px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/30"
        >
          Back to Log In
        </button>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-blue text-lg font-bold text-white mx-auto">
            SP
          </span>
          <h1 className="mt-4 text-xl font-bold text-slate-900">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            {mode === "signup"
              ? "Book jobs and track proof from any shop using ShopPulse."
              : "Sign in to see your jobs and book new ones."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-3">
          {mode === "signup" && (
            <>
              <input
                type="text"
                required
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none"
              />
              <input
                type="tel"
                placeholder="Phone (optional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none"
              />

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    setRegion("");
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-brand-blue focus:outline-none"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                {country === "Philippines" ? (
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-brand-blue focus:outline-none"
                  >
                    <option value="">Region</option>
                    {PHILIPPINES_REGIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Region/State"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Municipality / City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Barangay"
                  value={barangay}
                  onChange={(e) => setBarangay(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none"
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <LocationPickerMap
                  latitude={latitude}
                  longitude={longitude}
                  onChange={(lat, lng) => {
                    setLatitude(lat);
                    setLongitude(lng);
                  }}
                  label="Your Location"
                  description="Tap the map to drop a pin where you are, or use your current location — helps us find services near you."
                />
              </div>
            </>
          )}
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none"
          />

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-brand-blue px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Please wait..." : mode === "signup" ? "Sign Up" : "Log In"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signup" ? "login" : "signup")}
          className="mt-4 w-full text-center text-sm font-medium text-brand-blue"
        >
          {mode === "signup"
            ? "Already have an account? Log in"
            : "New here? Create an account"}
        </button>
      </div>
    </main>
  );
}
