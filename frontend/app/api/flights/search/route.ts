import { NextResponse } from "next/server";
import { getArrivalsByAirport, getDeparturesByAirport } from "../../../../server/api";

type SearchType = "arrival" | "departure";

function parseUnixTime(value: string | null): number | null {
    if (!value) return null;

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: Request) {
    const url = new URL(request.url);
    const airport = url.searchParams.get("airport")?.trim().toUpperCase();
    const type = url.searchParams.get("type") as SearchType | null;
    const begin = parseUnixTime(url.searchParams.get("begin"));
    const end = parseUnixTime(url.searchParams.get("end"));

    if (!airport || !type || begin === null || end === null) {
        return NextResponse.json(
            { error: "airport, type, begin, and end are required" },
            { status: 400 }
        );
    }

    if (begin >= end) {
        return NextResponse.json(
            { error: "begin must be earlier than end" },
            { status: 400 }
        );
    }

    try {
        const records =
            type === "departure"
                ? await getDeparturesByAirport(airport, begin, end)
                : await getArrivalsByAirport(airport, begin, end);

        return NextResponse.json(records);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}