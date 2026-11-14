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
    const timeParam = url.searchParams.get("time");
    const time = timeParam === null ? 0 : parseUnixTime(timeParam);

    if (!icao24 || !/^[0-9a-f]{6}$/.test(icao24)) {
        return NextResponse.json({ error: "icao24 must be a six-digit hexadecimal aircraft address" }, { status: 400 });
    }
    if (time === null || time < 0 || time > Math.floor(Date.now() / 1000)) {
        return NextResponse.json({ error: "time must be a valid past Unix timestamp or 0" }, { status: 400 });
    }

    try {
        const track = await getTrackByAircraft(icao24, time);
        return NextResponse.json(track);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: message.includes("failed: 429") ? 429 : 502 });
    }
}
