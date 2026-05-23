import { ArrowLeft, MapPinned, UsersRound } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "About | kabSUBO",
  description: "About the kabSUBO CvSU Indang food discovery project.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#f6f3ec] px-5 py-6 text-[#171714]">
      <section className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-black text-[#1f6f53]"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to map
        </Link>

        <header className="mt-6 rounded-lg border border-black/10 bg-white/86 p-6 shadow-sm">
          <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-[#7b3320]">
            <MapPinned size={16} aria-hidden="true" />
            About kabSUBO
          </p>
          <h1 className="mt-2 text-4xl font-black">
            CvSU Indang food discovery
          </h1>
          <p className="mt-3 max-w-2xl font-semibold leading-7 text-black/62">
            kabSUBO is a campus-focused food map for browsing, searching,
            comparing, and documenting nearby food spots around CvSU Main
            Campus in Indang, Cavite.
          </p>
        </header>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <section className="rounded-lg border border-black/10 bg-white/86 p-5 shadow-sm">
            <h2 className="text-2xl font-black">What it does</h2>
            <p className="mt-2 font-semibold leading-7 text-black/62">
              Students can search by craving, inspect map pins, compare dishes,
              get in-app directions, save favorites, review places, and submit
              new food spots for admin approval.
            </p>
          </section>

          <section className="rounded-lg border border-black/10 bg-white/86 p-5 shadow-sm">
            <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#7b3320]">
              <UsersRound size={16} aria-hidden="true" />
              Credits
            </p>
            <h2 className="mt-2 text-2xl font-black">Project draft</h2>
            <p className="mt-2 font-semibold leading-7 text-black/62">
              Built as an initial draft for a PHP and MySQL-backed campus food
              discovery system. Map rendering uses MapLibre/mapcn-style marker
              and route patterns.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
