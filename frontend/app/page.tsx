"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import type { FlightMapTrack } from "../src/components/FlightMap";

type SearchType = "arrival" | "departure";

const DynamicFlightMap = dynamic(
  () => import("../src/components/FlightMap"),
  { ssr: false },
);

type LivePlaneLookup = {
  icao24: string;
  callsign: string | null;
  latitude: number | null;
  longitude: number | null;
};

interface FlightRecord {
  icao24: string;
  firstSeen: number;
  estDepartureAirport: string | null;
  lastSeen: number;
  estArrivalAirport: string | null;
  callsign: string | null;
}

export default function Home() {
  const [airport, setAirport] = useState("VNKT");
  const [type, setType] = useState<SearchType>("arrival");

  const yesterday = getYesterdayRange();
  const [begin, setBegin] = useState(toLocalInputValue(yesterday.begin));
  const [end, setEnd] = useState(toLocalInputValue(yesterday.end));

  const [results, setResults] = useState<FlightRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Track state shared natively with the adjacent Leaflet component
  const [mapFocusPlane, setMapFocusPlane] = useState<FlightMapTrack | null>(
    null,
  );

  async function handleSearch() {
    setLoading(true);
    setError("");

    try {
      const beginUnix = toUnixSeconds(begin);
      const endUnix = toUnixSeconds(end);

      if (!airport.trim()) {
        setError("Enter an airport ICAO code.");
        setResults([]);
        return;
      }

      if (beginUnix === null || endUnix === null) {
        setError("Enter valid start and end times.");
        setResults([]);
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      const maxWindow = 48 * 60 * 60; // 48 hours

      if (endUnix > now) {
        setError("End time must be in the past (≤ now).");
        setResults([]);
        return;
      }

      if (endUnix - beginUnix > maxWindow) {
        setError(
          "Time window cannot exceed 48 hours. Try a shorter range or choose 'Yesterday'.",
        );
        setResults([]);
        return;
      }

      const response = await fetch(
        `/api/flights/search?airport=${encodeURIComponent(airport.trim())}&type=${type}&begin=${beginUnix}&end=${endUnix}`,
      );

      const text = await response.text();
      let data: unknown = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      if (!response.ok) {
        const serverMessage =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof (data as { error?: unknown }).error === "string"
            ? (data as { error: string }).error
            : String(data || response.statusText);
        setError(`Server returned ${response.status}: ${serverMessage}`);
        setResults([]);
        return;
      }

      const records = Array.isArray(data) ? data : [];
      if (records.length === 0) {
        setError("No flight records returned.");
      } else {
        setError("");
      }
      setResults(records);
    } catch (searchError) {
      setError(
        searchError instanceof Error ? searchError.message : "Search failed.",
      );
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function applyPreset(kind: "yesterday" | "last24" | "last48") {
    if (kind === "yesterday") {
      const r = getYesterdayRange();
      setBegin(toLocalInputValue(r.begin));
      setEnd(toLocalInputValue(r.end));
    } else if (kind === "last24") {
      const endD = new Date();
      const beginD = new Date(Date.now() - 24 * 60 * 60 * 1000);
      setBegin(toLocalInputValue(beginD));
      setEnd(toLocalInputValue(endD));
    } else {
      const endD = new Date();
      const beginD = new Date(Date.now() - 48 * 60 * 60 * 1000);
      setBegin(toLocalInputValue(beginD));
      setEnd(toLocalInputValue(endD));
    }
  }

  // Intercept historical log clicks and try to find an active coordinate projection
  const handleLocateHistoricalPlane = async (flight: FlightRecord) => {
    try {
      // Fetch the plane's live positions from your operational live states tracking API
      const res = await fetch(`/api/states/live?scope=global`);
      const data = await res.json();

      const livePayload = data as { states?: unknown } | null;
      const livePlanes = Array.isArray(livePayload?.states)
        ? (livePayload.states as LivePlaneLookup[])
        : [];
      // Match the row's ICAO24 string address within the live airspace pool
      const activeMatch = livePlanes.find(
        (p) => p.icao24 === flight.icao24,
      );

      if (
        activeMatch &&
        activeMatch.latitude != null &&
        activeMatch.longitude != null
      ) {
        setMapFocusPlane({
          icao24: activeMatch.icao24,
          callsign: activeMatch.callsign || flight.callsign || "TRACK",
          latitude: activeMatch.latitude,
          longitude: activeMatch.longitude,
        });
      } else {
        // Fallback placeholder mock coordinate if it has departed out of active scope range
        alert(
          `Aircraft ${flight.icao24} is not currently transmitting live state vectors in this scope. Showing a simulated projection.`,
        );
        setMapFocusPlane({
          icao24: flight.icao24,
          callsign: flight.callsign || "SIM-TRACK",
          latitude: 27.7172,
          longitude: 85.324,
        });
      }
    } catch {
      setError("Failed to bridge historical logs to live radar metrics.");
    }
  };

  return (
    <main className="min-h-[calc(100vh-73px)] w-full overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-4 md:px-6">
      <div className="mx-auto grid h-full w-full max-w-7xl gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      {/* LEFT CONTENT BLOCK: Search Panel & Data Results */}
      <div className="flex min-h-0 flex-col gap-6 overflow-y-auto rounded-[2rem] border border-white/70 bg-white/80 px-6 py-8 shadow-[0_30px_80px_-35px_rgba(15,23,42,0.35)] backdrop-blur">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.3em] text-blue-700 font-semibold">
            Flight Tracker
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            Find flight arrivals and departures
          </h1>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
              Airport ICAO
              <input
                className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-normal outline-none focus:border-blue-500 transition"
                placeholder="Icao code, e.g. VNKT"
                value={airport}
                onChange={(e) => setAirport(e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
              Flight type
              <select
                className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-normal outline-none focus:border-blue-500 transition"
                value={type}
                onChange={(e) => setType(e.target.value as SearchType)}
              >
                <option value="departure">Departure</option>
                <option value="arrival">Arrival</option>
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
              Begin
              <input
                type="datetime-local"
                className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-normal outline-none focus:border-blue-500 transition"
                value={begin}
                onChange={(e) => setBegin(e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
              End
              <input
                type="datetime-local"
                className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-normal outline-none focus:border-blue-500 transition"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              className="rounded-xl px-3 py-1 text-xs border border-slate-200 bg-slate-50 hover:bg-slate-100 font-medium text-slate-700 transition"
              onClick={() => applyPreset("yesterday")}
            >
              Yesterday
            </button>
            <button
              className="rounded-xl px-3 py-1 text-xs border border-slate-200 bg-slate-50 hover:bg-slate-100 font-medium text-slate-700 transition"
              onClick={() => applyPreset("last24")}
            >
              Last 24h
            </button>
            <button
              className="rounded-xl px-3 py-1 text-xs border border-slate-200 bg-slate-50 hover:bg-slate-100 font-medium text-slate-700 transition"
              onClick={() => applyPreset("last48")}
            >
              Last 48h
            </button>
          </div>

          <div className="mt-5">
            <button
              className="w-full rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? "Searching logs..." : "Execute Search Query"}
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex-1 flex flex-col min-h-[350px]">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-bold text-slate-900">Search Output</h2>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              {results.length} records returned
            </span>
          </div>

          {error && (
            <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 font-medium">
              {error}
            </p>
          )}

          <div className="flex-1 overflow-auto rounded-2xl border border-slate-200 max-h-[400px]">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3">ICAO24</th>
                  <th className="px-4 py-3">Callsign</th>
                  <th className="px-4 py-3">Dep</th>
                  <th className="px-4 py-3">Arr</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
                {results.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 py-12 text-center text-slate-400"
                      colSpan={5}
                    >
                      No history loaded. Complete fields above to query the
                      stack.
                    </td>
                  </tr>
                ) : (
                  results.map((flight, idx) => (
                    <tr
                      key={`${flight.icao24}-${flight.firstSeen}-${idx}`}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {flight.icao24}
                      </td>
                      <td className="px-4 py-3 font-medium text-blue-600">
                        {flight.callsign ?? "-"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-500">
                        {flight.estDepartureAirport ?? "-"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-500">
                        {flight.estArrivalAirport ?? "-"}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          onClick={() => handleLocateHistoricalPlane(flight)}
                          className="rounded-xl bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-[11px] font-bold text-white transition active:scale-95"
                        >
                          See on Map ✈️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* RIGHT CONTENT BLOCK: Interactive Leaflet Viewport Canvas */}
      <div className="relative min-h-[560px] overflow-hidden rounded-[2rem] border border-white/70 bg-white/70 shadow-[0_30px_80px_-35px_rgba(15,23,42,0.35)] backdrop-blur">
        <DynamicFlightMap activeTrack={mapFocusPlane} />
      </div>
      </div>
    </main>
  );
}

// Keep your date utility code helpers exactly as they are configured
function getYesterdayRange() {
  const now = new Date();
  const yesterday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1,
  );
  const begin = new Date(
    yesterday.getFullYear(),
    yesterday.getMonth(),
    yesterday.getDate(),
    0,
    0,
    0,
  );
  const end = new Date(
    yesterday.getFullYear(),
    yesterday.getMonth(),
    yesterday.getDate(),
    23,
    59,
    59,
  );
  return { begin, end };
}

function toLocalInputValue(date: Date) {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

function toUnixSeconds(value: string) {
  const date = new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? null : Math.floor(time / 1000);
}
