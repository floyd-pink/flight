const BASE_URL = "https://opensky-network.org/api";
const OPENSKY_CLIENT_ID = process.env.OPENSKY_CLIENT_ID ?? "floyd-api-client";
const OPENSKY_CLIENT_SECRET =
  process.env.OPENSKY_CLIENT_SECRET ?? "wuvi6BU3fV3WkuSBuNj7JPc39dEdkIep";
const TOKEN_URL =
  "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";

export interface Flight {
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
  verticalRate: number | null;
  sensors: number[] | null;
  geoAltitude: number | null;
  squawk: string | null;
  spi: boolean;
  positionSource: number;
  category?: number;
}

export interface FlightRecord {
  icao24: string;
  firstSeen: number;
  estDepartureAirport: string | null;
  lastSeen: number;
  estArrivalAirport: string | null;
  callsign: string | null;
  estDepartureAirportHorizDistance: number | null;
  estDepartureAirportVertDistance: number | null;
  estArrivalAirportHorizDistance: number | null;
  estArrivalAirportVertDistance: number | null;
  departureAirportCandidatesCount: number;
  arrivalAirportCandidatesCount: number;
}

export interface Waypoint {
  time: number;
  latitude: number | null;
  longitude: number | null;
  baroAltitude: number | null;
  trueTrack: number | null;
  onGround: boolean;
}

export interface Track {
  icao24: string;
  startTime: number;
  endTime: number;
  callsign: string | null;
  path: Waypoint[];
}

export interface BoundingBox {
  lamin: number;
  lomin: number;
  lamax: number;
  lomax: number;
}

type RawStateVector = [
  string,
  string | null,
  string,
  number | null,
  number,
  number | null,
  number | null,
  number | null,
  boolean,
  number | null,
  number | null,
  number | null,
  number[] | null,
  number | null,
  string | null,
  boolean,
  number,
  number | null,
];

type RawTrackWaypoint = [
  number,
  number | null,
  number | null,
  number | null,
  number | null,
  boolean,
];

