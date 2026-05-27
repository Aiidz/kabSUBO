"use client";

import {
  ArrowLeft,
  Bot,
  Clock,
  Heart,
  LocateFixed,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Send,
  Search,
  Star,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { campusCenter, isWithinCvsuIndangBounds } from "@/app/data/places";
import type { FoodPlace, RankedPlace } from "@/app/data/places";
import { placesApi, recommendationsApi, favoritesApi, type AuthUser } from "@/app/lib/api/kabsubo-api";
import { getStoredUser } from "@/app/lib/auth/session";
import {
  createChatMessage,
  createComparisonPrompt,
  createKabsuboReply,
  type ChatMessage,
} from "@/app/lib/chatbot/kabsubo-rag";
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
  const [approvedPlaces, setApprovedPlaces] = useState<FoodPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
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
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() =>
    getStoredUser(),
  );
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [activeDetailPlaceId, setActiveDetailPlaceId] = useState<string | null>(
    null,
  );
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    placesApi.listApproved().then((result) => {
      setApprovedPlaces(result.data);
      if (result.data.length > 0) {
        setSelectedPlaceId(result.data[0].id);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    function refreshUser() {
      const nextUser = getStoredUser();
      setCurrentUser(nextUser);

      if (!nextUser) {
        setFavoriteIds([]);
      }
    }

    window.addEventListener("kabsubo-auth-change", refreshUser);
    window.addEventListener("storage", refreshUser);

    return () => {
      window.removeEventListener("kabsubo-auth-change", refreshUser);
      window.removeEventListener("storage", refreshUser);
    };
  }, []);

  useEffect(() => {
    async function loadFavorites(user: AuthUser) {
      const result = await favoritesApi.list(user.id);
      setFavoriteIds(result.data.map((place) => place.id));
    }

    if (currentUser) {
      void loadFavorites(currentUser);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!submittedQuery.trim()) return;
    recommendationsApi.search(submittedQuery).then((result) => {
      setSearchResults(result.data.filter((place) => place.matchScore > 0));
    });
  }, [submittedQuery]);

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
  const chatbotPlaces = useMemo(
    () =>
      approvedPlaces.map((place) => ({
        ...place,
        distanceKm: getDistanceKm(origin, place.coordinates),
        openNow: isOpenNow(place.hours),
      })),
    [approvedPlaces, origin],
  );

  const matchingPlaceIds = rankedResults.map((place) => place.id);
  const hasSubmitted = submittedQuery.trim().length > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextQuery = query.trim();

    if (nextQuery) {
      router.push(`/results?q=${encodeURIComponent(nextQuery)}`);
    }

    setSubmittedQuery(nextQuery);
    setActiveDetailPlaceId(null);
    setIsChatbotOpen(false);

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
    setActiveDetailPlaceId(null);
    setIsChatbotOpen(false);
    router.push("/");
  }

  function setCampusFallback() {
    setUserLocation(campusCenter);
    setLocationState("fallback");
  }

  function handleUseLocation() {
    if (!navigator.geolocation) {
      console.warn("Geolocation not supported by browser");
      setCampusFallback();
      return;
    }

    console.log("Requesting geolocation (high accuracy)...");
    setLocationState("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation: Coordinates = [
          position.coords.longitude,
          position.coords.latitude,
        ];

        console.log("Geolocation result:", nextLocation);

        if (isWithinCvsuIndangBounds(nextLocation)) {
          console.log("Location is within CvSU bounds");
          setUserLocation(nextLocation);
          setLocationState("found");
          return;
        }

        console.warn("Location is outside CvSU bounds");
        setUserLocation(null);
        setLocationState("outside-range");
      },
      () => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const nextLocation: Coordinates = [
              position.coords.longitude,
              position.coords.latitude,
            ];

            console.log("Low accuracy geolocation result:", nextLocation);

            if (isWithinCvsuIndangBounds(nextLocation)) {
              setUserLocation(nextLocation);
              setLocationState("found");
              return;
            }

            setUserLocation(null);
            setLocationState("outside-range");
          },
          () => {
            setCampusFallback();
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 120000 },
        );
      },
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

  function handleOpenPlaceDetail(placeId: string) {
    setActiveDetailPlaceId(placeId);
    setIsChatbotOpen(false);
    void handleGetDirections(placeId);
  }

  async function handleToggleFavorite(placeId: string) {
    if (!currentUser) {
      return;
    }

    const isFavorite = favoriteIds.includes(placeId);
    setFavoriteIds((currentIds) =>
      isFavorite
        ? currentIds.filter((currentId) => currentId !== placeId)
        : [...currentIds, placeId],
    );

    try {
      if (isFavorite) {
        await favoritesApi.remove({ placeId, userId: currentUser.id });
        return;
      }

      await favoritesApi.add({ placeId, userId: currentUser.id });
    } catch {
      setFavoriteIds((currentIds) =>
        isFavorite
          ? [...currentIds, placeId]
          : currentIds.filter((currentId) => currentId !== placeId),
      );
    }
  }

  function handleOpenChatbot(placeId?: string) {
    if (placeId) {
      const nextCompareIds = compareIds.includes(placeId)
        ? compareIds
        : [...compareIds, placeId].slice(0, 4);
      const prompt = createComparisonPrompt(placeId, chatbotPlaces);
      const reply = createKabsuboReply({
        message: prompt,
        originLabel,
        places: chatbotPlaces,
        selectedPlaceIds: nextCompareIds,
      });

      setCompareIds(nextCompareIds);
      setChatMessages((currentMessages) => [
        ...currentMessages,
        createChatMessage("assistant", reply),
      ]);
    }

    if (!hasSubmitted) {
      const nextQuery = query.trim() || "food";
      setSubmittedQuery(nextQuery);
      router.push(`/results?q=${encodeURIComponent(nextQuery)}`);
    }

    setActiveDetailPlaceId(null);
    setIsChatbotOpen(true);
  }

  function handleSendChatbotMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextMessage = chatInput.trim();

    if (!nextMessage) {
      return;
    }

    const reply = createKabsuboReply({
      message: nextMessage,
      originLabel,
      places: chatbotPlaces,
      selectedPlaceIds: compareIds,
    });

    setChatMessages((currentMessages) => [
      ...currentMessages,
      createChatMessage("user", nextMessage),
      createChatMessage("assistant", reply),
    ]);
    setChatInput("");
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

      <HomeFloatingActions
        isResultsView={hasSubmitted}
        onOpenChatbot={() => handleOpenChatbot()}
      />

      {hasSubmitted && (
        <RecommendationsPanel
          results={rankedResults}
          originLabel={originLabel}
          directionsPlaceId={directionsPlaceId}
          routeInfo={routeInfo}
          routeStatus={routeStatus}
          compareIds={compareIds}
          favoriteIds={favoriteIds}
          activeDetailPlaceId={activeDetailPlaceId}
          isChatbotOpen={isChatbotOpen}
          chatInput={chatInput}
          chatMessages={chatMessages}
          onOpenPlaceDetail={handleOpenPlaceDetail}
          onToggleFavorite={handleToggleFavorite}
          onOpenChatbot={handleOpenChatbot}
          onChatInputChange={setChatInput}
          onSendChatbotMessage={handleSendChatbotMessage}
          onBackToResults={() => setActiveDetailPlaceId(null)}
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

function HomeFloatingActions({
  isResultsView,
  onOpenChatbot,
}: {
  isResultsView: boolean;
  onOpenChatbot: () => void;
}) {
  return (
    <div
      className={`absolute bottom-6 z-40 flex flex-col items-center gap-4 sm:bottom-8 ${
        isResultsView
          ? "right-6 lg:right-[calc(480px+1.5rem)]"
          : "right-6 sm:right-8"
      }`}
    >
      {isResultsView ? (
        <button
          type="button"
          onClick={onOpenChatbot}
          className="grid size-14 place-items-center rounded-full border border-[#004b35] bg-[#fffaf0] text-[#004b35] shadow-2xl transition hover:-translate-y-0.5 hover:bg-[#fff6dd]"
          aria-label="Open chatbot"
        >
          <Bot size={26} aria-hidden="true" />
        </button>
      ) : (
        <Link
          href="/chatbot"
          className="grid size-14 place-items-center rounded-full border border-[#004b35] bg-[#fffaf0] text-[#004b35] shadow-2xl transition hover:-translate-y-0.5 hover:bg-[#fff6dd]"
          aria-label="Open chatbot"
        >
          <Bot size={26} aria-hidden="true" />
        </Link>
      )}
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

  if (locationState === "fallback") {
    return "Could not determine your location. Using campus center for distances and directions.";
  }

  return null;
}

function RecommendationsPanel({
  results,
  originLabel,
  directionsPlaceId,
  routeInfo,
  routeStatus,
  compareIds,
  favoriteIds,
  activeDetailPlaceId,
  isChatbotOpen,
  chatInput,
  chatMessages,
  onOpenPlaceDetail,
  onToggleFavorite,
  onOpenChatbot,
  onChatInputChange,
  onSendChatbotMessage,
  onBackToResults,
  onGetDirections,
}: {
  results: Array<RankedPlace & { distanceKm: number; openNow: boolean }>;
  originLabel: string;
  directionsPlaceId: string | null;
  routeInfo: RouteInfo | null;
  routeStatus: RouteStatus;
  compareIds: string[];
  favoriteIds: string[];
  activeDetailPlaceId: string | null;
  isChatbotOpen: boolean;
  chatInput: string;
  chatMessages: ChatMessage[];
  onOpenPlaceDetail: (placeId: string) => void;
  onToggleFavorite: (placeId: string) => void;
  onOpenChatbot: (placeId?: string) => void;
  onChatInputChange: (message: string) => void;
  onSendChatbotMessage: (event: FormEvent<HTMLFormElement>) => void;
  onBackToResults: () => void;
  onGetDirections: (placeId: string) => void;
}) {
  const activeDetailPlace =
    results.find((place) => place.id === activeDetailPlaceId) ?? null;
  return (
    <aside className="absolute inset-x-0 bottom-0 z-30 max-h-[54vh] overflow-y-auto rounded-t-[24px] bg-[#fffaf0] px-5 pb-5 pt-4 shadow-[0_-14px_34px_rgba(0,75,53,0.22)] lg:inset-y-0 lg:left-auto lg:right-0 lg:max-h-none lg:w-[480px] lg:rounded-l-[26px] lg:rounded-tr-none lg:px-9 lg:pb-7 lg:pt-36 lg:shadow-[-12px_0_24px_rgba(0,0,0,0.2)]">
      {isChatbotOpen ? (
        <ChatbotPanel
          chatInput={chatInput}
          messages={chatMessages}
          onChatInputChange={onChatInputChange}
          onSendChatbotMessage={onSendChatbotMessage}
        />
      ) : activeDetailPlace ? (
        <PlaceDetailPanel
          place={activeDetailPlace}
          directionsPlaceId={directionsPlaceId}
          routeInfo={routeInfo}
          routeStatus={routeStatus}
          isFavorite={favoriteIds.includes(activeDetailPlace.id)}
          onBackToResults={onBackToResults}
          onToggleFavorite={onToggleFavorite}
          onOpenChatbot={onOpenChatbot}
          onGetDirections={onGetDirections}
        />
      ) : (
        <>
      <div className="sticky top-0 z-10 -mx-6 -mt-5 bg-[#fffaf0]/96 px-6 pb-4 pt-5 backdrop-blur lg:static lg:m-0 lg:bg-transparent lg:p-0">
        <h2 className="text-3xl font-black leading-none tracking-normal text-[#073d33]">
          Check mo ‘to
        </h2>
        <p className="mt-1 text-lg font-semibold text-[#073d33]/76">
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
              {compareIds.length}/4 sent to chatbot
            </p>
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#7b3320]">
              Ready for comparison
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3 lg:mt-5">
        {results.length === 0 ? (
          <div className="rounded-xl border border-[#004b35]/15 bg-[#fffaf0] p-4 shadow-md">
            <p className="font-black text-[#073d33]">No matching spots yet.</p>
            <p className="mt-1 text-sm font-semibold text-[#073d33]/65">
              Try a menu item like sisig, burger, coffee, noodles, or budget.
            </p>
          </div>
        ) : (
          results.map((place) => {
            const isFavorite = favoriteIds.includes(place.id);
            const primaryMatchedItem =
              place.matchedMenuItems[0] ?? place.bestSeller.name;

            return (
              <article
                key={place.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpenPlaceDetail(place.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onOpenPlaceDetail(place.id);
                  }
                }}
                className="group relative cursor-pointer overflow-hidden rounded-xl border border-[#004b35]/12 bg-[#fffaf0] py-2.5 pl-6 pr-3.5 shadow-[0_3px_8px_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(0,75,53,0.18)] focus:outline-none focus:ring-2 focus:ring-[#004b35]/35"
              >
                <span className="absolute inset-y-0 left-0 w-2 bg-[#ffd400]" />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-xl font-black leading-tight text-[#073d33]">
                      {place.name}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-base font-semibold leading-none text-[#416763]">
                      <span className="inline-flex items-center gap-1">
                        <Star
                          size={15}
                          fill="#ffd400"
                          className="text-[#ffd400]"
                          aria-hidden="true"
                        />
                        {place.rating.toFixed(1)}
                      </span>
                      <span aria-hidden="true">•</span>
                      <span>{place.reviews} reviews</span>
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-base font-semibold leading-tight text-[#416763]">
                      <MapPin size={16} aria-hidden="true" />
                      {formatResultDistance(place.distanceKm)} away from you
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span className="rounded-full border border-[#ff9f1c] bg-[#ffe4bf] px-2 py-0.5 text-sm font-semibold leading-none text-[#c86400]">
                        {primaryMatchedItem.toLowerCase()}
                      </span>
                      <span className="rounded-full border border-[#7e8fb1] bg-[#eef3fb] px-2 py-0.5 text-sm font-semibold leading-none text-[#41567d]">
                        {place.openNow ? "open" : "closed"}
                      </span>
                    </div>
                    <p className="mt-1.5 text-lg font-black leading-none text-[#416763]">
                      {place.priceRange}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void onToggleFavorite(place.id);
                    }}
                    className={`grid size-8 shrink-0 place-items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-35 ${
                      isFavorite
                        ? "bg-[#004b35] text-[#fffaf0]"
                        : "text-[#416763] hover:bg-[#004b35]/8 hover:text-[#004b35]"
                    }`}
                    aria-label={
                      isFavorite
                        ? `Remove ${place.name} from favorites`
                        : `Add ${place.name} to favorites`
                    }
                  >
                    <Heart
                      size={19}
                      fill={isFavorite ? "currentColor" : "none"}
                      aria-hidden="true"
                    />
                  </button>
                </div>

                <div className="mt-2.5 grid grid-cols-1 gap-1.5 opacity-95 transition group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenChatbot(place.id);
                    }}
                    className="inline-flex h-7 items-center justify-center gap-1 rounded-full border border-[#004b35]/15 bg-[#fffdf4] px-2 text-[10px] font-black text-[#073d33] transition hover:border-[#004b35] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Bot size={13} aria-hidden="true" />
                    Compare with chatbot
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
        </>
      )}
    </aside>
  );
}

function PlaceDetailPanel({
  place,
  directionsPlaceId,
  routeInfo,
  routeStatus,
  isFavorite,
  onBackToResults,
  onToggleFavorite,
  onOpenChatbot,
  onGetDirections,
}: {
  place: RankedPlace & { distanceKm: number; openNow: boolean };
  directionsPlaceId: string | null;
  routeInfo: RouteInfo | null;
  routeStatus: RouteStatus;
  isFavorite: boolean;
  onBackToResults: () => void;
  onToggleFavorite: (placeId: string) => void;
  onOpenChatbot: (placeId?: string) => void;
  onGetDirections: (placeId: string) => void;
}) {
  const menuByCategory = groupMenuByCategory(place.menuItems);
  const routeIsActive = directionsPlaceId === place.id;

  return (
    <div className="-mx-5 -mb-5 -mt-4 text-[#073d33] lg:-mx-9 lg:-mb-7 lg:-mt-36">
      <div className="relative h-52 overflow-hidden rounded-t-[24px] lg:h-72 lg:rounded-tl-[26px] lg:rounded-tr-none">
        <Image
          src={place.bestSeller.imageUrl}
          alt={place.bestSeller.name}
          fill
          className="object-cover"
          sizes="480px"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#004b35]/10 to-[#004b35]/24" />
        <button
          type="button"
          onClick={onBackToResults}
          className="absolute left-4 top-4 inline-flex h-9 items-center gap-2 rounded-full bg-[#004b35] px-4 text-sm font-black text-[#fffaf0] shadow-lg transition hover:bg-[#073d33]"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Results
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1 border-y-4 border-[#fffaf0]">
        {place.menuItems.slice(0, 3).map((item) => (
          <div
            key={item.name}
            className="grid h-20 place-items-center bg-[#004b35] px-2 text-center text-xs font-black text-[#fffaf0] lg:h-24"
          >
            {item.name}
          </div>
        ))}
      </div>

      <div className="px-5 pb-5 pt-5 lg:px-9 lg:pb-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black leading-none">{place.name}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm font-semibold text-[#416763]">
              <span className="inline-flex items-center gap-1">
                <Star
                  size={15}
                  fill="#ffd400"
                  className="text-[#ffd400]"
                  aria-hidden="true"
                />
                {place.rating.toFixed(1)}
              </span>
              <span aria-hidden="true">•</span>
              <span>{place.reviews} reviews</span>
            </div>
            <p className="mt-1 flex items-start gap-1 text-sm font-semibold leading-5 text-[#416763]">
              <MapPin size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
              {place.address}
            </p>
            <p className="mt-1 text-sm font-black text-[#416763]">
              {place.priceRange}
            </p>
            <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-[#416763]">
              <Clock size={15} aria-hidden="true" />
              {place.hours}
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-black uppercase ${
                  place.openNow
                    ? "border-[#75b843] bg-[#e8f6d9] text-[#4f962a]"
                    : "border-[#7e8fb1] bg-[#eef3fb] text-[#41567d]"
                }`}
              >
                {place.openNow ? "Open" : "Closed"}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => void onToggleFavorite(place.id)}
            className={`mt-1 grid size-9 shrink-0 place-items-center rounded-full transition ${
              isFavorite
                ? "bg-[#004b35] text-[#fffaf0]"
                : "text-[#416763] hover:bg-[#004b35]/8 hover:text-[#004b35]"
            }`}
            aria-label={
              isFavorite
                ? `Remove ${place.name} from favorites`
                : `Add ${place.name} to favorites`
            }
          >
            <Heart
              size={22}
              fill={isFavorite ? "currentColor" : "none"}
              aria-hidden="true"
            />
          </button>
        </div>

        <DetailDivider />

        <section>
          <h3 className="text-xl font-black">Description</h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#073d33]">
            {place.description}
          </p>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#073d33]">
            Best known for {place.menuHighlights.join(", ").toLowerCase()}.
            Submitted by {place.submittedBy}.
          </p>
        </section>

        <DetailDivider />

        <section>
          <h3 className="text-xl font-black">Menu</h3>
          <div className="mt-3 space-y-4">
            {Object.entries(menuByCategory).map(([category, items]) => (
              <div key={category}>
                <h4 className="text-xs font-black uppercase tracking-[0.14em] text-[#416763]">
                  {category}
                </h4>
                <div className="mt-2 space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-start justify-between gap-3 rounded-lg border border-[#004b35]/12 bg-[#f8f5e9] px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-black">{item.name}</p>
                        {item.prepNote && (
                          <p className="mt-1 text-xs font-semibold leading-4 text-[#416763]">
                            {item.prepNote}
                          </p>
                        )}
                        {item.isBestSeller && (
                          <span className="mt-1 inline-flex rounded-full bg-[#ffd400] px-2 py-0.5 text-[10px] font-black uppercase text-[#073d33]">
                            Best seller
                          </span>
                        )}
                      </div>
                      <p className="shrink-0 text-sm font-black">PHP {item.price}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <DetailDivider />

        <section>
          <h3 className="text-xl font-black">Comments</h3>
          <div className="mt-3 space-y-3">
            {place.recentReviews.map((review) => (
              <article
                key={`${review.author}-${review.date}-${review.body}`}
                className="border-b border-[#004b35]/18 pb-3 last:border-0"
              >
                <div className="flex gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#004b35] text-sm font-black text-[#fffaf0]">
                    {review.author.charAt(0)}
                  </span>
                  <div>
                    <p className="text-sm font-black">{review.author}</p>
                    <p className="text-xs font-semibold text-[#416763]">{review.date}</p>
                    <p className="mt-1 text-sm font-semibold text-[#ffd400]">
                      {"★".repeat(review.rating)}
                    </p>
                    <p className="text-sm font-semibold leading-5">{review.body}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#004b35]" />
            <input
              className="h-9 min-w-0 flex-1 rounded-md border border-[#004b35] bg-transparent px-3 text-sm font-semibold outline-none placeholder:text-[#416763]"
              placeholder="Add yours..."
            />
            <button
              type="button"
              className="grid size-9 place-items-center rounded-md bg-[#416763] text-[#fffaf0]"
              aria-label="Submit comment"
            >
              <Send size={17} aria-hidden="true" />
            </button>
          </div>
        </section>

        <section className="mt-5 rounded-lg border border-[#004b35] p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black">Contact</h3>
            <Phone size={18} aria-hidden="true" />
          </div>
          <p className="mt-3 flex items-center gap-2 text-sm font-semibold">
            <Phone size={14} aria-hidden="true" />
            {place.contact}
          </p>
          <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
            <MessageCircle size={14} aria-hidden="true" />
            {place.submittedBy}
          </p>
        </section>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => onGetDirections(place.id)}
            className="h-12 flex-1 rounded-full bg-[#004b35] text-sm font-black text-[#fffaf0] transition hover:bg-[#073d33]"
          >
            Go Now
          </button>
          <button
            type="button"
            onClick={() => onOpenChatbot(place.id)}
            className="grid size-12 place-items-center rounded-full border border-[#004b35] text-[#004b35]"
            aria-label="Open chatbot"
          >
            <MessageCircle size={25} aria-hidden="true" />
          </button>
        </div>

        {routeIsActive && (
          <p className="mt-3 rounded-lg border border-[#004b35]/18 bg-[#f6efda] px-3 py-2 text-sm font-bold">
            {routeStatus === "loading" && "Drawing route on the map..."}
            {routeStatus === "ready" && routeInfo && (
              <>
                Route ready: {formatDistance(routeInfo.distanceMeters)} -{" "}
                {formatDuration(routeInfo.durationSeconds)}
              </>
            )}
            {routeStatus === "fallback" && routeInfo && (
              <>
                Direct route shown: {formatDistance(routeInfo.distanceMeters)} -{" "}
                {formatDuration(routeInfo.durationSeconds)}
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

function ChatbotPanel({
  chatInput,
  messages,
  onChatInputChange,
  onSendChatbotMessage,
}: {
  chatInput: string;
  messages: ChatMessage[];
  onChatInputChange: (message: string) => void;
  onSendChatbotMessage: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="-mx-5 -mb-5 -mt-4 flex min-h-[54vh] flex-col text-[#073d33] lg:-mx-9 lg:-mb-7 lg:-mt-36 lg:min-h-screen">
      <div className="flex flex-1 flex-col px-7 pb-5 pt-20 lg:px-12 lg:pb-7 lg:pt-32">
        <div className="mx-auto mt-4 flex max-w-xs flex-col items-center text-center">
          <Bot size={92} strokeWidth={2.4} aria-hidden="true" />
          <h2 className="mt-3 text-3xl font-semibold leading-none">
            Can&apos;t decide?
          </h2>
          <p className="mt-4 flex items-center justify-center gap-2 text-2xl font-semibold">
            i-
            <Image
              src="/brand/kabsubo-logo.png"
              alt="kabSUBO"
              width={70}
              height={44}
              className="h-8 w-auto object-contain"
            />
            na yan
          </p>
        </div>

        <div
          className="mt-auto max-h-[44vh] min-h-44 space-y-3 overflow-y-auto pt-10"
          aria-label="Chat messages"
        >
          {messages.length === 0 ? (
            <div className="rounded-xl border border-[#004b35]/15 bg-[#f6efda] px-4 py-3 text-sm font-semibold leading-5 text-[#416763]">
              Ask about nearest places, most liked spots, budget meals, open
              places, or compare the places you picked.
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[88%] rounded-xl border px-4 py-3 text-sm font-semibold leading-5 shadow-sm ${
                  message.role === "user"
                    ? "ml-auto border-[#004b35] bg-[#fffdf4] text-[#073d33]"
                    : "mr-auto border-[#ffd400]/60 bg-[#fff8d7] text-[#073d33]"
                }`}
              >
                {message.text.split("\n").map((line, index) => (
                  <p key={`${message.id}-${index}`} className={index > 0 ? "mt-2" : ""}>
                    {line}
                  </p>
                ))}
              </div>
            ))
          )}
        </div>

        <form
          onSubmit={onSendChatbotMessage}
          className="mt-3 flex items-center gap-2"
        >
          <button
            type="button"
            className="grid size-8 shrink-0 place-items-center rounded-md text-[#073d33]"
            aria-label="Open camera"
          >
            <CameraIcon />
          </button>
          <button
            type="button"
            className="grid size-8 shrink-0 place-items-center rounded-md text-[#073d33]"
            aria-label="Attach image"
          >
            <ImageIcon />
          </button>
          <input
            value={chatInput}
            onChange={(event) => onChatInputChange(event.target.value)}
            className="h-10 min-w-0 flex-1 rounded-md border border-[#004b35] bg-transparent px-3 text-sm font-semibold outline-none placeholder:text-[#416763]"
            placeholder="Ask Kabsubo..."
          />
          <button
            type="submit"
            className="grid size-10 shrink-0 place-items-center rounded-md bg-[#416763] text-[#fffaf0]"
            aria-label="Send message"
          >
            <Send size={18} aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-7"
      fill="none"
      viewBox="0 0 28 28"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9 8.5 10.8 5h6.4L19 8.5h4.5v14h-19v-14H9Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <circle cx="14" cy="15.5" r="4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-7"
      fill="none"
      viewBox="0 0 28 28"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4.5 6.5h19v15h-19v-15Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="m7.5 19 5.2-5 3.5 3.2 2.3-2.3 3 4.1"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <circle cx="18.5" cy="10.5" r="1.4" fill="currentColor" />
    </svg>
  );
}

function DetailDivider() {
  return <hr className="my-6 border-[#004b35]/75" />;
}

function groupMenuByCategory(menuItems: RankedPlace["menuItems"]) {
  return menuItems.reduce<Record<string, RankedPlace["menuItems"]>>(
    (groups, item) => {
      groups[item.category] = [...(groups[item.category] ?? []), item];
      return groups;
    },
    {},
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
  if (/24\s*(hours|\/7)/i.test(hours)) {
    return true;
  }

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

  if (closeMinutes < openMinutes) {
    return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
  }
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
