"use client";

import {
  Clock,
  Heart,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Utensils,
} from "lucide-react";
import { useMemo, useState } from "react";
import { MapCanvas } from "@/app/components/map-canvas";
import { rankPlaces } from "@/app/data/places";

const upcomingFeatures = [
  { label: "User accounts", icon: Heart },
  { label: "Place submissions", icon: MapPin },
  { label: "Admin approval", icon: ShieldCheck },
  { label: "Chatbot assist", icon: MessageCircle },
];

export function KabsuboHome() {
  const [query, setQuery] = useState("sisig budget lunch");
  const rankedPlaces = useMemo(() => rankPlaces(query), [query]);
  const [selectedPlaceId, setSelectedPlaceId] = useState(rankedPlaces[0].id);

  const selectedPlace =
    rankedPlaces.find((place) => place.id === selectedPlaceId) ??
    rankedPlaces[0];

  return (
    <main className="min-h-screen bg-[#f6f3ec] text-[#171714]">
      <section className="grid min-h-screen grid-cols-1 lg:grid-cols-[430px_1fr]">
        <aside className="flex flex-col gap-6 border-r border-black/10 bg-[#fffaf0] px-5 py-5 shadow-sm lg:max-h-screen lg:overflow-y-auto">
          <header className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7b3320]">
                CvSU Food Discovery
              </p>
              <h1 className="mt-2 text-4xl font-black leading-none text-[#171714]">
                kabSUBO
              </h1>
            </div>
            <div className="grid size-12 place-items-center rounded-lg bg-[#1f6f53] text-white">
              <Utensils size={22} aria-hidden="true" />
            </div>
          </header>

          <div className="rounded-lg border border-black/10 bg-white p-3 shadow-sm">
            <label
              htmlFor="craving"
              className="text-sm font-semibold text-[#3b372f]"
            >
              What are you craving?
            </label>
            <div className="mt-3 flex items-center gap-2 rounded-md border border-black/10 bg-[#f8f6ef] px-3">
              <Search size={18} className="text-[#7b3320]" aria-hidden="true" />
              <input
                id="craving"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-12 min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-black/40"
                placeholder="Try coffee, burger, noodles, budget..."
              />
              <button
                type="button"
                className="grid size-8 place-items-center rounded-md bg-[#f0e5cf] text-[#57321f]"
                aria-label="Open filters"
              >
                <SlidersHorizontal size={16} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Metric label="Matches" value={rankedPlaces.length.toString()} />
            <Metric label="Nearest" value="4 min" />
            <Metric label="Avg. meal" value="P75" />
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Ranked Recommendations</h2>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">
                Draft data
              </span>
            </div>

            {rankedPlaces.map((place, index) => (
              <button
                key={place.id}
                type="button"
                onClick={() => setSelectedPlaceId(place.id)}
                className={`w-full rounded-lg border p-4 text-left transition ${
                  place.id === selectedPlace.id
                    ? "border-[#1f6f53] bg-[#eef7ef] shadow-sm"
                    : "border-black/10 bg-white hover:border-[#d1a45f]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7b3320]">
                      #{index + 1} match - {place.type}
                    </p>
                    <h3 className="mt-1 text-lg font-extrabold">
                      {place.name}
                    </h3>
                  </div>
                  <span className="flex items-center gap-1 rounded-md bg-white px-2 py-1 text-sm font-bold text-[#57321f]">
                    <Star size={14} fill="currentColor" aria-hidden="true" />
                    {place.rating}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-black/65">
                  {place.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-black/60">
                  <span className="rounded-md bg-[#f0e5cf] px-2 py-1">
                    {place.priceRange}
                  </span>
                  <span className="rounded-md bg-[#f0e5cf] px-2 py-1">
                    {place.walkTime}
                  </span>
                  <span className="rounded-md bg-[#f0e5cf] px-2 py-1">
                    {place.hours}
                  </span>
                </div>
              </button>
            ))}
          </section>
        </aside>

        <section className="relative min-h-[620px] overflow-hidden bg-[#dbe6dc]">
          <MapCanvas
            places={rankedPlaces}
            selectedPlaceId={selectedPlace.id}
            onSelectPlace={setSelectedPlaceId}
          />

          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/35 to-transparent p-5 text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.25em]">
              CvSU Don Severino Delas Alas Main Campus, Indang
            </p>
            <h2 className="mt-2 max-w-2xl text-3xl font-black leading-tight">
              Search by craving, then compare nearby food spots on the map.
            </h2>
          </div>

          <div className="absolute inset-x-4 bottom-4 z-10 grid gap-3 lg:grid-cols-[1fr_320px]">
            <div className="rounded-lg border border-white/45 bg-white/92 p-4 shadow-xl backdrop-blur">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7b3320]">
                    Selected spot
                  </p>
                  <h2 className="mt-1 text-2xl font-black">
                    {selectedPlace.name}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-black/65">
                    {selectedPlace.description}
                  </p>
                </div>
                <div className="rounded-lg bg-[#1f6f53] px-4 py-3 text-white">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]">
                    Rating
                  </p>
                  <p className="mt-1 text-2xl font-black">
                    {selectedPlace.rating}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <Detail
                  icon={MapPin}
                  label="Location"
                  value={selectedPlace.address}
                />
                <Detail
                  icon={Clock}
                  label="Distance"
                  value={selectedPlace.walkTime}
                />
                <Detail
                  icon={Utensils}
                  label="Best picks"
                  value={selectedPlace.menuHighlights.join(", ")}
                />
              </div>
            </div>

            <div className="rounded-lg border border-white/45 bg-[#171714]/92 p-4 text-white shadow-xl backdrop-blur">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#f2c879]">
                Next branches
              </p>
              <div className="mt-3 grid gap-2">
                {upcomingFeatures.map((feature) => (
                  <div
                    key={feature.label}
                    className="flex items-center gap-3 rounded-md bg-white/8 px-3 py-2"
                  >
                    <feature.icon
                      size={16}
                      className="text-[#f2c879]"
                      aria-hidden="true"
                    />
                    <span className="text-sm font-semibold">
                      {feature.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md bg-[#f8f6ef] p-3">
      <div className="flex items-center gap-2 text-[#7b3320]">
        <Icon size={15} aria-hidden="true" />
        <p className="text-xs font-bold uppercase tracking-[0.16em]">{label}</p>
      </div>
      <p className="mt-2 text-sm font-semibold leading-5 text-[#28231d]">
        {value}
      </p>
    </div>
  );
}
