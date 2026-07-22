"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";

export interface FlightMapTrack {
  icao24: string;
  callsign: string;
  latitude: number;
  longitude: number;
}

function CameraDirector({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) {
      map.flyTo([lat, lng], 9, { animate: true, duration: 1.2 });
    }
  }, [lat, lng, map]);
  return null;
}

export default function FlightMap({
  activeTrack,
}: {
  activeTrack: FlightMapTrack | null;
}) {
  const defaultCenter: [number, number] = [27.7172, 85.324]; // Default centered over Nepal

  const planeIcon = L.divIcon({
    html: `<div style="font-size: 32px; text-align: center;">🛩️</div>`,
    className: "custom-leaflet-plane",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  return (
    <div className="w-full h-full">
      <MapContainer
        center={defaultCenter}
        zoom={6}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        {activeTrack && (
          <>
            <CameraDirector
              lat={activeTrack.latitude}
              lng={activeTrack.longitude}
            />
            <Marker
              position={[activeTrack.latitude, activeTrack.longitude]}
              icon={planeIcon}
            >
              <Popup>
                <div className="p-1 font-sans text-xs">
                  <h4 className="font-bold text-blue-600 text-sm">
                    Callsign: {activeTrack.callsign}
                  </h4>
                  <p className="text-zinc-500 font-mono mt-0.5">
                    ICAO: {activeTrack.icao24}
                  </p>
                </div>
              </Popup>
            </Marker>
          </>
        )}
      </MapContainer>
    </div>
  );
}
