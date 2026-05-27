"use client";

import { Heart, LogIn, MessageSquare, Send, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  favoritesApi,
  reviewsApi,
  type AuthUser,
} from "@/app/lib/api/kabsubo-api";
import { getStoredUser } from "@/app/lib/auth/session";

export function PlaceActions({ placeId }: { placeId: string }) {
  const router = useRouter();
  const [user] = useState<AuthUser | null>(() => getStoredUser());
  const [isFavorite, setIsFavorite] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewBody, setReviewBody] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadFavorites(currentUser: AuthUser) {
      const result = await favoritesApi.list(currentUser.id);
      setIsFavorite(result.data.some((place) => place.id === placeId));
    }

    if (user) {
      void loadFavorites(user);
    }
  }, [placeId, user]);

  async function handleFavorite() {
    if (!user) {
      return;
    }

    if (isFavorite) {
      await favoritesApi.remove({ placeId, userId: user.id });
      setIsFavorite(false);
      setMessage("Removed from favorites.");
      return;
    }

    await favoritesApi.add({ placeId, userId: user.id });
    setIsFavorite(true);
    setMessage("Saved to favorites.");
  }

  async function handleReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user || !reviewBody.trim()) {
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      await reviewsApi.create({
        placeId,
        author: user.name,
        rating,
        body: reviewBody.trim(),
      });
      setReviewBody("");
      setMessage("Review submitted.");
      router.refresh();
    } catch (error) {
      console.error("Failed to submit review:", error);
      setMessage("Failed to submit review.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!user) {
    return (
      <section className="rounded-lg border border-black/10 bg-white/82 p-5 shadow-sm">
        <h2 className="text-xl font-black">Account actions</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-black/62">
          Reviews and favorites need an account. You can still browse, search,
          compare, and view details without signing in.
        </p>
        <Link
          href={`/auth?next=/place/${placeId}`}
          className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#1f6f53] px-3 text-sm font-black text-white transition hover:bg-[#185840]"
        >
          <LogIn size={15} aria-hidden="true" />
          Sign in
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-black/10 bg-white/82 p-5 shadow-sm">
      <h2 className="text-xl font-black">Your account</h2>
      <p className="mt-1 text-sm font-semibold text-black/58">
        Signed in as {user.name}
      </p>

      <button
        type="button"
        onClick={() => void handleFavorite()}
        className={`mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md px-3 text-sm font-black transition ${
          isFavorite
            ? "bg-[#7b3320] text-white hover:bg-[#632817]"
            : "bg-[#1f6f53] text-white hover:bg-[#185840]"
        }`}
      >
        <Heart size={15} fill="currentColor" aria-hidden="true" />
        {isFavorite ? "Saved favorite" : "Save favorite"}
      </button>

      <form onSubmit={handleReview} className="mt-5 space-y-3">
        <p className="inline-flex items-center gap-2 text-sm font-black text-[#7b3320]">
          <MessageSquare size={15} aria-hidden="true" />
          Leave a review
        </p>
        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-black/45">
            Rating
          </span>
          <select
            value={rating}
            onChange={(event) => setRating(Number(event.target.value))}
            className="mt-2 h-10 w-full rounded-md border border-black/10 bg-[#fffaf0] px-3 text-sm font-black outline-none focus:border-[#1f6f53]"
          >
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>
                {value} stars
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-black/45">
            Notes
          </span>
          <textarea
            value={reviewBody}
            onChange={(event) => setReviewBody(event.target.value)}
            className="mt-2 min-h-24 w-full rounded-md border border-black/10 bg-[#fffaf0] px-3 py-2 text-sm font-semibold outline-none focus:border-[#1f6f53]"
            placeholder="What should other students know?"
          />
        </label>
        <button
          type="submit"
          disabled={!reviewBody.trim() || isSubmitting}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#171714] px-3 text-sm font-black text-white transition hover:bg-[#2a2822] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Send size={15} aria-hidden="true" />
          {isSubmitting ? "Submitting..." : "Submit review"}
        </button>
      </form>

      {message && (
        <p className={`mt-3 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-black ${
          message.includes("Failed")
            ? "bg-[#fff4e7] text-[#7b3320]"
            : "bg-[#eef7ef] text-[#185840]"
        }`}>
          <Star size={14} fill="currentColor" aria-hidden="true" />
          {message}
        </p>
      )}
    </section>
  );
}
