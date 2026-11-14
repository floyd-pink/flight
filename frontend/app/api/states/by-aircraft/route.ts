import { NextResponse } from "next/server";
import { getAllStates } from "../../../../server/api";

export async function GET(request: Request) {
  const icao24 = new URL(request.url).searchParams.get("icao24")?.trim().toLowerCase();

  if (!icao24 || !/^[0-9a-f]{6}$/.test(icao24)) {
    return NextResponse.json(
      { error: "icao24 must be a six-digit hexadecimal aircraft address" },
      { status: 400 },
    );
  }

  try {
    const states = await getAllStates({ icao24: [icao24] });
    return NextResponse.json({ states });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Aircraft lookup failed";
    return NextResponse.json({ error: message }, { status: message.includes("failed: 429") ? 429 : 502 });
  }
}
