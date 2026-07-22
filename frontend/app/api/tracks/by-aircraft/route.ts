import { NextResponse } from "next/server";
import { getTrackByAircraft } from "../../../../server/api";

function parseUnixTime(value: string | null): number | null {
    if (value === null || value === "") {
        return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: Request) {
    const url = new URL(request.url);
    const icao24 = url.searchParams.get("icao24")?.trim().toLowerCase();
    const time = parseUnixTime(url.searchParams.get("time")) ?? 0;

    if (!icao24) {
        return NextResponse.json({ error: "icao24 is required" }, { status: 400 });
    }

    try {
        const track = await getTrackByAircraft(icao24, time);
        return NextResponse.json(track);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}