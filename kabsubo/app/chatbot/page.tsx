"use client";

import { ArrowLeft, Bot, Send, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { campusCenter } from "@/app/data/places";
import {
  createChatMessage,
  createKabsuboReply,
  type ChatMessage,
} from "@/app/lib/chatbot/kabsubo-rag";
import type { Coordinates } from "@/app/components/map-canvas";
import { placesApi } from "@/app/lib/api/kabsubo-api";
import type { FoodPlace } from "@/app/data/places";

const starterPrompts = [
  "nearest places",
  "most liked places",
  "cheap student meals",
  "what is open now?",
];

type ChatPlace = FoodPlace & {
  distanceKm: number;
  openNow: boolean;
};

export default function ChatbotPage() {
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [places, setPlaces] = useState<ChatPlace[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadPlaces() {
      try {
        const result = await placesApi.listApproved();
        const chatPlaces = result.data.map((place) => ({
          ...place,
          distanceKm: getDistanceKm(campusCenter, place.coordinates),
          openNow: isOpenNow(place.hours),
        }));
        setPlaces(chatPlaces);
      } catch (error) {
        console.error("Failed to load chatbot data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    void loadPlaces();
  }, []);

  function sendMessage(message: string) {
    const nextMessage = message.trim();

    if (!nextMessage || isLoading) {
      return;
    }

    const reply = createKabsuboReply({
      message: nextMessage,
      originLabel: "campus center",
      places,
      selectedPlaceIds: [],
    });

    setMessages((currentMessages) => [
      ...currentMessages,
      createChatMessage("user", nextMessage),
      createChatMessage("assistant", reply),
    ]);
    setChatInput("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(chatInput);
  }

  return (
    <main className="min-h-screen bg-[#fffaf0] px-5 pb-6 pt-28 text-[#073d33]">
      <section className="mx-auto grid min-h-[calc(100vh-8.5rem)] max-w-6xl overflow-hidden rounded-[24px] border border-[#004b35]/14 bg-[#f8f5e9] shadow-[0_18px_42px_rgba(0,75,53,0.14)] lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="border-b border-[#004b35]/12 bg-[#004b35] p-6 text-[#fffaf0] lg:border-b-0 lg:border-r">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-black text-[#fffaf0]"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to map
          </Link>

          <div className="mt-12">
            <Bot size={72} strokeWidth={2.2} aria-hidden="true" />
            <h1 className="mt-5 text-4xl font-black leading-none">
              Ask Kabsubo
            </h1>
            <p className="mt-4 text-sm font-semibold leading-6 text-[#fffaf0]/78">
              Nearby picks, budget meals, open spots, and quick food decisions
              around CvSU Indang.
            </p>
          </div>

          <div className="mt-8 grid gap-2">
            {starterPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => sendMessage(prompt)}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#fffaf0]/18 px-4 text-left text-sm font-black text-[#fffaf0] transition hover:bg-[#fffaf0]/10"
              >
                <Sparkles size={15} aria-hidden="true" />
                {prompt}
              </button>
            ))}
          </div>
        </aside>

        <section className="flex min-h-[620px] flex-col p-5 sm:p-7">
          <div className="mx-auto flex max-w-xs flex-col items-center pt-4 text-center">
            <Bot size={84} strokeWidth={2.4} aria-hidden="true" />
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
            className="mt-8 min-h-0 flex-1 space-y-3 overflow-y-auto rounded-lg border border-[#004b35]/10 bg-[#fffaf0] p-4"
            aria-label="Chat messages"
          >
            {isLoading ? (
              <div className="rounded-xl border border-[#004b35]/15 bg-[#f6efda] px-4 py-3 text-sm font-semibold leading-5 text-[#416763]">
                Bot is preparing CvSU food data...
              </div>
            ) : messages.length === 0 ? (
              <div className="rounded-xl border border-[#004b35]/15 bg-[#f6efda] px-4 py-3 text-sm font-semibold leading-5 text-[#416763]">
                Ready when cravings get confusing.
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
                    <p
                      key={`${message.id}-${index}`}
                      className={index > 0 ? "mt-2" : ""}
                    >
                      {line}
                    </p>
                  ))}
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-2">
            <input
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              className="h-11 min-w-0 flex-1 rounded-md border border-[#004b35] bg-[#fffdf4] px-3 text-sm font-semibold outline-none placeholder:text-[#416763]"
              placeholder={isLoading ? "Loading data..." : "Ask Kabsubo..."}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !chatInput.trim()}
              className="grid size-11 shrink-0 place-items-center rounded-md bg-[#004b35] text-[#fffaf0] transition hover:bg-[#073d33] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Send message"
            >
              <Send size={18} aria-hidden="true" />
            </button>
          </form>
        </section>
      </section>
    </main>
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
