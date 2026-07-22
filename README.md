# Flight Tracker

A real-time flight tracking dashboard built with Next.js 16. It connects to the OpenSky Network to show live aircraft positions, flight history for any airport, and individual aircraft tracks on an interactive map.

---

## What it does

### 1. Flight history search
Enter any airport ICAO code (e.g. `VNKT` for Kathmandu), pick arrivals or departures, choose a time window, and see past flights in a table. Click **"See on Map"** to try and locate that aircraft on the live map.

### 2. Live aircraft states
Browse all aircraft currently transmitting ADS-B signals in a selected region. Choose from 27 geographic scopes (Nepal, India, Europe, USA, etc.). Results are paginated (50 per page). Click a row for details or **"See on Map"** to fly the map directly to that plane.

### 3. Track an aircraft
Enter an aircraft's ICAO24 hex code (e.g. `3c675a`) and optionally a past date/time. The app fetches the full flight path — time, latitude, longitude, altitude, and heading at every waypoint.

### Interactive map
All three pages share a Leaflet map (CARTO Voyager tiles) centered over Nepal by default. When you select an aircraft, the map flies to its position and shows a popup with callsign and ICAO.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI | React 19 + Tailwind CSS 4 |
| Maps | Leaflet + react-leaflet |
| Data | OpenSky Network API ( ADS-B) |
| Auth | OAuth2 client credentials |

---

## How it works

```
Browser → Next.js pages → Next.js API routes → OpenSky Network API
```

The app is a **pure frontend** — there is no separate backend or database.

- **Next.js API Route Handlers** act as a server-side proxy so the browser never talks to OpenSky directly (avoids CORS and keeps credentials safe).
- **OAuth2 client credentials** are used to get a bearer token from OpenSky's auth server. The token is cached in memory and refreshed automatically.
- **Live states are cached in memory for 15 seconds** to respect OpenSky's rate limits.

---

## Project structure

```
frontend/
├── app/
│   ├── page.tsx                          # Home: flight history search + map
│   ├── live-states/page.tsx              # Live aircraft in a selected region
│   ├── track-aircraft/page.tsx           # Track a specific aircraft
│   └── api/                              # Next.js API route handlers
│       ├── flights/search/route.ts
│       ├── states/live/route.ts
│       └── tracks/by-aircraft/route.ts
├── src/
│   ├── components/
│   │   ├── FlightMap.tsx                 # Reusable Leaflet map
│   │   ├── button.tsx                    # "See on Map" button
│   │   └── showCard.tsx                  # Aircraft detail card
│   └── showCard.tsx
├── lib/
│   └── live-scope-boxes.ts               # 27 geographic regions (bounding boxes)
├── server/
│   ├── api.ts                            # OpenSky API client + OAuth2
│   └── .env                              # OpenSky credentials (not committed)
└── package.json
```

---

## Setup

### Prerequisites
- **Node.js** 18+
- **npm**
- An **OpenSky Network account** (free) — sign up at [opensky-network.org](https://opensky-network.org/)

### Steps

1. **Clone the repo**
   ```bash
   git clone https://github.com/floyd-pink/flight.git
   cd flight/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Add your OpenSky credentials**

   Create a `.env` file inside `frontend/server/`. You can copy `.env.example` as a starting point:
   ```
   OPENSKY_CLIENT_ID=your_client_id
   OPENSKY_CLIENT_SECRET=your_client_secret
   ```

   Get your credentials from your [OpenSky account settings](https://opensky-network.org/).

   > **Note:** The app has hardcoded fallback credentials in `server/api.ts` for demo purposes. Remove or replace them with your own credentials for production use.

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**

   Go to [http://localhost:3000](http://localhost:3000)

---

## Build for production

```bash
npm run build
npm run start
```

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENSKY_CLIENT_ID` | Yes | Your OpenSky OAuth2 client ID |
| `OPENSKY_CLIENT_SECRET` | Yes | Your OpenSky OAuth2 client secret |

---

## Notes

- **Next.js 16** is used. This version has breaking changes from older releases — read the [Next.js 16 migration guide](https://nextjs.org/docs/app/building-your-application/upgrading/version-16) if you are familiar with older versions.
- **Leaflet** requires `window` (browser environment). The map component is dynamically imported with `ssr: false` to prevent server-side rendering errors.
- The app is **Nepal-centric** by default — the map centers on Nepal and Kathmandu (`VNKT`) is the default airport search.
- **OpenSky rate limits** are strict. The live states endpoint is cached for 15 seconds and deduplicates concurrent requests.

---

## License

MIT
