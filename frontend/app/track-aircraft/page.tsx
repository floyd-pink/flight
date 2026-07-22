"use client";

import { useState } from "react";

interface TrackWaypoint {
  time: number;
  latitude: number | null;
  longitude: number | null;
  baroAltitude: number | null;
  trueTrack: number | null;
  onGround: boolean;
}

interface TrackData {
  icao24: string;
  startTime: number;
  endTime: number;
  callsign: string | null;
  path: TrackWaypoint[];
}

export default function TrackAircraftPage() {
  const [icao24, setIcao24] = useState("");
  const [time, setTime] = useState("");
  const [track, setTrack] = useState<TrackData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch() {
    setLoading(true);
    setError("");

    try {
      if (!icao24.trim()) {
        setError("Enter an aircraft ICAO24 hex code.");
        setTrack(null);
        return;
      }

      const timeUnix = time ? Math.floor(new Date(time).getTime() / 1000) : 0;
      const response = await fetch(
        `/api/tracks/by-aircraft?icao24=${encodeURIComponent(icao24.trim())}&time=${timeUnix}`,
      );
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to load aircraft track.");
        setTrack(null);
        return;
      }

      setTrack(data);
    } catch (trackError) {
      setError(
        trackError instanceof Error
          ? trackError.message
          : "Failed to load aircraft track.",
      );
      setTrack(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 px-4 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.3em] text-blue-700">
            Track aircraft
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            Track by aircraft ICAO24
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Enter the aircraft ICAO24 hex code. Leave the time empty for live
            track, or choose a past timestamp.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-slate-700">
              Aircraft ICAO24
              <input
                className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base outline-none focus:border-blue-500"
                placeholder="3c675a"
                value={icao24}
                onChange={(e) => setIcao24(e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-700">
              Time (optional)
              <input
                type="datetime-local"
                className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base outline-none focus:border-blue-500"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </label>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              className="rounded-2xl bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? "Loading..." : "Search track"}
            </button>
            <p className="text-sm text-slate-500">
              If no time is selected, the live track is requested.
            </p>
          </div>

          {error ? (
            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-slate-900">
              Track result
            </h2>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-600">
              {track?.path.length ?? 0} points
            </span>
          </div>

          {!track ? (
            <p className="text-sm text-slate-500">
              Run a search to see the aircraft path.
            </p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Time</th>
                    <th className="px-4 py-3 font-medium">Latitude</th>
                    <th className="px-4 py-3 font-medium">Longitude</th>
                    <th className="px-4 py-3 font-medium">Altitude</th>
                    <th className="px-4 py-3 font-medium">Heading</th>
                    <th className="px-4 py-3 font-medium">Grounded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white text-slate-800">
                  {track.path.map((point) => (
                    <tr key={point.time}>
                      <td className="px-4 py-3">
                        {new Date(point.time * 1000).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">{point.latitude ?? "-"}</td>
                      <td className="px-4 py-3">{point.longitude ?? "-"}</td>
                      <td className="px-4 py-3">{point.baroAltitude ?? "-"}</td>
                      <td className="px-4 py-3">{point.trueTrack ?? "-"}</td>
                      <td className="px-4 py-3">
                        {point.onGround ? "Yes" : "No"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
