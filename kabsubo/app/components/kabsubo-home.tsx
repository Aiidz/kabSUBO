"use client";

import {
  ArrowLeft,
  Compass,
  Eye,
  LocateFixed,
  MapPin,
  Plus,
  Scale,
  Search,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { campusCenter, isWithinCvsuIndangBounds } from "@/app/data/places";
import type { FoodPlace, RankedPlace } from "@/app/data/places";
import { placesApi, recommendationsApi } from "@/app/lib/api/kabsubo-api";
import { MapCanvas, type Coordinates } from "@/app/components/map-canvas";

type LocationState =
  | "idle"
  | "locating"
  | "found"
  | "fallback"
  | "outside-range";
type RouteStatus = "idle" | "loading" | "ready" | "fallback" | "error";
type RouteInfo = {
  placeId: string;
  coordinates: Coordinates[];
  distanceMeters: number;
  durationSeconds: number;
  source: "osrm" | "direct";
};

const campusCenterLabel = "campus center";

export function KabsuboHome() {
  const [approvedPlaces, setApprovedPlaces] = useState<FoodPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [selectedPlaceId, setSelectedPlaceId] = useState("");
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [locationState, setLocationState] = useState<LocationState>("idle");
  const [directionsPlaceId, setDirectionsPlaceId] = useState<string | null>(
    null,
  );
  const [routeStatus, setRouteStatus] = useState<RouteStatus>("idle");
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<RankedPlace[]>([]);

  useEffect(() => {
    placesApi.listApproved().then((result) => {
      setApprovedPlaces(result.data);
      if (result.data.length > 0) {
        setSelectedPlaceId(result.data[0].id);
      }
      setLoading(false);
    });
  }, []);

  const usableUserLocation = locationState === "found" ? userLocation : null;
  const origin = usableUserLocation ?? campusCenter;
  const originLabel =
    locationState === "found" ? "your location" : campusCenterLabel;
  const locationNotice = getLocationNotice(locationState);
  const activeRoute =
    routeInfo && directionsPlaceId
      ? {
          coordinates: routeInfo.coordinates,
          origin,
          destination:
            approvedPlaces.find((place) => place.id === directionsPlaceId)
              ?.coordinates ?? routeInfo.coordinates[routeInfo.coordinates.length - 1],
        }
      : null;

  const rankedResults = useMemo(() => {
    if (!submittedQuery.trim()) {
      return [];
    }

    return searchResults.map((place) => ({
      ...place,
      distanceKm: getDistanceKm(origin, place.coordinates),
      openNow: isOpenNow(place.hours),
    }));
  }, [origin, submittedQuery, searchResults]);

  const matchingPlaceIds = rankedResults.map((place) => place.id);
  const hasSubmitted = submittedQuery.trim().length > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextQuery = query.trim();
    setSubmittedQuery(nextQuery);

    if (!nextQuery) return;

    const result = await recommendationsApi.search(nextQuery);
    const results = result.data.filter((place) => place.matchScore > 0);
    setSearchResults(results);

    const topResult = results[0];
    if (topResult) {
      setSelectedPlaceId(topResult.id);
    }
  }

  function handleBackToLanding() {
    setSubmittedQuery("");
    setSearchResults([]);
    setDirectionsPlaceId(null);
    setRouteInfo(null);
    setRouteStatus("idle");
  }

  function handleToggleCompare(placeId: string) {
    setCompareIds((currentIds) => {
      if (currentIds.includes(placeId)) {
        return currentIds.filter((currentId) => currentId !== placeId);
      }

      if (currentIds.length >= 4) {
        return currentIds;
      }

      return [...currentIds, placeId];
    });
  }

  function setCampusFallback() {
    setUserLocation(campusCenter);
    setLocationState("fallback");
  }

  function handleUseLocation() {
    if (!navigator.geolocation) {
      setCampusFallback();
      return;
    }

    setLocationState("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation: Coordinates = [
          position.coords.longitude,
          position.coords.latitude,
        ];

        if (isWithinCvsuIndangBounds(nextLocation)) {
          setUserLocation(nextLocation);
          setLocationState("found");
          return;
        }

        setUserLocation(null);
        setLocationState("outside-range");
      },
      () => setCampusFallback(),
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 60000 },
    );
  }

  async function handleGetDirections(placeId: string) {
    const destination = approvedPlaces.find((place) => place.id === placeId);

    if (!destination) {
      return;
    }

    setSelectedPlaceId(placeId);
    setDirectionsPlaceId(placeId);
    setRouteStatus("loading");

    const directDistanceMeters =
      getDistanceKm(origin, destination.coordinates) * 1000;

    try {
      const route = await fetchRoute(origin, destination.coordinates);

      setRouteInfo({
        placeId,
        coordinates: route.coordinates,
        distanceMeters: route.distanceMeters,
        durationSeconds: route.durationSeconds,
        source: "osrm",
      });
      setRouteStatus("ready");
    } catch {
      setRouteInfo({
        placeId,
        coordinates: [origin, destination.coordinates],
        distanceMeters: directDistanceMeters,
        durationSeconds: estimateWalkSeconds(directDistanceMeters),
        source: "direct",
      });
      setRouteStatus("fallback");
    }
  }

  if (loading) {
    return (
      <main className="flex h-screen items-center justify-center bg-[#101513]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </main>
    );
  }

  return (
    <main className="relative h-screen min-h-[640px] overflow-hidden bg-[#101513] text-[#171714]">
      <MapCanvas
        places={approvedPlaces}
        selectedPlaceId={selectedPlaceId || undefined}
        highlightedPlaceIds={matchingPlaceIds}
        isFiltering={hasSubmitted}
        userLocation={usableUserLocation}
        route={activeRoute}
        onSelectPlace={setSelectedPlaceId}
      />

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(12,18,15,0.54),rgba(12,18,15,0.12)_46%,rgba(12,18,15,0.08)),linear-gradient(180deg,rgba(12,18,15,0.18),rgba(12,18,15,0)_38%,rgba(12,18,15,0.2))]" />

      {hasSubmitted ? (
        <CompactMapSearch
          query={query}
          locationLabel={originLabel}
          locationNotice={locationNotice}
          onBack={handleBackToLanding}
          onQueryChange={setQuery}
          onSubmit={handleSubmit}
        />
      ) : (
        <LandingSearchCard
          approvedCount={approvedPlaces.length}
          locationState={locationState}
          locationNotice={locationNotice}
          query={query}
          onQueryChange={setQuery}
          onSubmit={handleSubmit}
          onUseLocation={handleUseLocation}
        />
      )}

      {hasSubmitted && (
        <RecommendationsPanel
          results={rankedResults}
          query={submittedQuery}
          originLabel={originLabel}
          directionsPlaceId={directionsPlaceId}
          routeInfo={routeInfo}
          routeStatus={routeStatus}
          compareIds={compareIds}
          onToggleCompare={handleToggleCompare}
          onGetDirections={handleGetDirections}
        />
      )}
    </main>
  );
}

