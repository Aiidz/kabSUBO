import { ArrowLeft, Award, BadgeCheck, MapPin, Star } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  campusCenter,
  getPlaceMatch,
  getQueryTerms,
  type FoodPlace,
} from "@/app/data/places";
import { placesApi } from "@/app/lib/api/kabsubo-api";

type ComparePageProps = {
  searchParams: Promise<{
    ids?: string;
    q?: string;
  }>;
};

type CompareItem = {
  place: FoodPlace;
  dish: FoodPlace["menuItems"][number];
  distanceKm: number;
  matchScore: number;
  weightedScore: number;
  scoreParts: {
    price: number;
    distance: number;
    rating: number;
    match: number;
  };
};

export const metadata = {
  title: "Compare picks | kabSUBO",
  description: "Compare selected CvSU Indang food recommendations.",
};

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const { ids = "", q = "" } = await searchParams;
  const selectedIds = ids
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 4);
  const places = await placesApi.listApproved();
  const selectedPlaces = selectedIds
    .map((id) => places.data.find((place) => place.id === id))
    .filter((place): place is FoodPlace => Boolean(place));

  if (selectedPlaces.length < 2) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f3ec] px-5 text-[#171714]">
        <section className="max-w-xl rounded-lg border border-black/10 bg-white/86 p-6 shadow-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-black text-[#1f6f53]"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to map
          </Link>
          <h1 className="mt-5 text-3xl font-black">Pick at least 2 items</h1>
          <p className="mt-2 font-semibold leading-7 text-black/62">
            Select 2 to 4 restaurants from the recommendation panel, then open
            compare to see prices, distance, rating, prep notes, and a winner
            suggestion.
          </p>
        </section>
      </main>
    );
  }

  const compareItems = buildCompareItems(selectedPlaces, q);
  const winner = compareItems.reduce((bestItem, item) =>
    item.weightedScore > bestItem.weightedScore ? item : bestItem,
  );

  return (
    <main className="min-h-screen bg-[#f6f3ec] text-[#171714]">
      <header className="border-b border-black/10 bg-white/78 px-5 py-5 shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-black text-[#1f6f53]"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Back to map
            </Link>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.24em] text-[#7b3320]">
              Compare view
            </p>
            <h1 className="mt-2 text-4xl font-black leading-tight">
              Side-by-side food picks
            </h1>
            <p className="mt-2 max-w-2xl font-semibold leading-7 text-black/60">
              Weighted by student-friendly price, campus distance, rating, and
              match strength{q ? ` for "${q}"` : ""}.
            </p>
          </div>
          <div className="rounded-lg border border-black/10 bg-[#fffaf0] px-4 py-3">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-black/45">
              Compared
            </p>
            <p className="mt-1 text-2xl font-black">
              {compareItems.length} pick{compareItems.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-6">
        <div
          data-testid="compare-winner"
          className="rounded-lg border border-[#1f6f53]/20 bg-[#eef7ef] p-5 shadow-sm"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#185840]">
                <Award size={16} aria-hidden="true" />
                Suggested winner
              </p>
              <h2 className="mt-2 text-3xl font-black">{winner.dish.name}</h2>
              <p className="mt-1 font-semibold text-black/62">
                {winner.place.name} scores highest across price, distance,
                rating, and craving match.
              </p>
            </div>
            <ScorePill score={winner.weightedScore} />
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-4">
          {compareItems.map((item) => (
            <article
              key={item.place.id}
              data-testid="compare-card"
              className={`rounded-lg border bg-white/86 p-4 shadow-sm ${
                item.place.id === winner.place.id
                  ? "border-[#1f6f53]/45"
                  : "border-black/10"
              }`}
            >
              <div className="flex min-h-16 items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black leading-tight">
                    {item.dish.name}
                  </h2>
                  <p className="mt-1 text-sm font-bold text-black/58">
                    {item.place.name}
                  </p>
                </div>
                {item.dish.isBestSeller && (
                  <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[#1f6f53] text-white">
                    <BadgeCheck size={18} aria-hidden="true" />
                  </span>
                )}
              </div>

              <dl className="mt-5 space-y-3">
                <CompareRow label="Price" value={`PHP ${item.dish.price}`} />
                <CompareRow
                  label="Distance"
                  value={`${item.distanceKm.toFixed(1)} km`}
                />
                <CompareRow
                  label="Rating"
                  value={`${item.place.rating.toFixed(1)} / 5`}
                  icon={<Star size={14} fill="currentColor" />}
                />
                <CompareRow
                  label="Match score"
                  value={`${item.matchScore}`}
                />
              </dl>

              <div className="mt-5 rounded-md bg-[#fffaf0] p-3">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#7b3320]">
                  Prep notes
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-black/65">
                  {item.dish.prepNote ?? "Ask the seller for current prep time."}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <ScoreBreakdown label="Price" score={item.scoreParts.price} />
                <ScoreBreakdown
                  label="Distance"
                  score={item.scoreParts.distance}
                />
                <ScoreBreakdown label="Rating" score={item.scoreParts.rating} />
                <ScoreBreakdown label="Match" score={item.scoreParts.match} />
              </div>

              <Link
                href={`/place/${item.place.id}`}
                className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#171714] px-3 text-sm font-black text-white transition hover:bg-[#2a2822]"
              >
                <MapPin size={15} aria-hidden="true" />
                View restaurant
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function buildCompareItems(places: FoodPlace[], query: string): CompareItem[] {
  const baseItems = places.map((place) => {
    const dish = pickDish(place, query);
    const matchScore = getPlaceMatch(place, query).matchScore || 1;

    return {
      place,
      dish,
      distanceKm: getDistanceKm(campusCenter, place.coordinates),
      matchScore,
    };
  });

  const prices = baseItems.map((item) => item.dish.price);
  const distances = baseItems.map((item) => item.distanceKm);
  const ratings = baseItems.map((item) => item.place.rating);
  const matches = baseItems.map((item) => item.matchScore);

  return baseItems
    .map((item) => {
      const scoreParts = {
        price: normalizeLowerIsBetter(item.dish.price, prices),
        distance: normalizeLowerIsBetter(item.distanceKm, distances),
        rating: normalizeHigherIsBetter(item.place.rating, ratings),
        match: normalizeHigherIsBetter(item.matchScore, matches),
      };
      const weightedScore =
        scoreParts.price * 0.3 +
        scoreParts.distance * 0.25 +
        scoreParts.rating * 0.25 +
        scoreParts.match * 0.2;

      return {
        ...item,
        weightedScore,
        scoreParts,
      };
    })
    .sort((a, b) => b.weightedScore - a.weightedScore);
}

function pickDish(place: FoodPlace, query: string) {
  const terms = getQueryTerms(query);

  if (terms.length > 0) {
    const matchedDish = place.menuItems.find((item) => {
      const searchable = [item.name, ...item.tags].join(" ").toLowerCase();
      return terms.some((term) => searchable.includes(term));
    });

    if (matchedDish) {
      return matchedDish;
    }
  }

  return (
    place.menuItems.find((item) => item.isBestSeller) ?? place.menuItems[0]
  );
}

function CompareRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-black/10 pb-3 last:border-0 last:pb-0">
      <dt className="text-xs font-black uppercase tracking-[0.16em] text-black/42">
        {label}
      </dt>
      <dd className="inline-flex items-center gap-1 text-sm font-black text-[#171714]">
        {icon}
        {value}
      </dd>
    </div>
  );
}

function ScoreBreakdown({ label, score }: { label: string; score: number }) {
  return (
    <div className="rounded-md border border-black/10 bg-white px-2 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-black/42">
        {label}
      </p>
      <p className="mt-1 text-sm font-black">{Math.round(score * 100)}%</p>
    </div>
  );
}

function ScorePill({ score }: { score: number }) {
  return (
    <div className="w-fit rounded-lg bg-[#1f6f53] px-4 py-3 text-white">
      <p className="text-xs font-black uppercase tracking-[0.16em] opacity-80">
        Winner score
      </p>
      <p className="mt-1 text-3xl font-black">{Math.round(score * 100)}%</p>
    </div>
  );
}

function normalizeHigherIsBetter(value: number, values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (max === min) {
    return 1;
  }

  return (value - min) / (max - min);
}

function normalizeLowerIsBetter(value: number, values: number[]) {
  return 1 - normalizeHigherIsBetter(value, values);
}

function getDistanceKm(from: [number, number], to: [number, number]) {
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

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
