"use client";

import { useEffect, useRef } from "react";
import maplibregl, { type Map, type Marker } from "maplibre-gl";
import { cvsuIndangBounds, type FoodPlace } from "@/app/data/places";

const insetStyle: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
    },
  ],
};

export function PlaceInsetMap({ place }: { place: FoodPlace }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markerRef = useRef<Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: insetStyle,
      center: place.coordinates,
      zoom: 16,
      minZoom: 14,
      maxZoom: 18,
      maxBounds: cvsuIndangBounds,
      attributionControl: { compact: true },
      interactive: true,
    });

    const markerElement = document.createElement("div");
    markerElement.className = "place-inset-marker";

    markerRef.current = new maplibregl.Marker({
      element: markerElement,
      anchor: "bottom",
    })
      .setLngLat(place.coordinates)
      .addTo(mapRef.current);

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [place]);

  return <div ref={containerRef} className="h-[280px] w-full" />;
}
