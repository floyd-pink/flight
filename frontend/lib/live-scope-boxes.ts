// lib/live-scope-bboxes.ts

// ── Types ─────────────────────────────────────────────
export interface BoundingBox {
  lamin: number; // min latitude
  lomin: number; // min longitude
  lamax: number; // max latitude
  lomax: number; // max longitude
}

export type LiveScope =
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

// Nepal bbox — tight box around the country
const NEPAL_BBOX: BoundingBox = {
  lamin: 26.3,
  lomin: 80.0,
  lamax: 30.5,
  lomax: 88.3,
};

// ── BBox map (single source of truth) ────────────────
// "global" => null means "no bbox filter", i.e. fetch all OpenSky state vectors.
export const LIVE_SCOPE_BBOXES: Record<LiveScope, BoundingBox | null> = {
  global: null,

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
    // full UAE (Abu Dhabi, Sharjah, etc.) — use if "dubai" feels too narrow
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

// ── Derived list — always in sync with LIVE_SCOPE_BBOXES ──
// Since LIVE_SCOPE_BBOXES is typed as Record<LiveScope, ...>, TypeScript
// guarantees every LiveScope member exists as a key, so this list can
// never silently drop or duplicate a scope.
export const SUPPORTED_SCOPES: LiveScope[] = Object.keys(
  LIVE_SCOPE_BBOXES,
) as LiveScope[];

// ── Type guard — use this to validate untrusted input (query params etc.) ──
export function isLiveScope(value: string): value is LiveScope {
  return (SUPPORTED_SCOPES as string[]).includes(value);
}

// ── Helper: get bbox for a scope, throws if scope is invalid ──
export function getBBoxForScope(scope: LiveScope): BoundingBox | null {
  return LIVE_SCOPE_BBOXES[scope];
}

// ── Helper: build OpenSky query params, skipping bbox for "global" ──
export function buildOpenSkyParams(scope: LiveScope): URLSearchParams {
  const bbox = LIVE_SCOPE_BBOXES[scope];
  const params = new URLSearchParams();

  if (bbox) {
    params.set("lamin", String(bbox.lamin));
    params.set("lomin", String(bbox.lomin));
    params.set("lamax", String(bbox.lamax));
    params.set("lomax", String(bbox.lomax));
  }
  // scope === "global" → no params added, OpenSky returns all state vectors

  return params;
}
