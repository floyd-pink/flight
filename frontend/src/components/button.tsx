// src/components/button.tsx
"use client";

import type { LiveState } from "@/app/live-states/page";

interface TrackButtonProps {
  plane: LiveState;
  onShowOnMap: (selectedPlane: LiveState) => void;
}

export default function TrackButton({ plane, onShowOnMap }: TrackButtonProps) {
  // Safe-guard: disable button if OpenSky didn't capture valid spatial positions yet
  const hasCoordinates = plane.latitude !== null && plane.longitude !== null;

  return (
    <button
      disabled={!hasCoordinates}
      onClick={() => onShowOnMap(plane)}
      className={`w-full rounded-lg py-2 px-4 text-xs font-semibold text-white transition-all active:scale-[0.98]
        ${
          hasCoordinates
            ? "bg-blue-600 hover:bg-blue-500 cursor-pointer shadow-md shadow-blue-600/10"
            : "bg-zinc-800 border border-zinc-700 text-zinc-500 cursor-not-allowed"
        }`}
    >
      {plane.onGround ? "Locate Ground Craft" : "See on Map ✈️"}
    </button>
  );
}
