"use client";

import {
  ArrowLeft,
  Check,
  Clock,
  Edit3,
  Image as ImageIcon,
  MapPin,
  Search,
  Shield,
  SlidersHorizontal,
  Trash2,
  Utensils,
  X,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import type { FoodPlace } from "@/app/data/places";
import {
  placesApi,
  submissionsApi,
  type AuthUser,
  type SubmissionRecord,
  type SubmissionStatus,
} from "@/app/lib/api/kabsubo-api";
import { getStoredUser } from "@/app/lib/auth/session";

type QueueTab = SubmissionStatus | "all";

type DraftMenuItem = FoodPlace["menuItems"][number] & {
  tagText: string;
};

type PlaceDraft = {
  name: string;
  type: string;
  description: string;
  address: string;
  priceRange: string;
  hours: string;
  contact: string;
  submittedBy: string;
  longitude: string;
  latitude: string;
  tagText: string;
  menuHighlightText: string;
  bestSellerName: string;
  bestSellerImageUrl: string;
  moderationNotes: string;
  menuItems: DraftMenuItem[];
};

const tabs: Array<{ label: string; value: QueueTab }> = [
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "All", value: "all" },
];

export default function AdminPage() {
  const [user] = useState<AuthUser | null>(() => getStoredUser());
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [places, setPlaces] = useState<FoodPlace[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<QueueTab>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [draft, setDraft] = useState<PlaceDraft | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(user));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadAdminData() {
      const [submissionResult, placeResult] = await Promise.all([
        submissionsApi.list(),
        placesApi.list(),
      ]);
      const nextSubmissions = submissionResult.data;

      const initialSubmission =
        nextSubmissions.find((submission) => submission.status === "pending") ??
        nextSubmissions[0];
      const initialPlace = placeResult.data.find(
        (place) => place.id === initialSubmission?.placeId,
      );

      setSubmissions(nextSubmissions);
      setPlaces(placeResult.data);
      setSelectedSubmissionId(initialSubmission?.id ?? null);
      setDraft(
        initialSubmission && initialPlace
          ? createDraft(initialPlace, initialSubmission.notes)
          : null,
      );
      setIsLoading(false);
    }

    if (user?.role === "admin") {
      void loadAdminData();
    }
  }, [user]);

  const selectedSubmission = submissions.find(
    (submission) => submission.id === selectedSubmissionId,
  );
  const selectedPlace = selectedSubmission
    ? places.find((place) => place.id === selectedSubmission.placeId)
    : undefined;

  const stats = useMemo(
    () => ({
      all: submissions.length,
      approved: submissions.filter((submission) => submission.status === "approved")
        .length,
      pending: submissions.filter((submission) => submission.status === "pending")
        .length,
      rejected: submissions.filter((submission) => submission.status === "rejected")
        .length,
    }),
    [submissions],
  );

  const visibleSubmissions = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return submissions
      .filter((submission) =>
        activeTab === "all" ? true : submission.status === activeTab,
      )
      .filter((submission) => {
        if (!normalizedQuery) {
          return true;
        }

        const place = places.find((item) => item.id === submission.placeId);
        const searchable = [
          submission.placeId,
          submission.submittedBy,
          submission.status,
          place?.name,
          place?.type,
          place?.address,
          place?.tags.join(" "),
          place?.menuItems.map((item) => item.name).join(" "),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchable.includes(normalizedQuery);
      });
  }, [activeTab, places, searchQuery, submissions]);

  async function saveDraft() {
    if (!draft || !selectedPlace) {
      return null;
    }

    setIsSaving(true);

    try {
      const updatedPlace = await placesApi.update(selectedPlace.id, {
        name: draft.name.trim(),
        type: draft.type.trim(),
        description: draft.description.trim(),
        address: draft.address.trim(),
        priceRange: draft.priceRange.trim(),
        hours: draft.hours.trim(),
        contact: draft.contact.trim(),
        submittedBy: draft.submittedBy.trim(),
        coordinates: [
          Number(draft.longitude) || selectedPlace.coordinates[0],
          Number(draft.latitude) || selectedPlace.coordinates[1],
        ],
        tags: toList(draft.tagText),
        menuHighlights: toList(draft.menuHighlightText),
        bestSeller: {
          name: draft.bestSellerName.trim(),
          imageUrl: draft.bestSellerImageUrl.trim(),
        },
        menuItems: draft.menuItems.map(({ tagText, ...item }) => ({
          ...item,
          name: item.name.trim(),
          category: item.category.trim(),
          prepNote: item.prepNote?.trim(),
          price: Number(item.price) || 0,
          tags: toList(tagText),
        })),
      });

      setPlaces((currentPlaces) =>
        currentPlaces.map((place) =>
          place.id === selectedPlace.id ? updatedPlace.data : place,
        ),
      );

      return updatedPlace.data;
    } finally {
      setIsSaving(false);
    }
  }

  async function updateModerationStatus(status: SubmissionStatus) {
    if (!selectedSubmission || !selectedPlace || !draft) {
      return;
    }

    setIsSaving(true);

    try {
      const updatedPlace = await saveDraft();
      const updatedSubmission = await submissionsApi.updateStatus(
        selectedSubmission.id,
        status,
        draft.moderationNotes.trim() || undefined,
      );

      setSubmissions((currentSubmissions) =>
        currentSubmissions.map((submission) =>
          submission.id === selectedSubmission.id
            ? updatedSubmission.data
            : submission,
        ),
      );
      setPlaces((currentPlaces) =>
        currentPlaces.map((place) =>
          place.id === selectedPlace.id
            ? { ...(updatedPlace ?? place), status }
            : place,
        ),
      );
      setActiveTab(status);
    } finally {
      setIsSaving(false);
    }
  }

  async function removeSelectedSubmission() {
    if (!selectedSubmission) {
      return;
    }

    await submissionsApi.remove(selectedSubmission.id);
    setSubmissions((currentSubmissions) =>
      currentSubmissions.filter(
        (submission) => submission.id !== selectedSubmission.id,
      ),
    );
    const nextSubmission = submissions.find(
      (submission) => submission.id !== selectedSubmission.id,
    );
    const nextPlace = places.find((place) => place.id === nextSubmission?.placeId);

    setSelectedSubmissionId(nextSubmission?.id ?? null);
    setDraft(
      nextSubmission && nextPlace
        ? createDraft(nextPlace, nextSubmission.notes)
        : null,
    );
  }

  function selectSubmission(submission: SubmissionRecord) {
    const place = places.find((item) => item.id === submission.placeId);

    setSelectedSubmissionId(submission.id);
    setDraft(place ? createDraft(place, submission.notes) : null);
  }

  function updateDraft<K extends keyof PlaceDraft>(key: K, value: PlaceDraft[K]) {
    setDraft((currentDraft) =>
      currentDraft ? { ...currentDraft, [key]: value } : currentDraft,
    );
  }

  function updateMenuItem(
    index: number,
    key: keyof DraftMenuItem,
    value: string | number | boolean | undefined,
  ) {
    setDraft((currentDraft) =>
      currentDraft
        ? {
            ...currentDraft,
            menuItems: currentDraft.menuItems.map((item, itemIndex) =>
              itemIndex === index ? { ...item, [key]: value } : item,
            ),
          }
        : currentDraft,
    );
  }

  if (!user) {
    return (
      <AccessPanel
        title="Sign in required"
        body="Admin moderation needs an admin account."
      />
    );
  }

  if (user.role !== "admin") {
    return (
      <AccessPanel
        title="Admin only"
        body="Your account can submit places, review, and save favorites, but moderation is limited to admins."
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#fffaf0] px-4 pb-6 pt-28 text-[#073d33] sm:px-6">
      <section className="mx-auto max-w-7xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-black text-[#004b35]"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to map
        </Link>

        <header className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#7b3320]">
              <Shield size={16} aria-hidden="true" />
              Admin moderation
            </p>
            <h1 className="mt-2 text-4xl font-black leading-none sm:text-5xl">
              Submission queue
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[#416763]">
              Review pending food places before they appear on the map, search,
              recommendations, and chatbot answers.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[460px]">
            <StatCard label="Pending" value={stats.pending} tone="pending" />
            <StatCard label="Approved" value={stats.approved} tone="approved" />
            <StatCard label="Rejected" value={stats.rejected} tone="rejected" />
            <StatCard label="Total" value={stats.all} tone="neutral" />
          </div>
        </header>

        <div className="mt-6 grid gap-4 lg:grid-cols-[390px_minmax(0,1fr)]">
          <section className="rounded-lg border border-[#004b35]/16 bg-[#f8f5e9] p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveTab(tab.value)}
                  className={`h-9 rounded-full px-4 text-xs font-black uppercase tracking-[0.12em] transition ${
                    activeTab === tab.value
                      ? "bg-[#004b35] text-[#fffaf0]"
                      : "border border-[#004b35]/12 bg-[#fffaf0] text-[#416763] hover:border-[#004b35]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <label className="mt-4 flex h-10 items-center gap-2 rounded-md border border-[#004b35]/30 bg-[#fffaf0] px-3">
              <Search size={17} aria-hidden="true" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[#416763]"
                placeholder="Search name, submitter, menu..."
              />
            </label>

            <div className="mt-4 space-y-3">
              {isLoading ? (
                <QueueEmpty title="Loading queue..." />
              ) : visibleSubmissions.length === 0 ? (
                <QueueEmpty title="No submissions match this view." />
              ) : (
                visibleSubmissions.map((submission) => {
                  const place = places.find(
                    (item) => item.id === submission.placeId,
                  );

                  return (
                    <QueueCard
                      key={submission.id}
                      isSelected={submission.id === selectedSubmissionId}
                      place={place}
                      submission={submission}
                      onSelect={() => selectSubmission(submission)}
                    />
                  );
                })
              )}
            </div>
          </section>

          <section className="min-h-[640px] rounded-lg border border-[#004b35]/16 bg-[#f8f5e9] p-4 shadow-sm">
            {!selectedSubmission || !selectedPlace || !draft ? (
              <div className="grid min-h-[520px] place-items-center rounded-lg border border-dashed border-[#004b35]/24 bg-[#fffaf0] p-6 text-center">
                <div>
                  <SlidersHorizontal
                    size={40}
                    className="mx-auto text-[#416763]"
                    aria-hidden="true"
                  />
                  <h2 className="mt-3 text-2xl font-black">Select a submission</h2>
                  <p className="mt-2 text-sm font-semibold text-[#416763]">
                    Choose a queue item to review, edit, approve, or reject it.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
                <div className="space-y-4">
                  <section className="rounded-lg border border-[#004b35]/12 bg-[#fffaf0] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <StatusBadge status={selectedSubmission.status} />
                        <h2 className="mt-3 text-3xl font-black leading-tight">
                          {selectedPlace.name}
                        </h2>
                        <p className="mt-1 text-sm font-semibold text-[#416763]">
                          Submitted by {selectedSubmission.submittedBy}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void saveDraft()}
                          disabled={isSaving}
                          className="inline-flex h-10 items-center gap-2 rounded-full border border-[#004b35]/18 bg-white px-4 text-sm font-black text-[#004b35] transition hover:border-[#004b35] disabled:opacity-50"
                        >
                          <Edit3 size={15} aria-hidden="true" />
                          Save edits
                        </button>
                        <button
                          type="button"
                          onClick={() => void updateModerationStatus("approved")}
                          disabled={isSaving}
                          className="inline-flex h-10 items-center gap-2 rounded-full bg-[#004b35] px-4 text-sm font-black text-[#fffaf0] transition hover:bg-[#073d33] disabled:opacity-50"
                        >
                          <Check size={15} aria-hidden="true" />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => void updateModerationStatus("rejected")}
                          disabled={isSaving}
                          className="inline-flex h-10 items-center gap-2 rounded-full border border-[#7b3320]/30 bg-[#fff3e1] px-4 text-sm font-black text-[#7b3320] transition hover:border-[#7b3320] disabled:opacity-50"
                        >
                          <X size={15} aria-hidden="true" />
                          Reject
                        </button>
                      </div>
                    </div>
                  </section>

                  <EditorSection title="Basic info" icon={Utensils}>
                    <div className="grid gap-3 md:grid-cols-2">
                      <TextField
                        label="Place name"
                        value={draft.name}
                        onChange={(value) => updateDraft("name", value)}
                      />
                      <TextField
                        label="Type"
                        value={draft.type}
                        onChange={(value) => updateDraft("type", value)}
                      />
                      <TextField
                        label="Price range"
                        value={draft.priceRange}
                        onChange={(value) => updateDraft("priceRange", value)}
                      />
                      <TextField
                        label="Hours"
                        value={draft.hours}
                        onChange={(value) => updateDraft("hours", value)}
                      />
                      <TextField
                        label="Contact"
                        value={draft.contact}
                        onChange={(value) => updateDraft("contact", value)}
                      />
                      <TextField
                        label="Submitted by"
                        value={draft.submittedBy}
                        onChange={(value) => updateDraft("submittedBy", value)}
                      />
                    </div>
                    <TextArea
                      label="Description"
                      value={draft.description}
                      onChange={(value) => updateDraft("description", value)}
                    />
                    <div className="grid gap-3 md:grid-cols-2">
                      <TextField
                        label="Tags"
                        value={draft.tagText}
                        onChange={(value) => updateDraft("tagText", value)}
                      />
                      <TextField
                        label="Menu highlights"
                        value={draft.menuHighlightText}
                        onChange={(value) =>
                          updateDraft("menuHighlightText", value)
                        }
                      />
                    </div>
                  </EditorSection>

                  <EditorSection title="Location" icon={MapPin}>
                    <TextField
                      label="Address"
                      value={draft.address}
                      onChange={(value) => updateDraft("address", value)}
                    />
                    <div className="grid gap-3 md:grid-cols-2">
                      <TextField
                        label="Longitude"
                        value={draft.longitude}
                        onChange={(value) => updateDraft("longitude", value)}
                      />
                      <TextField
                        label="Latitude"
                        value={draft.latitude}
                        onChange={(value) => updateDraft("latitude", value)}
                      />
                    </div>
                    <div className="relative h-36 overflow-hidden rounded-lg border border-[#004b35]/16 bg-[#e7e2d2]">
                      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,75,53,0.08)_1px,transparent_1px),linear-gradient(rgba(0,75,53,0.08)_1px,transparent_1px)] bg-[size:28px_28px]" />
                      <div className="absolute left-1/2 top-1/2 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#ffd400] text-[#004b35] shadow-lg">
                        <MapPin size={22} fill="currentColor" aria-hidden="true" />
                      </div>
                    </div>
                  </EditorSection>

                  <EditorSection title="Menu items" icon={Clock}>
                    <div className="space-y-3">
                      {draft.menuItems.map((item, index) => (
                        <div
                          key={`${item.name}-${index}`}
                          className="rounded-lg border border-[#004b35]/12 bg-[#f8f5e9] p-3"
                        >
                          <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_100px]">
                            <TextField
                              label="Item"
                              value={item.name}
                              onChange={(value) =>
                                updateMenuItem(index, "name", value)
                              }
                            />
                            <TextField
                              label="Category"
                              value={item.category}
                              onChange={(value) =>
                                updateMenuItem(index, "category", value)
                              }
                            />
                            <TextField
                              label="Price"
                              value={String(item.price)}
                              onChange={(value) =>
                                updateMenuItem(index, "price", Number(value))
                              }
                            />
                          </div>
                          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                            <TextField
                              label="Prep notes"
                              value={item.prepNote ?? ""}
                              onChange={(value) =>
                                updateMenuItem(index, "prepNote", value)
                              }
                            />
                            <TextField
                              label="Tags"
                              value={item.tagText}
                              onChange={(value) =>
                                updateMenuItem(index, "tagText", value)
                              }
                            />
                            <label className="flex items-end gap-2 pb-2 text-sm font-black text-[#073d33]">
                              <input
                                checked={Boolean(item.isBestSeller)}
                                onChange={(event) =>
                                  updateMenuItem(
                                    index,
                                    "isBestSeller",
                                    event.target.checked,
                                  )
                                }
                                type="checkbox"
                                className="size-4 accent-[#004b35]"
                              />
                              Best seller
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </EditorSection>
                </div>

                <aside className="space-y-4">
                  <EditorSection title="Photos" icon={ImageIcon}>
                    <div className="overflow-hidden rounded-lg border border-[#004b35]/12 bg-[#f8f5e9]">
                      <Image
                        src={draft.bestSellerImageUrl}
                        alt={draft.bestSellerName}
                        width={640}
                        height={360}
                        className="h-40 w-full object-cover"
                      />
                    </div>
                    <TextField
                      label="Best seller"
                      value={draft.bestSellerName}
                      onChange={(value) => updateDraft("bestSellerName", value)}
                    />
                    <TextArea
                      label="Image URL"
                      value={draft.bestSellerImageUrl}
                      onChange={(value) =>
                        updateDraft("bestSellerImageUrl", value)
                      }
                    />
                  </EditorSection>

                  <EditorSection title="Moderation notes" icon={Shield}>
                    <TextArea
                      label="Internal note or rejection reason"
                      value={draft.moderationNotes}
                      onChange={(value) => updateDraft("moderationNotes", value)}
                    />
                    <p className="text-xs font-semibold leading-5 text-[#416763]">
                      Notes are stored with the submission record and are ready
                      for the PHP backend moderation table.
                    </p>
                  </EditorSection>

                  <button
                    type="button"
                    onClick={() => void removeSelectedSubmission()}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[#7b3320]/24 bg-[#fff3e1] text-sm font-black text-[#7b3320] transition hover:border-[#7b3320]"
                  >
                    <Trash2 size={15} aria-hidden="true" />
                    Remove submission
                  </button>
                </aside>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function QueueCard({
  isSelected,
  place,
  submission,
  onSelect,
}: {
  isSelected: boolean;
  place?: FoodPlace;
  submission: SubmissionRecord;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-lg border p-4 text-left transition ${
        isSelected
          ? "border-[#004b35] bg-[#fffaf0] shadow-[0_8px_18px_rgba(0,75,53,0.12)]"
          : "border-[#004b35]/12 bg-[#fffaf0]/70 hover:border-[#004b35]/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-black">
            {place?.name ?? submission.placeId}
          </h2>
          <p className="mt-1 text-xs font-semibold text-[#416763]">
            Submitted by {submission.submittedBy}
          </p>
        </div>
        <StatusBadge status={submission.status} />
      </div>
      <p className="mt-3 line-clamp-2 text-sm font-semibold leading-5 text-[#416763]">
        {place?.description ?? "Place details are unavailable."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-black text-[#416763]">
        <span className="rounded-full bg-[#f8f5e9] px-2 py-1">
          {place?.menuItems.length ?? 0} menu items
        </span>
        <span className="rounded-full bg-[#f8f5e9] px-2 py-1">
          {place?.tags.length ?? 0} tags
        </span>
        <span className="rounded-full bg-[#f8f5e9] px-2 py-1">
          Pin ready
        </span>
      </div>
    </button>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "pending" | "approved" | "rejected" | "neutral";
}) {
  const classes = {
    approved: "border-[#004b35]/16 bg-[#e8f6d9]",
    neutral: "border-[#004b35]/16 bg-[#f8f5e9]",
    pending: "border-[#ffd400]/70 bg-[#fff8d7]",
    rejected: "border-[#7b3320]/20 bg-[#fff3e1]",
  };

  return (
    <div className={`rounded-lg border px-3 py-3 ${classes[tone]}`}>
      <p className="text-2xl font-black leading-none">{value}</p>
      <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-[#416763]">
        {label}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: SubmissionRecord["status"] }) {
  const classes = {
    approved: "bg-[#e8f6d9] text-[#2c7c2f]",
    pending: "bg-[#fff8d7] text-[#7b5b00]",
    rejected: "bg-[#fff3e1] text-[#7b3320]",
  };

  return (
    <span
      className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${classes[status]}`}
    >
      {status}
    </span>
  );
}

function EditorSection({
  children,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-[#004b35]/12 bg-[#fffaf0] p-4">
      <h3 className="inline-flex items-center gap-2 text-lg font-black">
        <Icon size={18} aria-hidden="true" />
        {title}
      </h3>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function TextField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.12em] text-[#416763]">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-md border border-[#004b35]/24 bg-[#fffdf4] px-3 text-sm font-semibold text-[#073d33] outline-none transition focus:border-[#004b35]"
      />
    </label>
  );
}

function TextArea({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.12em] text-[#416763]">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="mt-1 w-full resize-y rounded-md border border-[#004b35]/24 bg-[#fffdf4] px-3 py-2 text-sm font-semibold leading-5 text-[#073d33] outline-none transition focus:border-[#004b35]"
      />
    </label>
  );
}

function QueueEmpty({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[#004b35]/24 bg-[#fffaf0] p-4 text-sm font-semibold text-[#416763]">
      {title}
    </div>
  );
}

function AccessPanel({ title, body }: { title: string; body: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#fffaf0] px-5 text-[#073d33]">
      <section className="max-w-xl rounded-lg border border-[#004b35]/16 bg-[#f8f5e9] p-6 shadow-sm">
        <span className="grid size-12 place-items-center rounded-lg bg-[#004b35] text-[#fffaf0]">
          <Shield size={24} aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-3xl font-black">{title}</h1>
        <p className="mt-2 font-semibold leading-7 text-[#416763]">{body}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/auth?next=/admin"
            className="inline-flex h-11 items-center justify-center rounded-full bg-[#004b35] px-5 text-sm font-black text-[#fffaf0] transition hover:bg-[#073d33]"
          >
            Sign in
          </Link>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-full border border-[#004b35]/18 bg-[#fffaf0] px-5 text-sm font-black text-[#073d33] transition hover:border-[#004b35]"
          >
            Back to map
          </Link>
        </div>
      </section>
    </main>
  );
}

function createDraft(place: FoodPlace, notes = ""): PlaceDraft {
  return {
    name: place.name,
    type: place.type,
    description: place.description,
    address: place.address,
    priceRange: place.priceRange,
    hours: place.hours,
    contact: place.contact,
    submittedBy: place.submittedBy,
    longitude: String(place.coordinates[0]),
    latitude: String(place.coordinates[1]),
    tagText: place.tags.join(", "),
    menuHighlightText: place.menuHighlights.join(", "),
    bestSellerName: place.bestSeller.name,
    bestSellerImageUrl: place.bestSeller.imageUrl,
    moderationNotes: notes,
    menuItems: place.menuItems.map((item) => ({
      ...item,
      tagText: item.tags.join(", "),
    })),
  };
}

function toList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
