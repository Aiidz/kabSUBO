"use client";

import { ArrowLeft, Check, Shield, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  submissionsApi,
  type AuthUser,
  type SubmissionRecord,
} from "@/app/lib/api/kabsubo-api";
import { getStoredUser } from "@/app/lib/auth/session";

export default function AdminPage() {
  const [user] = useState<AuthUser | null>(() => getStoredUser());
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const pendingSubmissions = useMemo(
    () => submissions.filter((submission) => submission.status === "pending"),
    [submissions],
  );

  useEffect(() => {
    async function loadQueue() {
      const result = await submissionsApi.list();
      setSubmissions(result.data);
      setIsLoading(false);
    }

    void loadQueue();
  }, []);

  async function updateSubmission(
    submissionId: string,
    status: "approved" | "rejected",
  ) {
    const result = await submissionsApi.updateStatus(submissionId, status);
    setSubmissions((currentSubmissions) =>
      currentSubmissions.map((submission) =>
        submission.id === submissionId ? result.data : submission,
      ),
    );
  }

  async function removeSubmission(submissionId: string) {
    await submissionsApi.remove(submissionId);
    setSubmissions((currentSubmissions) =>
      currentSubmissions.filter((submission) => submission.id !== submissionId),
    );
  }

  if (!user) {
    return <AccessPanel title="Sign in required" body="Admin moderation needs an admin account." />;
  }

  if (user.role !== "admin") {
    return <AccessPanel title="Admin only" body="Your account can submit places, review, and save favorites, but moderation is limited to admins." />;
  }

  return (
    <main className="min-h-screen bg-[#f6f3ec] px-5 py-6 text-[#171714]">
      <section className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-black text-[#1f6f53]"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to map
        </Link>

        <div className="mt-6 rounded-lg border border-black/10 bg-white/86 p-5 shadow-sm">
          <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-[#7b3320]">
            <Shield size={16} aria-hidden="true" />
            Admin role
          </p>
          <h1 className="mt-2 text-4xl font-black">Submission moderation</h1>
          <p className="mt-2 max-w-2xl font-semibold leading-7 text-black/60">
            Pending submissions stay hidden from public browse, search, compare,
            and detail views until approved here.
          </p>
        </div>

        <div className="mt-5 rounded-lg border border-black/10 bg-white/86 p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-black">Pending queue</h2>
            <span className="rounded-md bg-[#fffaf0] px-3 py-2 text-sm font-black text-[#7b3320]">
              {pendingSubmissions.length} pending
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {isLoading ? (
              <p className="font-semibold text-black/60">Loading queue...</p>
            ) : pendingSubmissions.length === 0 ? (
              <p className="rounded-md bg-[#fffaf0] px-3 py-3 font-semibold text-black/60">
                No pending submissions right now.
              </p>
            ) : (
              pendingSubmissions.map((submission) => (
                <article
                  key={submission.id}
                  className="rounded-lg border border-black/10 bg-[#fffaf0] p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-black text-[#171714]">
                        {submission.placeId}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-black/58">
                        Submitted by {submission.submittedBy}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          void updateSubmission(submission.id, "approved")
                        }
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#1f6f53] px-3 text-sm font-black text-white transition hover:bg-[#185840]"
                      >
                        <Check size={15} aria-hidden="true" />
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void updateSubmission(submission.id, "rejected")
                        }
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#7b3320]/20 bg-white px-3 text-sm font-black text-[#7b3320] transition hover:border-[#7b3320]"
                      >
                        <X size={15} aria-hidden="true" />
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeSubmission(submission.id)}
                        className="grid size-10 place-items-center rounded-md border border-black/10 bg-white text-[#7b3320] transition hover:border-[#7b3320]"
                        aria-label={`Remove ${submission.placeId}`}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function AccessPanel({ title, body }: { title: string; body: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f3ec] px-5 text-[#171714]">
      <section className="max-w-xl rounded-lg border border-black/10 bg-white/86 p-6 shadow-sm">
        <span className="grid size-12 place-items-center rounded-lg bg-[#1f6f53] text-white">
          <Shield size={24} aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-3xl font-black">{title}</h1>
        <p className="mt-2 font-semibold leading-7 text-black/62">{body}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/auth?next=/admin"
            className="inline-flex h-11 items-center justify-center rounded-md bg-[#1f6f53] px-4 text-sm font-black text-white transition hover:bg-[#185840]"
          >
            Sign in
          </Link>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-md border border-black/10 bg-white px-4 text-sm font-black text-[#171714] transition hover:border-[#1f6f53]"
          >
            Back to map
          </Link>
        </div>
      </section>
    </main>
  );
}
