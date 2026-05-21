import { ArrowLeft, Clock, MapPin, Phone, Star, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlaceInsetMap } from "@/app/components/place-inset-map";
import {
  campusCenter,
  type FoodPlace,
} from "@/app/data/places";
import { placesApi } from "@/app/lib/api/kabsubo-api";

type PlacePageProps = {
  params: Promise<{
    placeId: string;
  }>;
};

export async function generateStaticParams() {
  const places = await placesApi.listApproved();

  return places.data.map((place) => ({
    placeId: place.id,
  }));
}

export async function generateMetadata({ params }: PlacePageProps) {
  const { placeId } = await params;
  const place = await placesApi.get(placeId).catch(() => null);

  if (!place) {
    return {
      title: "Place not found | kabSUBO",
    };
  }

  return {
    title: `${place.data.name} | kabSUBO`,
    description: place.data.description,
  };
}

export default async function PlaceDetailPage({ params }: PlacePageProps) {
  const { placeId } = await params;
  const result = await placesApi.get(placeId).catch(() => null);

  if (!result) {
    notFound();
  }

  const place = result.data;
  const menuByCategory = groupMenuByCategory(place.menuItems);
  const distanceKm = getDistanceKm(campusCenter, place.coordinates);

  return (
    <main className="min-h-screen bg-[#f6f3ec] text-[#171714]">
      <section className="relative min-h-[420px] overflow-hidden bg-[#171714] text-white">
        {place.bestSeller.imageUrl ? (
          <Image
            src={place.bestSeller.imageUrl}
            alt={place.bestSeller.name}
            fill
            priority
            className="object-cover opacity-55"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#2a1a0e] via-[#1f1a17] to-[#171714]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/35 to-black/10" />
        <div className="relative z-10 mx-auto flex min-h-[420px] max-w-6xl flex-col justify-end px-5 py-8">
          <Link
            href="/"
            className="mb-auto inline-flex w-fit items-center gap-2 rounded-md bg-white/12 px-3 py-2 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to map
          </Link>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f2c879]">
            {place.type}
          </p>
          <h1 className="mt-2 max-w-3xl text-5xl font-black leading-none">
            {place.name}
          </h1>
          <p className="mt-4 max-w-2xl text-lg font-semibold leading-7 text-white/82">
            {place.description}
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="grid gap-3 sm:grid-cols-4">
            <InfoTile label="Rating" value={`${place.rating.toFixed(1)} / 5`} />
            <InfoTile label="Distance" value={`${distanceKm.toFixed(1)} km`} />
            <InfoTile label="Price" value={place.priceRange} />
            <InfoTile label="Status" value={place.status} />
          </section>

          <section className="rounded-lg border border-black/10 bg-white/82 p-5 shadow-sm">
            <h2 className="text-2xl font-black">Full Menu</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {Object.entries(menuByCategory).map(([category, items]) => (
                <div key={category} className="rounded-lg bg-[#fffaf0] p-4">
                  <h3 className="text-sm font-black uppercase tracking-[0.18em] text-[#7b3320]">
                    {category}
                  </h3>
                  <div className="mt-3 space-y-3">
                    {items.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-start justify-between gap-3 border-b border-black/10 pb-3 last:border-0 last:pb-0"
                      >
                        <div>
                          <p className="font-black">{item.name}</p>
                          {item.isBestSeller && (
                            <span className="mt-1 inline-flex rounded-md bg-[#1f6f53] px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-white">
                              Best seller
                            </span>
                          )}
                        </div>
                        <p className="font-black text-[#7b3320]">
                          PHP {item.price}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-black/10 bg-white/82 p-5 shadow-sm">
            <h2 className="text-2xl font-black">Recent Reviews</h2>
            <div className="mt-4 grid gap-3">
              {place.recentReviews.map((review, i) => (
                <article key={`${review.author}-${review.rating}-${i}`} className="rounded-lg bg-[#fffaf0] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-black">{review.author}</p>
                    <span className="inline-flex items-center gap-1 text-sm font-black text-[#7b3320]">
                      <Star size={14} fill="currentColor" aria-hidden="true" />
                      {review.rating}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-black/65">
                    {review.body}
                  </p>
                  <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-black/42">
                    {review.date}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-5 lg:self-start">
          <section className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
            <PlaceInsetMap place={place} />
          </section>

          <section className="rounded-lg border border-black/10 bg-white/82 p-5 shadow-sm">
            <h2 className="text-xl font-black">Details</h2>
            <div className="mt-4 space-y-4 text-sm font-semibold text-black/68">
              <DetailRow icon={MapPin} label="Address" value={place.address} />
              <DetailRow icon={Clock} label="Hours" value={place.hours} />
              <DetailRow icon={Phone} label="Contact" value={place.contact} />
              <DetailRow
                icon={User}
                label="Submitted by"
                value={place.submittedBy}
              />
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}

function groupMenuByCategory(menuItems: FoodPlace["menuItems"]) {
  return menuItems.reduce<Record<string, FoodPlace["menuItems"]>>(
    (groups, item) => {
      groups[item.category] = [...(groups[item.category] ?? []), item];
      return groups;
    },
    {},
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white/82 p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-black/42">
        {label}
      </p>
      <p className="mt-2 text-lg font-black">{value}</p>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <Icon size={18} className="mt-0.5 shrink-0 text-[#7b3320]" aria-hidden="true" />
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-black/42">
          {label}
        </p>
        <p className="mt-1 text-[#171714]">{value}</p>
      </div>
    </div>
  );
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