function LandingSearchCard({
  approvedCount,
  locationState,
  locationNotice,
  query,
  onQueryChange,
  onSubmit,
  onUseLocation,
}: {
  approvedCount: number;
  locationState: LocationState;
  locationNotice: string | null;
  query: string;
  onQueryChange: (query: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUseLocation: () => void;
}) {
  return (
    <section className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start px-4 py-5 sm:px-8 sm:py-8 lg:min-h-screen lg:items-center lg:px-14">
      <form
        onSubmit={onSubmit}
        className="pointer-events-auto w-full max-w-[520px] rounded-lg border border-white/55 bg-white/72 p-4 shadow-2xl backdrop-blur-xl sm:p-5"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#7b3320]">
              kabSUBO
            </p>
            <p className="mt-1 text-sm font-semibold text-black/55">
              CvSU Main Campus, Indang, Cavite
            </p>
          </div>
          <span className="grid size-10 place-items-center rounded-lg bg-[#1f6f53] text-white shadow-lg">
            <MapPin size={19} aria-hidden="true" />
          </span>
        </div>

        <label htmlFor="craving" className="block">
          <span className="block text-4xl font-black leading-[1.02] tracking-normal text-[#171714] sm:text-5xl">
            What do you want to eat?
          </span>
        </label>

        <div className="mt-5 flex items-center gap-3 rounded-lg border border-white/70 bg-white/80 px-4 shadow-inner">
          <Search size={19} className="text-[#7b3320]" aria-hidden="true" />
          <input
            id="craving"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            className="h-14 min-w-0 flex-1 bg-transparent text-base font-semibold outline-none placeholder:text-black/42"
            placeholder="Sisig, coffee, burger, noodles..."
          />
          <button
            type="submit"
            className="h-9 rounded-md bg-[#171714] px-3 text-sm font-bold text-white transition hover:bg-[#2a2822]"
          >
            Search
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onUseLocation}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#1f6f53] px-4 text-sm font-bold text-white shadow-lg transition hover:bg-[#185840]"
          >
            <LocateFixed size={17} aria-hidden="true" />
            Use my location
          </button>

          <p className="text-sm font-semibold text-black/58">
            {locationState === "locating"
              ? "Finding your location..."
              : locationState === "found"
                ? "Using your current location"
                : locationState === "outside-range"
                  ? "Outside CvSU area"
                : locationState === "fallback"
                  ? "Using campus center"
                  : `${approvedCount} approved spots nearby`}
          </p>
        </div>
        {locationNotice && (
          <p className="mt-3 rounded-md border border-[#7b3320]/20 bg-[#fff4e7] px-3 py-2 text-sm font-semibold leading-5 text-[#7b3320]">
            {locationNotice}
          </p>
        )}
      </form>
    </section>
  );
}

