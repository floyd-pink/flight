import { LIVE_SCOPE_BBOXES, type LiveScope } from "../lib/live-scope-boxes";
import type { Flight } from "./api";

interface SamplePoint { lat: number; lon: number; place: string }

// The public API only supports circles up to 250 NM, not whole-country or
// continent queries. Each scope is an explicitly labeled local sample.
const SAMPLE_POINTS: Record<LiveScope, SamplePoint[]> = {
  global: [
    { lat: 28.4, lon: 84.2, place: "Nepal" },
    { lat: 51.47, lon: -0.45, place: "London" },
    { lat: 40.64, lon: -73.78, place: "New York" },
    { lat: -33.94, lon: 151.18, place: "Sydney" },
  ],
  nepal: [{ lat: 28.4, lon: 84.2, place: "central Nepal" }],
  india: [{ lat: 28.56, lon: 77.1, place: "Delhi" }],
  europe: [{ lat: 50.03, lon: 8.57, place: "Frankfurt" }],
  asia: [{ lat: 25.08, lon: 121.23, place: "Taipei" }],
  africa: [{ lat: 30.12, lon: 31.4, place: "Cairo" }],
  oceania: [{ lat: -33.94, lon: 151.18, place: "Sydney" }],
  usa: [{ lat: 40.64, lon: -73.78, place: "New York" }],
  singapore: [{ lat: 1.36, lon: 103.99, place: "Singapore" }],
  qatar: [{ lat: 25.26, lon: 51.61, place: "Doha" }],
  dubai: [{ lat: 25.25, lon: 55.36, place: "Dubai" }],
  uae: [{ lat: 24.43, lon: 54.65, place: "Abu Dhabi" }],
  uk: [{ lat: 51.47, lon: -0.45, place: "London" }],
  canada: [{ lat: 43.68, lon: -79.63, place: "Toronto" }],
  japan: [{ lat: 35.55, lon: 139.78, place: "Tokyo" }],
  korea: [{ lat: 37.46, lon: 126.44, place: "Seoul" }],
  thailand: [{ lat: 13.69, lon: 100.75, place: "Bangkok" }],
  france: [{ lat: 49.01, lon: 2.55, place: "Paris" }],
  germany: [{ lat: 50.03, lon: 8.57, place: "Frankfurt" }],
  italy: [{ lat: 41.8, lon: 12.25, place: "Rome" }],
  spain: [{ lat: 40.47, lon: -3.57, place: "Madrid" }],
  australia: [{ lat: -33.94, lon: 151.18, place: "Sydney" }],
  china: [{ lat: 31.14, lon: 121.81, place: "Shanghai" }],
  malaysia: [{ lat: 2.75, lon: 101.71, place: "Kuala Lumpur" }],
  indonesia: [{ lat: -6.13, lon: 106.66, place: "Jakarta" }],
  turkey: [{ lat: 41.28, lon: 28.75, place: "Istanbul" }],
  bangladesh: [{ lat: 23.84, lon: 90.4, place: "Dhaka" }],
  sriLanka: [{ lat: 7.18, lon: 79.88, place: "Colombo" }],
};

export function getAdsbFiCoverage(scope: LiveScope): string {
  const points = SAMPLE_POINTS[scope];
  return `Sample within 250 NM of ${points.map((point) => point.place).join(", ")}. Other parts of this region are not included.`;
}

// Serialize requests in one function instance to respect adsb.fi's 1/s limit.
let nextRequestAt = 0;
let requestQueue: Promise<unknown> = Promise.resolve();

function fetchSample(point: SamplePoint): Promise<Response> {
  const task = requestQueue.then(async () => {
    const delay = Math.max(0, nextRequestAt - Date.now());
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    nextRequestAt = Date.now() + 1100;
    return fetch(`https://opendata.adsb.fi/api/v3/lat/${point.lat}/lon/${point.lon}/dist/250`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  });
  requestQueue = task.then(() => undefined, () => undefined);
  return task;
}

interface AdsbFiAircraft {
  hex?: string;
  flight?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number | "ground";
  alt_geom?: number;
  gs?: number;
  track?: number;
  baro_rate?: number;
  squawk?: string;
  spi?: number;
  seen?: number;
  seen_pos?: number;
}

function metres(feet: number | "ground" | undefined): number | null {
  return typeof feet === "number" && Number.isFinite(feet) ? feet * 0.3048 : null;
}

async function getSample(point: SamplePoint, scope: LiveScope): Promise<Flight[]> {
  const response = await fetchSample(point);
  if (!response.ok) throw new Error(`adsb.fi live states failed: ${response.status}`);

  const payload: unknown = await response.json();
  if (typeof payload !== "object" || payload === null ||
      !("ac" in payload) || !Array.isArray(payload.ac)) {
    throw new Error("adsb.fi returned an invalid live-state response");
  }

  const nowValue = "now" in payload ? payload.now : undefined;
  const now = typeof nowValue === "number"
    ? Math.floor(nowValue > 1e11 ? nowValue / 1000 : nowValue)
    : Math.floor(Date.now() / 1000);
  const bbox = LIVE_SCOPE_BBOXES[scope];

  return (payload.ac as AdsbFiAircraft[])
    .filter((aircraft) =>
      aircraft && typeof aircraft.hex === "string" && /^[0-9a-f]{6}$/i.test(aircraft.hex) &&
      typeof aircraft.lat === "number" && typeof aircraft.lon === "number" &&
      (!bbox || (aircraft.lat >= bbox.lamin && aircraft.lat <= bbox.lamax &&
      aircraft.lon >= bbox.lomin && aircraft.lon <= bbox.lomax)),
    )
    .map((aircraft) => ({
      icao24: aircraft.hex!.toLowerCase(),
      callsign: aircraft.flight?.trim() || null,
      originCountry: "Unknown",
      timePosition: typeof aircraft.seen_pos === "number" ? now - Math.floor(aircraft.seen_pos) : null,
      lastContact: now - Math.floor(aircraft.seen ?? 0),
      longitude: aircraft.lon!,
      latitude: aircraft.lat!,
      baroAltitude: metres(aircraft.alt_baro),
      onGround: aircraft.alt_baro === "ground",
      velocity: typeof aircraft.gs === "number" ? aircraft.gs * 0.514444 : null,
      trueTrack: aircraft.track ?? null,
      verticalRate: typeof aircraft.baro_rate === "number" ? aircraft.baro_rate * 0.00508 : null,
      sensors: null,
      geoAltitude: metres(aircraft.alt_geom),
      squawk: aircraft.squawk ?? null,
      spi: Boolean(aircraft.spi),
      positionSource: 0,
    }));
}

export async function getLiveStatesFromAdsbFi(scope: LiveScope): Promise<Flight[]> {
  const samples = await Promise.all(SAMPLE_POINTS[scope].map((point) => getSample(point, scope)));
  return [...new Map(samples.flat().map((flight) => [flight.icao24, flight])).values()];
}
