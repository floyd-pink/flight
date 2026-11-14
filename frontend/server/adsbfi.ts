import { LIVE_SCOPE_BBOXES } from "../lib/live-scope-boxes";
import type { Flight } from "./api";

const NEPAL_AIRCRAFT_URL =
  "https://opendata.adsb.fi/api/v3/lat/28.4/lon/84.2/dist/250";

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

export async function getNepalStatesFromAdsbFi(): Promise<Flight[]> {
  const response = await fetch(NEPAL_AIRCRAFT_URL, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
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
  const bbox = LIVE_SCOPE_BBOXES.nepal!;

  return (payload.ac as AdsbFiAircraft[])
    .filter((aircraft) =>
      aircraft && typeof aircraft.hex === "string" && /^[0-9a-f]{6}$/i.test(aircraft.hex) &&
      typeof aircraft.lat === "number" && typeof aircraft.lon === "number" &&
      aircraft.lat >= bbox.lamin && aircraft.lat <= bbox.lamax &&
      aircraft.lon >= bbox.lomin && aircraft.lon <= bbox.lomax,
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
