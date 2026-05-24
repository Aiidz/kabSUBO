"use client";

import { ArrowLeft, Edit3, FileClock, Store } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  submissionsApi,
  type AuthUser,
  type SubmissionRecord,
} from "@/app/lib/api/kabsubo-api";
import { getStoredUser } from "@/app/lib/auth/session";

export default function MySubmissionsPage() {
  const [user] = useState<AuthUser | null>(() => getStoredUser());
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(user));
  const ownSubmissions = useMemo(
    () =>
      user
        ? submissions.filter(
            (submission) =>
              submission.ownerUserId === user.id ||
              submission.submittedBy === user.name,
          )
        : [],
    [submissions, user],
  );

  useEffect(() => {
    async function loadSubmissions() {
      const result = await submissionsApi.list();
      setSubmissions(result.data);
      setIsLoading(false);
    }

    if (user) {
      void loadSubmissions();
    }
  }, [user]);

  if (!user) {
    return (
      <AccountRequired
        title="Sign in to view submissions"
        body="Your submission history is tied to your account."
      />
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
            <FileClock size={16} aria-hidden="true" />
            My account
          </p>
          <h1 className="mt-2 text-4xl font-black">My submissions</h1>
          <p className="mt-2 max-w-2xl font-semibold leading-7 text-black/60">
            Track pending, approved, and rejected places you submitted. Editing
            hooks are ready for the PHP backend ownership rules.
          </p>
        </header>

        <div className="mt-5 space-y-3 rounded-lg border border-black/10 bg-white/86 p-4 shadow-sm">
          {isLoading ? (
            <p className="font-semibold text-black/60">Loading submissions...</p>
          ) : ownSubmissions.length === 0 ? (
            <div className="rounded-md bg-[#fffaf0] p-4">
              <p className="font-black">No submissions yet.</p>
              <Link
                href="/submit"
                className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#1f6f53] px-3 text-sm font-black text-white transition hover:bg-[#185840]"
              >
                <Store size={15} aria-hidden="true" />
                Add a place
              </Link>
            </div>
          ) : (
            ownSubmissions.map((submission) => (
              <article
                key={submission.id}
                className="rounded-lg border border-black/10 bg-[#fffaf0] p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-black">{submission.placeId}</h2>
                    <p className="mt-1 text-sm font-semibold text-black/58">
                      Submitted by {submission.submittedBy}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={submission.status} />
                    <button
                      type="button"
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-black/10 bg-white px-3 text-sm font-black text-[#171714] transition hover:border-[#1f6f53]"
                    >
                      <Edit3 size={15} aria-hidden="true" />
                      Edit draft
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

function AccountRequired({ title, body }: { title: string; body: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f3ec] px-5 text-[#171714]">
      <section className="max-w-xl rounded-lg border border-black/10 bg-white/86 p-6 shadow-sm">
        <h1 className="text-3xl font-black">{title}</h1>
        <p className="mt-2 font-semibold leading-7 text-black/62">{body}</p>
        <Link
          href="/auth?next=/my/submissions"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-[#1f6f53] px-4 text-sm font-black text-white transition hover:bg-[#185840]"
        >
          Sign in
        </Link>
      </section>
    </main>
  );
}

function StatusBadge({ status }: { status: SubmissionRecord["status"] }) {
  const classes = {
    approved: "bg-[#e8f5ea] text-[#1f6f53]",
    pending: "bg-[#fff4e7] text-[#7b3320]",
    rejected: "bg-[#f3e7df] text-[#7b3320]",
  };

  return (
    <span
      className={`rounded-md px-3 py-2 text-xs font-black uppercase tracking-[0.14em] ${classes[status]}`}
    >
      {status}
    </span>
  );
}
