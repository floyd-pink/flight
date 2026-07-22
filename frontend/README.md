# ✈️ Flight Tracker

A **Next.js web app** that tracks flights in real-time and shows flight history using live ADS-B data from the OpenSky Network.

You can:
- Search arrivals and departures for any airport
- Browse live aircraft flying in any region (Nepal, India, Europe, etc.)
- Track an individual aircraft's full flight path on a map

---

## 🗺️ Features

### 1. Flight History Search
- Search **arrivals** or **departures** for any airport (enter the ICAO code like `VNKT` for Kathmandu)
- Pick a time range (last 24 hours, last 48 hours, or custom)
- Results show flight details in a table
- Click **"See on Map"** to locate that aircraft on the live map

### 2. Live Aircraft States
- See **all aircraft currently flying** in a selected region
- Choose from 27 geographic scopes (global, Nepal, India, Europe, Asia, etc.)
- Results are paginated — 50 planes per page
- Click any row to see full aircraft details
- **"See on Map"** flies the map directly to that plane's position

### 3. Track an Aircraft
- Enter an aircraft's **ICAO24 hex code** (e.g., `3c675a`)
- Optionally enter a past date/time to see its historical track
- Displays the full flight path: time, latitude, longitude, altitude, and heading at every waypoint

### 4. Interactive Map
- Built with **Leaflet** and **react-leaflet**
- Uses CARTO Voyager map tiles
- Default view is centered over Nepal
- Works across all three pages — search, live states, and track

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript |
| **UI & Styling** | React 19 + Tailwind CSS 4 |
| **Maps** | Leaflet + react-leaflet |
| **Data Source** | [OpenSky Network API](https://opensky-network.org/) (live ADS-B data) |
| **Auth** | OAuth2 client credentials flow |

---

## 🚀 How It Works

This app is a **pure frontend** — no separate backend server or database needed.

```
Browser → Next.js Pages → Next.js API Routes → OpenSky Network API
```

1. **You** use the app in your browser
2. **Next.js API Routes** (server-side) act as a middleman — they talk to OpenSky so your browser doesn't have to
3. **OpenSky Network** provides real-time flight data collected from ADS-B receivers around the world
4. The app **caches** live data for 15 seconds to avoid hitting OpenSky's rate limits

### Authentication
OpenSky requires login. The app uses **OAuth2 client credentials** to get a bearer token automatically. The token is cached in memory and refreshed when it expires — you don't need to log in manually.

---

## 📁 Project Structure

```
frontend/
├── app/
│   ├── page.tsx                     # Home: flight search + map
│   ├── live-states/page.tsx         # Live aircraft in a region
│   ├── track-aircraft/page.tsx      # Track a specific aircraft
│   └── api/                         # Next.js API route handlers
│       ├── flights/search/route.ts
│       ├── states/live/route.ts
│       └── tracks/by-aircraft/route.ts
├── src/
│   ├── components/
│   │   ├── FlightMap.tsx            # Reusable Leaflet map
│   │   ├── button.tsx               # "See on Map" button
│   │   └── showCard.tsx             # Aircraft detail card
│   └── showCard.tsx
├── lib/
│   └── live-scope-boxes.ts          # Geographic regions (bounding boxes)
├── server/
│   ├── api.ts                       # OpenSky API client (OAuth2 + all endpoints)
│   └── .env                         # OpenSky credentials
└── package.json
```

---

## ⚙️ Setup

### Prerequisites
- **Node.js** 18+
- **npm** (or yarn / pnpm / bun)
- An **OpenSky Network account** (free) — [Sign up here](https://opensky-network.org/)

### Steps

1. **Clone the repo**
   ```bash
   git clone https://github.com/YOUR_USERNAME/flight.git
   cd flight/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Add your OpenSky credentials**
   
   Create a `.env` file inside `frontend/server/` with:
   ```
   BASE_URL=https://opensky-network.org
   CLIENT_ID=your_client_id
   CLIENT_SECRET=your_client_secret
   ```
   
   Get your `CLIENT_ID` and `CLIENT_SECRET` from your [OpenSky account settings](https://opensky-network.org/).

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   
   Go to [http://localhost:3000](http://localhost:3000)

---

## 📝 Notes

- **Next.js 16** is used in this project. There are breaking changes compared to older versions.
- The map uses Leaflet, which requires `window` (browser environment). The map component is dynamically imported with `ssr: false` to avoid server-side rendering issues.
- Live states are cached in memory for 15 seconds to respect OpenSky's rate limits.
- The app is **Nepal-centric** by default — the map centers on Nepal, and there are presets for Kathmandu (ICAO: `VNKT`) and Nepal airspace.

---

## 📄 License

MIT

---

## 🙋 Questions?

Feel free to open an issue or reach out. Happy tracking! ✈️
