"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { ShowCard } from "../../src/showCard";
import type { FlightMapTrack } from "../../src/components/FlightMap";

const DynamicFlightMap = dynamic(
  () => import("../../src/components/FlightMap"),
  { ssr: false },
);

type Scope =
  | "global"
  | "nepal"
  | "india"
  | "europe"
  | "asia"
  | "africa"
  | "oceania"
  | "usa"
  | "singapore"
  | "qatar"
  | "dubai"
  | "uae"
  | "uk"
  | "canada"
  | "japan"
  | "korea"
  | "thailand"
  | "france"
  | "germany"
  | "italy"
  | "spain"
  | "australia"
  | "china"
  | "malaysia"
  | "indonesia"
  | "turkey"
  | "bangladesh"
  | "sriLanka";

export interface LiveState {
  icao24: string;
  callsign: string | null;
  originCountry: string;
  timePosition: number | null;
  lastContact: number;
  longitude: number | null;
  latitude: number | null;
  baroAltitude: number | null;
  onGround: boolean;
  velocity: number | null;
  trueTrack: number | null;
}

export default function LiveStatesPage() {
  const [scope, setScope] = useState<Scope>("nepal");
  const [states, setStates] = useState<LiveState[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPlane, setSelectedPlane] = useState<LiveState | null>(null);
  const [mapFocusPlane, setMapFocusPlane] = useState<FlightMapTrack | null>(
    null,
  );
  const mapSectionRef = useRef<HTMLElement | null>(null);

  const Data: Scope[] = [
    "global",
    "nepal",
    "india",
    "europe",
    "asia",
    "africa",
    "oceania",
    "usa",
    "singapore",
    "qatar",
    "dubai",
    "uae",
    "uk",
    "canada",
    "japan",
    "korea",
    "thailand",
    "france",
    "germany",
    "italy",
    "spain",
    "australia",
    "china",
    "malaysia",
    "indonesia",
    "turkey",
    "bangladesh",
    "sriLanka",
  ];

  const showDetails = (state: LiveState) => {
    setSelectedPlane(state);
  };

  const showOnMap = (state: LiveState) => {
    if (state.latitude == null || state.longitude == null) {
      setError("This aircraft does not have live coordinates yet.");
      return;
    }

    setError("");
    setMapFocusPlane({
      icao24: state.icao24,
      callsign: state.callsign ?? "TRACK",
      latitude: state.latitude,
      longitude: state.longitude,
    });
    mapSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleScopeChange = (nextScope: Scope) => {
    setScope(nextScope);
    setStates([]);
    setPage(1);
    setHasMore(true);
    setError("");
  };

  // Fetch data matching current scope or page increment
  useEffect(() => {
    let isMounted = true;

    async function loadStates() {
      setLoading(true);
      if (page === 1) setError(""); // clear error on new scope fresh fetch

      try {
        const response = await fetch(
          `/api/states/live?scope=${scope}&page=${page}&limit=50`,
        );
        const data = await response.json();

        if (!isMounted) return;

        if (!response.ok) {
          setError(data.error || "Failed to load live states.");
          return;
        }

        const rawNewStates = Array.isArray(data.states) ? data.states : [];

        // Append data if we're on page > 1, otherwise set fresh
        setStates((prev) =>
          page === 1 ? rawNewStates : [...prev, ...rawNewStates],
        );
        setHasMore(page < data.totalPages);
      } catch (loadError) {
        if (!isMounted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load live states.",
        );
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadStates();

    return () => {
      isMounted = false;
    };
  }, [scope, page]);

  // Dedicated explicit manual reset/refresh handler
  const handleManualRefresh = () => {
    if (page === 1) {
      // Force trigger hook by running same configuration or resetting state array
      setStates([]);
      setPage(0);
      setTimeout(() => setPage(1), 0);
    } else {
      setPage(1);
    }
  };

  return (
    <main className="flex-1 px-4 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.3em] text-blue-700">
            Live states
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            Live aircraft state vectors
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            This shows aircraft currently reported by OpenSky.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-slate-700">Scope</span>
              {Data.map((s) => {
                const isActive = scope === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleScopeChange(s)}
                    aria-pressed={isActive}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      isActive
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-300 bg-slate-50 text-slate-700 hover:border-blue-400"
                    }`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                );
              })}
            </div>

            <button
              className="rounded-2xl bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleManualRefresh}
              disabled={loading}
            >
              {loading && states.length === 0 ? "Loading..." : "Refresh Status"}
            </button>
          </div>

          {error && (
            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-slate-900">Results</h2>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-600">
              Showing {states.length} rows
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">SN</th>
                  <th className="px-4 py-3 font-medium">ICAO24</th>
                  <th className="px-4 py-3 font-medium">Callsign</th>
                  <th className="px-4 py-3 font-medium">Country</th>
                  <th className="px-4 py-3 font-medium">Altitude</th>
                  <th className="px-4 py-3 font-medium">Speed</th>
                  <th className="px-4 py-3 font-medium">Position</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white text-slate-800">
                {states.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 py-6 text-center text-slate-500"
                      colSpan={8}
                    >
                      {loading
                        ? "Fetching aircraft streams..."
                        : "No live states loaded."}
                    </td>
                  </tr>
                ) : (
                  states.map((state, i) => {
                    const hasCoords =
                      state.latitude !== null && state.longitude !== null;

                    return (
                      <tr
                        key={`${state.icao24}-${state.lastContact}-${i}`}
                        className="group hover:bg-slate-50/80 transition-colors"
                      >
                        {/* Row Clicks open your Modal Details Popup */}
                        <td
                          onClick={() => showDetails(state)}
                          className="cursor-pointer px-4 py-3 font-medium text-slate-900"
                        >
                          {i + 1}
                        </td>
                        <td
                          onClick={() => showDetails(state)}
                          className="cursor-pointer px-4 py-3 font-mono font-bold text-slate-900"
                        >
                          {state.icao24}
                        </td>
                        <td
                          onClick={() => showDetails(state)}
                          className="cursor-pointer px-4 py-3 font-semibold text-blue-600"
                        >
                          {state.callsign ?? "-"}
                        </td>
                        <td
                          onClick={() => showDetails(state)}
                          className="cursor-pointer px-4 py-3 text-slate-600"
                        >
                          {state.originCountry}
                        </td>
                        <td
                          onClick={() => showDetails(state)}
                          className="cursor-pointer px-4 py-3"
                        >
                          {state.baroAltitude ?? "-"}
                        </td>
                        <td
                          onClick={() => showDetails(state)}
                          className="cursor-pointer px-4 py-3"
                        >
                          {state.velocity ?? "-"}
                        </td>
                        <td
                          onClick={() => showDetails(state)}
                          className="cursor-pointer px-4 py-3 font-mono text-xs text-slate-500"
                        >
                          {hasCoords
                            ? `${state.latitude!.toFixed(3)}, ${state.longitude!.toFixed(3)}`
                            : "-"}
                        </td>

                        {/* The Dedicated Map Launcher Button Column */}
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            disabled={!hasCoords}
                            onClick={(e) => {
                              e.stopPropagation();
                              showOnMap(state);
                            }}
                            className={`rounded-xl px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all active:scale-[0.97]
                    ${
                      hasCoords
                        ? "bg-blue-600 hover:bg-blue-700 shadow-blue-600/10 cursor-pointer"
                        : "bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                    }`}
                          >
                            See on Map
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {hasMore && states.length > 0 && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                onClick={() => setPage((p) => p + 1)}
                disabled={loading}
              >
                {loading ? "Loading chunk..." : "Load Next 50 Planes"}
              </button>
            </div>
          )}
        </section>

        {selectedPlane && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-8">
            <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-blue-700">
                    Selected plane
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                    Aircraft details
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPlane(null)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600 transition hover:bg-slate-100"
                >
                  Close
                </button>
              </div>
              <ShowCard
                icao24={selectedPlane.icao24}
                callsign={selectedPlane.callsign}
                arrivalAirport={null}
                departureAirport={null}
                currentPosition={
                  selectedPlane.latitude !== null &&
                  selectedPlane.longitude !== null
                    ? `${selectedPlane.latitude.toFixed(3)}, ${selectedPlane.longitude.toFixed(3)}`
                    : "Unknown"
                }
              />
            </div>
          </div>
        )}

        <section
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          ref={mapSectionRef}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-blue-700">
                Map
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                Center aircraft on map
              </h2>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-600">
              {mapFocusPlane ? mapFocusPlane.callsign : "No aircraft selected"}
            </span>
          </div>

          <div className="h-[480px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
            <DynamicFlightMap activeTrack={mapFocusPlane} />
          </div>
        </section>
      </div>
    </main>
  );
}
