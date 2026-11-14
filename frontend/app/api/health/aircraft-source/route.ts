import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch(
      "https://opendata.adsb.fi/api/v3/lat/27.7172/lon/85.324/dist/200",
      { cache: "no-store", signal: AbortSignal.timeout(8000) },
    );
    if (!response.ok) {
      return NextResponse.json({ source: "adsb.fi", upstreamStatus: response.status }, { status: 502 });
    }
    const data = await response.json();
    return NextResponse.json({ source: "adsb.fi", aircraftCount: Array.isArray(data.ac) ? data.ac.length : null });
  } catch (error) {
    const cause = error instanceof Error ? error.cause : null;
    const message = cause instanceof Error ? cause.message : error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ source: "adsb.fi", error: message }, { status: 502 });
  }
}
