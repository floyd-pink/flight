import { NextResponse } from "next/server";
import {
  getAllStates,
  getLiveStatesByScope,
  type Flight,
} from "../../../../server/api";
import { type LiveScope, isLiveScope } from "../../../../lib/live-scope-boxes"; 

// ── Cache ─────────────────────────────────────────────
interface CacheEntry {
  data: Flight[];
  lastFetch: number;
  // tracks an in-flight fetch so concurrent requests for the same scope
  // don't all hit OpenSky at once (important given the tight rate limit)
  inFlight: Promise<Flight[]> | null;
}

type CacheStore = Partial<Record<LiveScope, CacheEntry>>;

const memoryCache: CacheStore = {};
const CACHE_DURATION = 15_000; // 15 seconds

function getCacheEntry(scope: LiveScope): CacheEntry {
  if (!memoryCache[scope]) {
    memoryCache[scope] = { data: [], lastFetch: 0, inFlight: null };
  }
  return memoryCache[scope]!;
}

async function fetchScopeData(scope: LiveScope): Promise<Flight[]> {
  return scope === "global"
    ? getAllStates({ extended: true })
    : getLiveStatesByScope(scope);
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  // ── Validate pagination params ──
  const pageParam = Number(url.searchParams.get("page") ?? "1");
  const limitParam = Number(url.searchParams.get("limit") ?? "50");

  const page =
    Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
  const limit =
    Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(Math.floor(limitParam), 500) // hard cap to avoid huge payloads
      : 50;

  // ── Validate scope using the shared type guard ──
  const scopeParam = url.searchParams.get("scope") ?? "nepal";

  if (!isLiveScope(scopeParam)) {
    return NextResponse.json(
      { error: `Unsupported scope: ${scopeParam}` },
      { status: 400 },
    );
  }
  const scope: LiveScope = scopeParam;

  try {
    const now = Date.now();
    const entry = getCacheEntry(scope);
    const isStale = now - entry.lastFetch > CACHE_DURATION;

    if (isStale) {
      if (!entry.inFlight) {
        console.log(`Cache miss! Fetching fresh streams for scope: ${scope}`);

        entry.inFlight = fetchScopeData(scope)
          .then((freshData) => {
            entry.data = freshData ?? [];
            entry.lastFetch = Date.now();
            return entry.data;
          })
          .catch((err) => {
            console.error(`Failed to fetch scope "${scope}":`, err);
            // Serve stale data if we have any, rather than failing the request
            if (entry.data.length > 0) {
              console.warn(`Serving stale data for scope: ${scope}`);
              return entry.data;
            }
            throw err;
          })
          .finally(() => {
            entry.inFlight = null;
          });
      } else {
        console.log(`Fetch already in-flight for scope: ${scope}, awaiting it`);
      }

      await entry.inFlight;
    } else {
      console.log(`Cache hit! Serving from memory for scope: ${scope}`);
    }

    // ── Paginate ──
    const activeData = entry.data;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedStates = activeData.slice(start, end);

    return NextResponse.json({
      scope,
      page,
      limit,
      totalResults: activeData.length,
      totalPages: Math.ceil(activeData.length / limit),
      states: paginatedStates,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Error serving scope "${scope}":`, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
