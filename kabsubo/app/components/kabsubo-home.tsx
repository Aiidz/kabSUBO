"use client";

import {
  ArrowLeft,
  Bot,
  Compass,
  Eye,
  Heart,
  LocateFixed,
  MapPin,
  Plus,
  Scale,
  Search,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import {
  campusCenter,
  foodPlaces,
  isWithinCvsuIndangBounds,
  rankPlaces,
  type RankedPlace,
} from "@/app/data/places";
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

export function KabsuboHome({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const approvedPlaces = useMemo(
    () => foodPlaces.filter((place) => place.status === "approved"),
    [],
  );
  const [query, setQuery] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
  const [selectedPlaceId, setSelectedPlaceId] = useState(approvedPlaces[0].id);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [locationState, setLocationState] = useState<LocationState>("idle");
  const [directionsPlaceId, setDirectionsPlaceId] = useState<string | null>(
    null,
  );
  const [routeStatus, setRouteStatus] = useState<RouteStatus>("idle");
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);

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

    return rankPlaces(submittedQuery)
      .filter((place) => place.status === "approved" && place.matchScore > 0)
      .map((place) => ({
        ...place,
        distanceKm: getDistanceKm(origin, place.coordinates),
        openNow: isOpenNow(place.hours),
      }));
  }, [origin, submittedQuery]);

  const matchingPlaceIds = rankedResults.map((place) => place.id);
  const hasSubmitted = submittedQuery.trim().length > 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextQuery = query.trim();

    if (nextQuery) {
      router.push(`/results?q=${encodeURIComponent(nextQuery)}`);
    }

    setSubmittedQuery(nextQuery);

    const nextTopResult = rankPlaces(nextQuery).find(
      (place) => place.status === "approved" && place.matchScore > 0,
    );

    if (nextTopResult) {
      setSelectedPlaceId(nextTopResult.id);
    }
  }

  function handleBackToLanding() {
    setSubmittedQuery("");
    setDirectionsPlaceId(null);
    setRouteInfo(null);
    setRouteStatus("idle");
    router.push("/");
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

  return (
    <main className="relative h-screen min-h-[640px] overflow-hidden bg-[#101513] text-[#171714]">
      <MapCanvas
        places={approvedPlaces}
        selectedPlaceId={selectedPlaceId}
        highlightedPlaceIds={matchingPlaceIds}
        isFiltering={hasSubmitted}
        userLocation={usableUserLocation}
        route={activeRoute}
        onSelectPlace={setSelectedPlaceId}
      />

      <div className="pointer-events-none absolute inset-0 bg-[#fffaf0]/42" />

      {hasSubmitted ? (
        <ResultsBackButton onBack={handleBackToLanding} />
      ) : (
        <LandingSearchCard
          locationState={locationState}
          locationNotice={locationNotice}
          query={query}
          onQueryChange={setQuery}
          onSubmit={handleSubmit}
          onUseLocation={handleUseLocation}
        />
      )}

      <HomeFloatingActions isResultsView={hasSubmitted} />

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
  locationState,
  locationNotice,
  query,
  onQueryChange,
  onSubmit,
  onUseLocation,
}: {
  locationState: LocationState;
  locationNotice: string | null;
  query: string;
  onQueryChange: (query: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUseLocation: () => void;
}) {
  return (
    <section className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4 pt-24 sm:px-8 sm:pt-28">
      <form
        onSubmit={onSubmit}
        className="pointer-events-auto w-full max-w-[460px] rounded-[18px] border-2 border-[#004b35] bg-[#fffaf0]/96 px-7 py-7 shadow-[0_16px_36px_rgba(0,75,53,0.16)] sm:px-8"
      >
        <h1 className="text-center text-3xl font-black tracking-normal text-[#073d33] sm:text-4xl">
          Anong Cravings Today
        </h1>

        <label
          htmlFor="craving"
          className="mt-7 block text-base font-black text-[#073d33]"
        >
          Cravings
        </label>

        <div className="mt-1 flex h-10 items-center rounded-md border border-[#004b35] bg-[#fffdf4] px-3">
          <input
            id="craving"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-lg font-semibold text-[#073d33] outline-none placeholder:text-[#073d33]/70"
            placeholder="sisig, burger, chicken, ..."
          />
          <Search size={20} className="shrink-0 text-[#073d33]/75" aria-hidden="true" />
        </div>

        <button
          type="button"
          onClick={onUseLocation}
          className="mt-4 inline-flex items-center gap-2 text-base font-bold text-[#073d33]/78 transition hover:text-[#004b35]"
        >
          <LocateFixed size={18} aria-hidden="true" />
          {locationState === "locating"
            ? "Finding your location..."
            : locationState === "found"
              ? "Using your location"
              : locationState === "outside-range"
                ? "Outside CvSU area"
                : locationState === "fallback"
                  ? "Using campus center"
                  : "Use my location"}
        </button>

        <button
          type="submit"
          className="mx-auto mt-7 flex h-10 w-full max-w-60 items-center justify-center rounded-full bg-[#004b35] text-lg font-black text-[#fffaf0] shadow-sm transition hover:bg-[#073d33]"
        >
          Search
        </button>

        {locationNotice && (
          <p className="mt-4 rounded-md border border-[#004b35]/16 bg-[#f6efda] px-3 py-2 text-sm font-bold leading-5 text-[#073d33]">
            {locationNotice}
          </p>
        )}
      </form>
    </section>
  );
}

function HomeFloatingActions({ isResultsView }: { isResultsView: boolean }) {
  return (
    <div
      className={`absolute bottom-6 z-40 flex flex-col items-center gap-4 sm:bottom-8 ${
        isResultsView
          ? "right-6 lg:right-[calc(600px+1.5rem)]"
          : "right-6 sm:right-8"
      }`}
    >
      <button
        type="button"
        className="grid size-14 place-items-center rounded-full border border-[#004b35] bg-[#fffaf0] text-[#004b35] shadow-2xl transition hover:-translate-y-0.5 hover:bg-[#fff6dd]"
        aria-label="Open chatbot"
      >
        <Bot size={26} aria-hidden="true" />
      </button>
      <Link
        href="/submit"
        className="grid size-14 place-items-center rounded-full bg-[#004b35] text-[#fffaf0] shadow-2xl transition hover:-translate-y-0.5 hover:bg-[#073d33]"
        aria-label="Add a place"
      >
        <Plus size={32} strokeWidth={1.8} aria-hidden="true" />
      </Link>
    </div>
  );
}

function ResultsBackButton({
  onBack,
}: {
  onBack: () => void;
}) {
  return (
    <div className="pointer-events-none absolute left-5 top-36 z-30 sm:left-12 sm:top-40">
      <button
        type="button"
        onClick={onBack}
        className="pointer-events-auto inline-flex h-11 items-center gap-2 rounded-full bg-[#004b35] px-6 text-lg font-black text-[#fffaf0] shadow-lg transition hover:bg-[#073d33]"
      >
        <ArrowLeft size={22} aria-hidden="true" />
        Go Back
      </button>
    </div>
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
    <aside className="absolute inset-x-0 bottom-0 z-30 max-h-[58vh] overflow-y-auto rounded-t-[26px] bg-[#fffaf0] px-6 pb-6 pt-5 shadow-[0_-14px_34px_rgba(0,75,53,0.22)] lg:inset-y-0 lg:left-auto lg:right-0 lg:max-h-none lg:w-[600px] lg:rounded-l-[28px] lg:rounded-tr-none lg:px-12 lg:pb-8 lg:pt-40 lg:shadow-[-14px_0_28px_rgba(0,0,0,0.22)]">
      <div className="sticky top-0 z-10 -mx-6 -mt-5 bg-[#fffaf0]/96 px-6 pb-4 pt-5 backdrop-blur lg:static lg:m-0 lg:bg-transparent lg:p-0">
        <h2 className="text-3xl font-black leading-none tracking-normal text-[#073d33] sm:text-4xl">
          Check mo ‘to
        </h2>
        <p className="mt-1 text-xl font-semibold text-[#073d33]/76">
          {results.length} match{results.length === 1 ? "" : "es"} found
        </p>
        {originLabel !== campusCenterLabel && (
          <p className="mt-1 text-sm font-bold text-[#073d33]/58">
            Distances from {originLabel}.
          </p>
        )}
        {compareIds.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#004b35]/15 bg-[#f6efda] px-4 py-3">
            <p className="text-sm font-black text-[#185840]">
              {compareIds.length}/4 selected for compare
            </p>
            {compareIds.length >= 2 ? (
              <Link
                href={compareHref}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-[#004b35] px-4 text-xs font-black text-[#fffaf0] transition hover:bg-[#073d33]"
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

      <div className="mt-4 space-y-3 lg:mt-6">
        {results.length === 0 ? (
          <div className="rounded-xl border border-[#004b35]/15 bg-[#fffaf0] p-4 shadow-md">
            <p className="font-black text-[#073d33]">No matching spots yet.</p>
            <p className="mt-1 text-sm font-semibold text-[#073d33]/65">
              Try a menu item like sisig, burger, coffee, noodles, or budget.
            </p>
          </div>
        ) : (
          results.map((place) => {
            const isSelectedForCompare = compareIds.includes(place.id);
            const compareLimitReached =
              compareIds.length >= 4 && !isSelectedForCompare;
            const primaryMatchedItem =
              place.matchedMenuItems[0] ?? place.bestSeller.name;

            return (
              <article
                key={place.id}
                className="group relative overflow-hidden rounded-xl border border-[#004b35]/12 bg-[#fffaf0] py-3 pl-7 pr-4 shadow-[0_3px_8px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(0,75,53,0.18)]"
              >
                <span className="absolute inset-y-0 left-0 w-2 bg-[#ffd400]" />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/place/${place.id}`}
                      className="block truncate text-2xl font-black leading-tight text-[#073d33] hover:underline"
                    >
                      {place.name}
                    </Link>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xl font-semibold leading-none text-[#416763]">
                      <span className="inline-flex items-center gap-1">
                        <Star
                          size={17}
                          fill="#ffd400"
                          className="text-[#ffd400]"
                          aria-hidden="true"
                        />
                        {place.rating.toFixed(1)}
                      </span>
                      <span aria-hidden="true">•</span>
                      <span>{place.reviews} reviews</span>
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-xl font-semibold leading-tight text-[#416763]">
                      <MapPin size={18} aria-hidden="true" />
                      {formatResultDistance(place.distanceKm)} away from you
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span className="rounded-full border border-[#ff9f1c] bg-[#ffe4bf] px-2 py-0.5 text-base font-semibold leading-none text-[#c86400]">
                        {primaryMatchedItem.toLowerCase()}
                      </span>
                      <span className="rounded-full border border-[#7e8fb1] bg-[#eef3fb] px-2 py-0.5 text-base font-semibold leading-none text-[#41567d]">
                        {place.openNow ? "open" : "closed"}
                      </span>
                    </div>
                    <p className="mt-2 text-xl font-black leading-none text-[#416763]">
                      {place.priceRange}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleCompare(place.id)}
                    disabled={compareLimitReached}
                    className={`grid size-9 shrink-0 place-items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-35 ${
                      isSelectedForCompare
                        ? "bg-[#004b35] text-[#fffaf0]"
                        : "text-[#416763] hover:bg-[#004b35]/8 hover:text-[#004b35]"
                    }`}
                    aria-label={
                      isSelectedForCompare
                        ? `Remove ${place.name} from compare`
                        : `Add ${place.name} to compare`
                    }
                  >
                    <Heart
                      size={21}
                      fill={isSelectedForCompare ? "currentColor" : "none"}
                      aria-hidden="true"
                    />
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 opacity-95 transition group-hover:opacity-100">
                  <Link
                    href={`/place/${place.id}`}
                    className="inline-flex h-8 items-center justify-center gap-1 rounded-full border border-[#004b35]/15 bg-[#fffdf4] px-2 text-[11px] font-black text-[#073d33] transition hover:border-[#004b35]"
                  >
                    <Eye size={13} aria-hidden="true" />
                    Details
                  </Link>
                  <button
                    type="button"
                    onClick={() => onToggleCompare(place.id)}
                    disabled={compareLimitReached}
                    className="inline-flex h-8 items-center justify-center gap-1 rounded-full border border-[#004b35]/15 bg-[#fffdf4] px-2 text-[11px] font-black text-[#073d33] transition hover:border-[#004b35] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Scale size={13} aria-hidden="true" />
                    {isSelectedForCompare ? "Added" : "Compare"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onGetDirections(place.id)}
                    className="inline-flex h-8 items-center justify-center gap-1 rounded-full bg-[#004b35] px-2 text-[11px] font-black text-[#fffaf0] transition hover:bg-[#073d33]"
                  >
                    <Compass size={13} aria-hidden="true" />
                    Route
                  </button>
                </div>

                {directionsPlaceId === place.id && (
                  <div className="mt-3 rounded-lg border border-[#004b35]/18 bg-[#f6efda] px-3 py-2 text-sm font-bold text-[#073d33]">
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

function formatResultDistance(kilometers: number) {
  if (kilometers < 1) {
    return `${Math.max(50, Math.round((kilometers * 1000) / 50) * 50)}m`;
  }

  return `${kilometers.toFixed(1)}km`;
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