let cachedToken: string | null = null;
let expiresAt: number = 0;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < expiresAt) return cachedToken;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: OPENSKY_CLIENT_ID,
      client_secret: OPENSKY_CLIENT_SECRET,
    }),
  });

  if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`);

  const data = await res.json();
  cachedToken = data.access_token;
  expiresAt = Date.now() + (data.expires_in - 30) * 1000;
  return cachedToken!;
}

async function authHeaders(): Promise<HeadersInit> {
  const token = await getToken();
  return { Authorization: `Bearer ${token}` };
}

function parseStateVector(s: RawStateVector): Flight {
  return {
    icao24: s[0],
    callsign: s[1]?.trim() || null,
    originCountry: s[2],
    timePosition: s[3],
    lastContact: s[4],
    longitude: s[5],
    latitude: s[6],
    baroAltitude: s[7],
    onGround: s[8],
    velocity: s[9],
    trueTrack: s[10],
    verticalRate: s[11],
    sensors: s[12],
    geoAltitude: s[13],
    squawk: s[14],
    spi: s[15],
    positionSource: s[16],
    category: s[17] ?? undefined,
  };
}

export async function getAllStates(options?: {
  time?: number;
  icao24?: string[];
  bbox?: BoundingBox;
  extended?: boolean;
}): Promise<Flight[]> {
  const params = new URLSearchParams();

  if (options?.time) params.set("time", String(options.time));
  if (options?.icao24)
    options.icao24.forEach((id) => params.append("icao24", id));
  if (options?.bbox) {
    params.set("lamin", String(options.bbox.lamin));
    params.set("lomin", String(options.bbox.lomin));
    params.set("lamax", String(options.bbox.lamax));
    params.set("lomax", String(options.bbox.lomax));
  }
  if (options?.extended) params.set("extended", "1");

  const res = await fetch(`${BASE_URL}/states/all?${params}`, {
    headers: await authHeaders(),
  });

  if (!res.ok) throw new Error(`getAllStates failed: ${res.status}`);

  const data = await res.json();
  return (data.states || []).map(parseStateVector);
}
export async function getOwnStates(options?: {
  time?: number;
  icao24?: string[];
  serials?: number[]; // filter by your receiver serial numbers
}): Promise<Flight[]> {
  const params = new URLSearchParams();

  if (options?.time) params.set("time", String(options.time));
  if (options?.icao24)
    options.icao24.forEach((id) => params.append("icao24", id));
  if (options?.serials)
    options.serials.forEach((s) => params.append("serials", String(s)));

  const res = await fetch(`${BASE_URL}/states/own?${params}`, {
    headers: await authHeaders(),
  });

  if (!res.ok) throw new Error(`getOwnStates failed: ${res.status}`);

  const data = await res.json();
  return (data.states || []).map(parseStateVector);
}
export async function getFlightsInInterval(
  begin: number, // Unix timestamp
  end: number, // Unix timestamp (max begin + 7200)
): Promise<FlightRecord[]> {
  const params = new URLSearchParams({
    begin: String(begin),
    end: String(end),
  });

  const res = await fetch(`${BASE_URL}/flights/all?${params}`, {
    headers: await authHeaders(),
  });

  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`getFlightsInInterval failed: ${res.status}`);

  return res.json();
}
export async function getFlightsByAircraft(
  icao24: string, // lowercase hex e.g. "3c675a"
  begin: number,
  end: number,
): Promise<FlightRecord[]> {
  const params = new URLSearchParams({
    icao24: icao24.toLowerCase(),
    begin: String(begin),
    end: String(end),
  });

  const res = await fetch(`${BASE_URL}/flights/aircraft?${params}`, {
    headers: await authHeaders(),
  });

  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`getFlightsByAircraft failed: ${res.status}`);

  return res.json();
}

export async function getArrivalsByAirport(
  airport: string, // ICAO code e.g. "VNKT" for Kathmandu
  begin: number,
  end: number,
): Promise<FlightRecord[]> {
  const params = new URLSearchParams({
    airport: airport.toUpperCase(),
    begin: String(begin),
    end: String(end),
  });

  const res = await fetch(`${BASE_URL}/flights/arrival?${params}`, {
    headers: await authHeaders(),
  });

  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`getArrivalsByAirport failed: ${res.status}`);

  return res.json();
}

export async function getDeparturesByAirport(
  airport: string, // ICAO code e.g. "VNKT"
  begin: number,
  end: number,
): Promise<FlightRecord[]> {
  const params = new URLSearchParams({
    airport: airport.toUpperCase(),
    begin: String(begin),
    end: String(end),
  });

  const res = await fetch(`${BASE_URL}/flights/departure?${params}`, {
    headers: await authHeaders(),
  });

  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`getDeparturesByAirport failed: ${res.status}`);

  return res.json();
}

export async function getTrackByAircraft(
  icao24: string,
  time: number = 0, // 0 = live track
): Promise<Track | null> {
  const params = new URLSearchParams({
    icao24: icao24.toLowerCase(),
    time: String(time),
  });

  const res = await fetch(`${BASE_URL}/tracks/all?${params}`, {
    headers: await authHeaders(),
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`getTrackByAircraft failed: ${res.status}`);

  const data = await res.json();

  return {
    icao24: data.icao24,
    startTime: data.startTime,
    endTime: data.endTime,
    callsign: data.callsign || null,
    path: (data.path || []).map((w: RawTrackWaypoint) => ({
      time: w[0],
      latitude: w[1],
      longitude: w[2],
      baroAltitude: w[3],
      trueTrack: w[4],
      onGround: w[5],
    })),
  };
}

// ─────────────────────────────────────────
// NEPAL PRESETS  (ready to use)
// ─────────────────────────────────────────

export const NEPAL_BBOX: BoundingBox = {
  lamin: 26.3,
  lomin: 80.0,
  lamax: 30.4,
  lomax: 88.2,
};

export const LIVE_SCOPE_BBOXES: Record<LiveScope, BoundingBox | null> = {
  global: null, // no bbox => OpenSky returns all aircraft worldwide

  nepal: NEPAL_BBOX,

  india: {
    lamin: 6.0,
    lomin: 68.0,
    lamax: 36.5,
    lomax: 98.0,
  },
  europe: {
    lamin: 34.0,
    lomin: -12.0,
    lamax: 72.0,
    lomax: 40.0,
  },
  asia: {
    lamin: 5.0,
    lomin: 25.0,
    lamax: 55.0,
    lomax: 180.0,
  },
  africa: {
    lamin: -35.0,
    lomin: -20.0,
    lamax: 38.0,
    lomax: 55.0,
  },
  oceania: {
    lamin: -50.0,
    lomin: 110.0,
    lamax: 10.0,
    lomax: 180.0,
  },
  usa: {
    lamin: 24.0,
    lomin: -125.0,
    lamax: 50.0,
    lomax: -66.0,
  },
  singapore: {
    lamin: 1.2,
    lomin: 103.6,
    lamax: 1.5,
    lomax: 104.0,
  },
  qatar: {
    lamin: 24.5,
    lomin: 50.7,
    lamax: 26.2,
    lomax: 51.7,
  },
  dubai: {
    // tight box around Dubai metro only
    lamin: 24.7,
    lomin: 54.9,
    lamax: 25.4,
    lomax: 55.6,
  },
  uae: {
    // full UAE (Abu Dhabi, Sharjah, etc.) — use this if "dubai" feels too narrow
    lamin: 22.5,
    lomin: 51.0,
    lamax: 26.1,
    lomax: 56.4,
  },
  uk: {
    lamin: 49.9,
    lomin: -8.6,
    lamax: 60.9,
    lomax: 1.8,
  },
  canada: {
    lamin: 41.7,
    lomin: -141.0,
    lamax: 83.1,
    lomax: -52.6,
  },
  japan: {
    lamin: 24.0,
    lomin: 122.9,
    lamax: 45.6,
    lomax: 153.99,
  },
  korea: {
    lamin: 33.0,
    lomin: 124.5,
    lamax: 38.7,
    lomax: 131.0,
  },
  thailand: {
    lamin: 5.6,
    lomin: 97.3,
    lamax: 20.5,
    lomax: 105.7,
  },
  france: {
    lamin: 41.3,
    lomin: -5.2,
    lamax: 51.1,
    lomax: 9.6,
  },
  germany: {
    lamin: 47.3,
    lomin: 5.9,
    lamax: 55.1,
    lomax: 15.0,
  },
  italy: {
    lamin: 36.6,
    lomin: 6.6,
    lamax: 47.1,
    lomax: 18.8,
  },
  spain: {
    lamin: 36.0,
    lomin: -9.3,
    lamax: 43.8,
    lomax: 4.3,
  },
  australia: {
    lamin: -43.6,
    lomin: 113.0,
    lamax: -10.0,
    lomax: 153.6,
  },
  china: {
    lamin: 18.0,
    lomin: 73.5,
    lamax: 53.6,
    lomax: 135.1,
  },
  malaysia: {
    lamin: 0.8,
    lomin: 99.6,
    lamax: 7.4,
    lomax: 119.3,
  },
  indonesia: {
    lamin: -11.0,
    lomin: 95.0,
    lamax: 6.1,
    lomax: 141.0,
  },
  turkey: {
    lamin: 35.8,
    lomin: 25.6,
    lamax: 42.1,
    lomax: 44.8,
  },
  bangladesh: {
    lamin: 20.5,
    lomin: 88.0,
    lamax: 26.6,
    lomax: 92.7,
  },
  sriLanka: {
    lamin: 5.9,
    lomin: 79.6,
    lamax: 9.9,
    lomax: 81.9,
  },
};
export const KATHMANDU_AIRPORT = "VNKT";

// Live flights over Nepal
export const getLiveFlightsOverNepal = () =>
  getAllStates({ bbox: NEPAL_BBOX, extended: true });

export const getLiveStatesByScope = (scope: keyof typeof LIVE_SCOPE_BBOXES) =>
  getAllStates({ bbox: LIVE_SCOPE_BBOXES[scope], extended: true });

// Yesterday's arrivals at Kathmandu
export const getKathmanduArrivals = () => {
  const now = Math.floor(Date.now() / 1000);
  const yesterday = now - 86400;
  return getArrivalsByAirport(KATHMANDU_AIRPORT, yesterday, now);
};

// Yesterday's departures from Kathmandu
export const getKathmanduDepartures = () => {
  const now = Math.floor(Date.now() / 1000);
  const yesterday = now - 86400;
  return getDeparturesByAirport(KATHMANDU_AIRPORT, yesterday, now);
};