function CompactMapSearch({
  query,
  locationLabel,
  locationNotice,
  onBack,
  onQueryChange,
  onSubmit,
}: {
  query: string;
  locationLabel: string;
  locationNotice: string | null;
  onBack: () => void;
  onQueryChange: (query: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="pointer-events-none absolute inset-x-3 top-3 z-30 sm:left-6 sm:right-auto sm:top-6 sm:w-[500px]">
      <form
        onSubmit={onSubmit}
        className="pointer-events-auto rounded-lg border border-white/55 bg-white/84 p-2 shadow-2xl backdrop-blur-xl"
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="grid size-10 shrink-0 place-items-center rounded-md bg-[#171714] text-white transition hover:bg-[#2a2822]"
            aria-label="Back to search landing"
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
          <Search size={18} className="text-[#7b3320]" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            className="h-11 min-w-0 flex-1 bg-transparent text-sm font-bold outline-none placeholder:text-black/42"
            placeholder="Search another craving..."
            aria-label="Map search"
          />
          <button
            type="submit"
            className="h-9 rounded-md bg-[#1f6f53] px-3 text-sm font-bold text-white transition hover:bg-[#185840]"
          >
            Search
          </button>
        </div>
        <p className="px-12 pb-1 text-xs font-bold uppercase tracking-[0.16em] text-black/45">
          Map search - from {locationLabel}
        </p>
        {locationNotice && (
          <p className="px-12 pb-1 text-xs font-bold leading-4 text-[#7b3320]">
            {locationNotice}
          </p>
        )}
      </form>
    </section>
  );
}

function getLocationNotice(locationState: LocationState) {
  if (locationState === "outside-range") {
    return "You're outside the CvSU Indang food discovery area. Using campus center for distances and directions.";
  }

  return null;
}

function RecommendationsPanel({
  results,
  query,
  originLabel,
  directionsPlaceId,
  routeInfo,
  routeStatus,
  compareIds,
  onToggleCompare,
  onGetDirections,
}: {
  results: Array<RankedPlace & { distanceKm: number; openNow: boolean }>;
  query: string;
  originLabel: string;
  directionsPlaceId: string | null;
  routeInfo: RouteInfo | null;
  routeStatus: RouteStatus;
  compareIds: string[];
  onToggleCompare: (placeId: string) => void;
  onGetDirections: (placeId: string) => void;
}) {
  const compareHref = `/compare?${new URLSearchParams({
    ids: compareIds.join(","),
    q: query,
  }).toString()}`;

  return (
    <aside className="absolute inset-x-3 bottom-3 z-20 max-h-[52vh] overflow-y-auto rounded-lg border border-white/55 bg-white/86 p-4 shadow-2xl backdrop-blur-xl lg:inset-y-6 lg:left-auto lg:right-6 lg:w-[450px] lg:max-h-none">
      <div className="sticky top-0 z-10 -mx-4 -mt-4 border-b border-black/10 bg-white/90 px-4 py-4 backdrop-blur-xl">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7b3320]">
          Ranked recommendations
        </p>
        <h2 className="mt-1 text-2xl font-black">
          {results.length} match{results.length === 1 ? "" : "es"}{" "}
          for &quot;
          {query}&quot;
        </h2>
        <p className="mt-1 text-sm font-semibold text-black/55">
          Distances are measured from {originLabel}.
        </p>
        {compareIds.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#1f6f53]/20 bg-[#eef7ef] px-3 py-2">
            <p className="text-sm font-black text-[#185840]">
              {compareIds.length}/4 selected for compare
            </p>
            {compareIds.length >= 2 ? (
              <Link
                href={compareHref}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#171714] px-3 text-xs font-bold text-white transition hover:bg-[#2a2822]"
              >
                <Scale size={14} aria-hidden="true" />
                Open compare
              </Link>
            ) : (
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#7b3320]">
                Pick one more
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {results.length === 0 ? (
          <div className="rounded-lg border border-black/10 bg-white/70 p-4">
            <p className="font-bold">No matching spots yet.</p>
            <p className="mt-1 text-sm text-black/60">
              Try a menu item like sisig, burger, coffee, noodles, or budget.
            </p>
          </div>
        ) : (
          results.map((place, index) => {
            const isSelectedForCompare = compareIds.includes(place.id);
            const compareLimitReached =
              compareIds.length >= 4 && !isSelectedForCompare;

            return (
              <article
                key={place.id}
                className="rounded-lg border border-black/10 bg-white/78 p-4 shadow-sm"
              >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7b3320]">
                    #{index + 1} result
                  </p>
                  <h3 className="mt-1 text-xl font-black">{place.name}</h3>
                </div>
                <span
                  className={`rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${
                    place.openNow
                      ? "bg-[#e8f5ea] text-[#1f6f53]"
                      : "bg-[#f3e7df] text-[#7b3320]"
                  }`}
                >
                  {place.openNow ? "Open now" : "Closed"}
                </span>
              </div>

              <div className="mt-3 flex gap-3">
                {place.bestSeller.imageUrl ? (
                  <Image
                    src={place.bestSeller.imageUrl}
                    alt={place.bestSeller.name}
                    width={80}
                    height={80}
                    className="h-20 w-20 shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <div className="h-20 w-20 shrink-0 rounded-md bg-gradient-to-br from-[#2a1a0e] via-[#1f1a17] to-[#171714]" />
                )}
                <div className="min-w-0 text-sm">
                  <p className="font-bold text-black/70">
                    Best sellers: {place.menuHighlights.slice(0, 2).join(", ")}
                  </p>
                  <p className="mt-1 font-semibold text-[#7b3320]">
                    Matched: {place.matchedMenuItems.join(", ")}
                  </p>
                  <p className="mt-2 text-black/58">
                    {place.distanceKm.toFixed(1)} km from {originLabel} -{" "}
                    {place.priceRange}
                  </p>
                  <p className="mt-1 text-black/58">{place.hours}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <Link
                  href={`/place/${place.id}`}
                  className="inline-flex h-10 items-center justify-center gap-1 rounded-md border border-black/10 bg-white px-2 text-[11px] font-bold text-[#171714] transition hover:border-[#1f6f53]"
                >
                  <Eye size={14} aria-hidden="true" />
                  View details
                </Link>
                <button
                  type="button"
                  onClick={() => onToggleCompare(place.id)}
                  disabled={compareLimitReached}
                  className={`inline-flex h-10 items-center justify-center gap-1 rounded-md border px-2 text-[11px] font-bold transition ${
                    isSelectedForCompare
                      ? "border-[#1f6f53] bg-[#eef7ef] text-[#185840]"
                      : "border-black/10 bg-white text-[#171714] hover:border-[#1f6f53] disabled:cursor-not-allowed disabled:opacity-45"
                  }`}
                >
                  <Plus size={14} aria-hidden="true" />
                  {isSelectedForCompare ? "Added" : "Add to compare"}
                </button>
                <button
                  type="button"
                  onClick={() => onGetDirections(place.id)}
                  className="inline-flex h-10 items-center justify-center gap-1 rounded-md bg-[#1f6f53] px-2 text-[11px] font-bold text-white transition hover:bg-[#185840]"
                >
                  <Compass size={14} aria-hidden="true" />
                  Get directions
                </button>
              </div>

              {directionsPlaceId === place.id && (
                <div className="mt-3 rounded-md border border-[#1f6f53]/25 bg-[#eef7ef] px-3 py-2 text-sm font-semibold text-[#185840]">
                  {routeStatus === "loading" && "Drawing route on the map..."}
                  {routeStatus === "ready" && routeInfo && (
                    <>
                      Route ready: {formatDistance(routeInfo.distanceMeters)} -{" "}
                      {formatDuration(routeInfo.durationSeconds)}
                    </>
                  )}
                  {routeStatus === "fallback" && routeInfo && (
                    <>
                      Direct route shown:{" "}
                      {formatDistance(routeInfo.distanceMeters)} -{" "}
                      {formatDuration(routeInfo.durationSeconds)}
                    </>
                  )}
                  {routeStatus === "error" && "Route is unavailable right now."}
                </div>
              )}
              </article>
            );
          })
        )}
      </div>
    </aside>
  );
}

function getDistanceKm(from: Coordinates, to: Coordinates) {
  const earthRadiusKm = 6371;
  const [fromLng, fromLat] = from;
  const [toLng, toLat] = to;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchRoute(origin: Coordinates, destination: Coordinates) {
  const response = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?overview=full&geometries=geojson`,
  );

  if (!response.ok) {
    throw new Error("Route request failed");
  }

  const data = (await response.json()) as {
    routes?: Array<{
      geometry: { coordinates: Coordinates[] };
      distance: number;
      duration: number;
    }>;
  };

  const route = data.routes?.[0];

  if (!route || route.geometry.coordinates.length < 2) {
    throw new Error("Route response was empty");
  }

  return {
    coordinates: route.geometry.coordinates,
    distanceMeters: route.distance,
    durationSeconds: route.duration,
  };
}

function estimateWalkSeconds(distanceMeters: number) {
  return distanceMeters / 1.2;
}

function formatDistance(meters: number) {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0
    ? `${hours} hr ${remainingMinutes} min`
    : `${hours} hr`;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function isOpenNow(hours: string) {
  const match = hours.match(
    /(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i,
  );

  if (!match) {
    return false;
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = toMinutes(match[1], match[2], match[3]);
  const closeMinutes = toMinutes(match[4], match[5], match[6]);

  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
}

function toMinutes(hour: string, minute: string, period: string) {
  const parsedHour = Number(hour);
  const normalizedHour =
    period.toUpperCase() === "PM" && parsedHour !== 12
      ? parsedHour + 12
      : period.toUpperCase() === "AM" && parsedHour === 12
        ? 0
        : parsedHour;

  return normalizedHour * 60 + Number(minute);
}
