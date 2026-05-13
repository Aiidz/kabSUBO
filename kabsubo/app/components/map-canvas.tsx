"use client";

import { useEffect, useRef } from "react";
import maplibregl, { type Map, type Marker } from "maplibre-gl";
import { campusCenter, type FoodPlace } from "@/app/data/places";

type MapCanvasProps = {
  places: FoodPlace[];
  selectedPlaceId: string;
  onSelectPlace: (placeId: string) => void;
};

const osmStyle: maplibregl.StyleSpecification = {
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

export function MapCanvas({
  places,
  selectedPlaceId,
  onSelectPlace,
}: MapCanvasProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    mapRef.current = new maplibregl.Map({
      container: mapContainerRef.current,
      style: osmStyle,
      center: campusCenter,
      zoom: 15,
      pitch: 42,
      bearing: -12,
      attributionControl: { compact: true },
    });

    mapRef.current.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      "bottom-right",
    );

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = places.map((place) => {
      const markerElement = document.createElement("button");
      markerElement.type = "button";
      markerElement.className =
        place.id === selectedPlaceId ? "map-marker is-selected" : "map-marker";
      markerElement.setAttribute("aria-label", `Select ${place.name}`);
      markerElement.addEventListener("click", () => onSelectPlace(place.id));

      return new maplibregl.Marker({
        element: markerElement,
        anchor: "bottom",
      })
        .setLngLat(place.coordinates)
        .setPopup(
          new maplibregl.Popup({ offset: 18, closeButton: false }).setHTML(
            `<strong>${place.name}</strong><span>${place.type} - ${place.priceRange}</span>`,
          ),
        )
        .addTo(mapRef.current as Map);
    });
  }, [onSelectPlace, places, selectedPlaceId]);

  useEffect(() => {
    const selectedPlace = places.find((place) => place.id === selectedPlaceId);

    if (!mapRef.current || !selectedPlace) {
      return;
    }

    mapRef.current.flyTo({
      center: selectedPlace.coordinates,
      zoom: 16,
      duration: 800,
    });
  }, [places, selectedPlaceId]);

  return <div ref={mapContainerRef} className="h-full min-h-[420px] w-full" />;
}
