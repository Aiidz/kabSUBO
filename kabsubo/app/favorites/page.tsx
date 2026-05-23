"use client";

import { ArrowLeft, Heart, MapPin, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { FoodPlace } from "@/app/data/places";
import { favoritesApi, type AuthUser } from "@/app/lib/api/kabsubo-api";
import { getStoredUser } from "@/app/lib/auth/session";

export default function FavoritesPage() {
  const [user] = useState<AuthUser | null>(() => getStoredUser());
  const [favorites, setFavorites] = useState<FoodPlace[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(user));

  useEffect(() => {
    async function loadFavorites() {
      if (!user) {
        return;
      }

      const result = await favoritesApi.list(user.id);
      setFavorites(result.data);
      setIsLoading(false);
    }

    void loadFavorites();
  }, [user]);

  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f3ec] px-5 text-[#171714]">
        <section className="max-w-xl rounded-lg border border-black/10 bg-white/86 p-6 shadow-sm">
          <h1 className="text-3xl font-black">Sign in to view favorites</h1>
          <p className="mt-2 font-semibold leading-7 text-black/62">
            Saved places are private to your account.
          </p>
          <Link
            href="/auth?next=/favorites"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-[#1f6f53] px-4 text-sm font-black text-white transition hover:bg-[#185840]"
          >
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f3ec] px-5 pb-6 pt-28 text-[#171714]">
      <section className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-black text-[#1f6f53]"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to map
        </Link>

        <header className="mt-6 rounded-lg border border-black/10 bg-white/86 p-5 shadow-sm">
          <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-[#7b3320]">
            <Heart size={16} fill="currentColor" aria-hidden="true" />
            Saved places
          </p>
          <h1 className="mt-2 text-4xl font-black">Favorites</h1>
          <p className="mt-2 max-w-2xl font-semibold leading-7 text-black/60">
            Your saved restaurants and food spots.
          </p>
        </header>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {isLoading ? (
            <p className="font-semibold text-black/60">Loading favorites...</p>
          ) : favorites.length === 0 ? (
            <div className="rounded-lg border border-black/10 bg-white/86 p-5 shadow-sm">
              <p className="font-black">No favorites yet.</p>
              <p className="mt-1 text-sm font-semibold text-black/58">
                Open a restaurant detail page and save it from your account
                actions panel.
              </p>
            </div>
          ) : (
            favorites.map((place) => (
              <article
                key={place.id}
                className="overflow-hidden rounded-lg border border-black/10 bg-white/86 shadow-sm"
              >
                <Image
                  src={place.bestSeller.imageUrl}
                  alt={place.bestSeller.name}
                  width={640}
                  height={240}
                  className="h-40 w-full object-cover"
                />
                <div className="p-4">
                  <h2 className="text-2xl font-black">{place.name}</h2>
                  <p className="mt-1 text-sm font-semibold text-black/58">
                    {place.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-sm font-black text-[#7b3320]">
                    <span className="inline-flex items-center gap-1">
                      <Star size={14} fill="currentColor" aria-hidden="true" />
                      {place.rating.toFixed(1)}
                    </span>
                    <span>{place.priceRange}</span>
                  </div>
                  <Link
                    href={`/place/${place.id}`}
                    className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#171714] px-3 text-sm font-black text-white transition hover:bg-[#2a2822]"
                  >
                    <MapPin size={15} aria-hidden="true" />
                    View details
                  </Link>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
