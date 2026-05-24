"use client";

import type { Feature, LineString } from "geojson";
import { useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import maplibregl, {
  type GeoJSONSource,
  type Map,
  type Marker,
} from "maplibre-gl";
import {
  campusCenter,
  cvsuIndangBounds,
  type FoodPlace,
} from "@/app/data/places";

export type Coordinates = [number, number];

export type MapRouteData = {
  coordinates: Coordinates[];
  origin: Coordinates;
  destination: Coordinates;
};

type MapCanvasProps = {
  places: FoodPlace[];
  selectedPlaceId?: string;
  highlightedPlaceIds?: string[];
  isFiltering?: boolean;
  userLocation?: Coordinates | null;
  route?: MapRouteData | null;
  onSelectPlace: (placeId: string) => void;
};

type MarkerInstance = {
  marker: Marker;
  markerRoot: Root;
  popupRoot: Root;
};

function cleanupMarkerInstance({ marker, markerRoot, popupRoot }: MarkerInstance) {
  marker.remove();
  window.setTimeout(() => {
    markerRoot.unmount();
    popupRoot.unmount();
  }, 0);
}

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
  highlightedPlaceIds = [],
  isFiltering = false,
  userLocation,
  route,
  onSelectPlace,
}: MapCanvasProps) {
  const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<MarkerInstance[]>([]);
  const userMarkerRef = useRef<Marker | null>(null);
  const routeStartMarkerRef = useRef<Marker | null>(null);
  const routeEndMarkerRef = useRef<Marker | null>(null);

  useEffect(() => {
    if (!mapContainer || mapRef.current) {
      return;
    }

    let isDisposed = false;
    const map = new maplibregl.Map({
      container: mapContainer,
      style: osmStyle,
      center: campusCenter,
      zoom: 15.5,
      minZoom: 14,
      maxZoom: 18,
      maxBounds: cvsuIndangBounds,
      pitch: 42,
      bearing: -12,
      attributionControl: { compact: true },
    });

    mapRef.current = map;
    map.once("load", () => {
      if (!isDisposed) {
        setMapReady(true);
      }
    });

    return () => {
      isDisposed = true;
      markersRef.current.forEach(cleanupMarkerInstance);
      markersRef.current = [];
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      routeStartMarkerRef.current?.remove();
      routeStartMarkerRef.current = null;
      routeEndMarkerRef.current?.remove();
      routeEndMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [mapContainer]);

  useEffect(() => {
    if (!mapRef.current || !mapReady) {
      return;
    }

    markersRef.current.forEach(cleanupMarkerInstance);
    const highlightedIds = new Set(highlightedPlaceIds);

    markersRef.current = places.map((place) => {
      const isSelected = place.id === selectedPlaceId;
      const isDimmed = isFiltering && !highlightedIds.has(place.id);
      const markerElement = document.createElement("button");
      markerElement.type = "button";
      markerElement.className = "mapcn-marker-shell";
      markerElement.setAttribute("aria-label", `Select ${place.name}`);
      markerElement.addEventListener("click", () => onSelectPlace(place.id));
      markerElement.addEventListener("mouseenter", () => marker.togglePopup());
      markerElement.addEventListener("mouseleave", () => marker.togglePopup());

      const markerRoot = createRoot(markerElement);
      markerRoot.render(
        <MapcnMarkerContent isDimmed={isDimmed} isSelected={isSelected} />,
      );

      const popupElement = document.createElement("div");
      const popupRoot = createRoot(popupElement);
      popupRoot.render(<MapcnMarkerPopup place={place} />);

      const marker = new maplibregl.Marker({
        element: markerElement,
        anchor: "bottom",
      })
        .setLngLat(place.coordinates)
        .setPopup(
          new maplibregl.Popup({
            offset: 18,
            closeButton: false,
            className: "food-popup",
          }).setDOMContent(popupElement),
        )
        .addTo(mapRef.current as Map);

      return { marker, markerRoot, popupRoot };
    });
  }, [
    highlightedPlaceIds,
    isFiltering,
    mapReady,
    onSelectPlace,
    places,
    selectedPlaceId,
  ]);

  useEffect(() => {
    const selectedPlace = places.find((place) => place.id === selectedPlaceId);

    if (!mapRef.current || !selectedPlace || userLocation) {
      return;
    }

    mapRef.current.flyTo({
      center: selectedPlace.coordinates,
      zoom: 16,
      offset: [-180, 0],
      duration: 800,
    });
  }, [places, selectedPlaceId, userLocation]);

  useEffect(() => {
    if (!mapRef.current || !userLocation) {
      return;
    }

    userMarkerRef.current?.remove();

    const markerElement = document.createElement("div");
    markerElement.className = "user-location-marker";

    userMarkerRef.current = new maplibregl.Marker({
      element: markerElement,
      anchor: "center",
    })
      .setLngLat(userLocation)
      .addTo(mapRef.current);

    mapRef.current.flyTo({
      center: userLocation,
      zoom: 16,
      duration: 900,
    });
  }, [userLocation]);

  useEffect(() => {
    if (!mapRef.current || !mapReady) {
      return;
    }

    const map = mapRef.current;

    routeStartMarkerRef.current?.remove();
    routeStartMarkerRef.current = null;
    routeEndMarkerRef.current?.remove();
    routeEndMarkerRef.current = null;

    if (!route || route.coordinates.length < 2) {
      if (map.getLayer("active-route")) {
        map.removeLayer("active-route");
      }

      if (map.getLayer("active-route-outline")) {
        map.removeLayer("active-route-outline");
      }

      if (map.getSource("active-route")) {
        map.removeSource("active-route");
      }

      return;
    }

    const routeGeoJson: Feature<LineString> = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: route.coordinates,
      },
    };

    const existingSource = map.getSource("active-route");

    if (existingSource) {
      (existingSource as GeoJSONSource).setData(routeGeoJson);
    } else {
      map.addSource("active-route", {
        type: "geojson",
        data: routeGeoJson,
      });

      map.addLayer({
        id: "active-route-outline",
        type: "line",
        source: "active-route",
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#fffaf0",
          "line-width": 9,
          "line-opacity": 0.88,
        },
      });

      map.addLayer({
        id: "active-route",
        type: "line",
        source: "active-route",
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#1f6f53",
          "line-width": 5,
          "line-opacity": 0.96,
        },
      });
    }

    const startElement = document.createElement("div");
    startElement.className = "route-endpoint-marker is-origin";
    routeStartMarkerRef.current = new maplibregl.Marker({
      element: startElement,
      anchor: "center",
    })
      .setLngLat(route.origin)
      .addTo(map);

    const endElement = document.createElement("div");
    endElement.className = "route-endpoint-marker is-destination";
    routeEndMarkerRef.current = new maplibregl.Marker({
      element: endElement,
      anchor: "center",
    })
      .setLngLat(route.destination)
      .addTo(map);

    const bounds = route.coordinates.reduce(
      (nextBounds, coordinate) => nextBounds.extend(coordinate),
      new maplibregl.LngLatBounds(route.coordinates[0], route.coordinates[0]),
    );

    map.fitBounds(bounds, {
      padding: { top: 120, right: 480, bottom: 90, left: 90 },
      duration: 900,
      maxZoom: 16.5,
    });
  }, [mapReady, route]);

  return <div ref={setMapContainer} className="h-full min-h-screen w-full" />;
}

function MapcnMarkerContent({
  isDimmed,
  isSelected,
}: {
  isDimmed: boolean;
  isSelected: boolean;
}) {
  return (
    <span
      className={[
        "map-marker",
        isSelected ? "is-selected" : "",
        isDimmed ? "is-dimmed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="map-marker-dot" />
    </span>
  );
}

function MapcnMarkerPopup({ place }: { place: FoodPlace }) {
  return (
    <article className="food-popup-card">
      <div className="food-popup-image">
        {place.bestSeller.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={place.bestSeller.imageUrl} alt={place.bestSeller.name} />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-[#2a1a0e] via-[#1f1a17] to-[#171714]" />
        )}
        <span>{place.type}</span>
      </div>
      <div className="food-popup-body">
        <p className="food-popup-kicker">{place.type}</p>
        <h3>{place.name}</h3>
        <p className="food-popup-description">{place.description}</p>
        <div className="food-popup-meta">
          <span className="food-popup-rating">
            Star {place.rating.toFixed(1)} <small>({place.reviews})</small>
          </span>
          <span>{place.walkTime}</span>
        </div>
        <div className="food-popup-line">
          <strong>{place.bestSeller.name}</strong>
          <span>{place.priceRange}</span>
        </div>
        <div className="food-popup-line">
          <span>{place.hours}</span>
        </div>
        <div className="food-popup-chips">
          {place.menuHighlights.slice(0, 3).map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <div className="food-popup-actions">
          <a href={`/place/${place.id}`}>View details</a>
          <button type="button">Add to compare</button>
          <button type="button" className="is-primary">
            Get directions
          </button>
        </div>
      </div>
    </article>
  );
}
