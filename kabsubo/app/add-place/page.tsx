"use client";

import {
  ArrowLeft,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Plus,
  Send,
  Store,
  Trash2,
  Utensils,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type Map, type Marker } from "maplibre-gl";
import {
  campusCenter,
  cvsuIndangBounds,
  isWithinCvsuIndangBounds,
  type FoodPlace,
} from "@/app/data/places";
import {
  submissionsApi,
  type CreatePlaceInput,
} from "@/app/lib/api/kabsubo-api";

type StepId = "basic" | "location" | "menu" | "best-sellers" | "photos";
type MenuDraft = FoodPlace["menuItems"][number];

const steps: Array<{
  id: StepId;
  title: string;
  description: string;
}> = [
  {
    id: "basic",
    title: "Basic info",
    description: "Name, category, hours, contact, and short description.",
  },
  {
    id: "location",
    title: "Pin location",
    description: "Place the pin within the CvSU Indang discovery area.",
  },
  {
    id: "menu",
    title: "Menu items",
    description: "Add dishes, prices, categories, and quick prep notes.",
  },
  {
    id: "best-sellers",
    title: "Best sellers",
    description: "Choose the dishes that should be highlighted after approval.",
  },
  {
    id: "photos",
    title: "Photos",
    description: "Add at least one public photo URL for the submitted place.",
  },
];

const defaultMenuItem: MenuDraft = {
  name: "",
  category: "",
  price: 0,
  prepNote: "",
  tags: [],
};

const fallbackPhoto =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=480&q=80";

const mapStyle: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
    },
  ],
};

export default function AddPlacePage() {
  const [stepIndex, setStepIndex] = useState(0);
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [hours, setHours] = useState("");
  const [contact, setContact] = useState("");
  const [submittedBy, setSubmittedBy] = useState("");
  const [tags, setTags] = useState("");
  const [coordinates, setCoordinates] =
    useState<[number, number]>(campusCenter);
  const [menuItems, setMenuItems] = useState<MenuDraft[]>([
    { ...defaultMenuItem },
  ]);
  const [bestSellerNames, setBestSellerNames] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "submitted">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  const currentStep = steps[stepIndex];
  const cleanedMenuItems = useMemo(
    () =>
      menuItems
        .filter((item) => item.name.trim() && item.category.trim())
        .map((item) => ({
          ...item,
          name: item.name.trim(),
          category: item.category.trim(),
          price: Number(item.price) || 0,
          prepNote: item.prepNote?.trim(),
          tags: splitTags(item.tags.join(", ")),
          isBestSeller: bestSellerNames.includes(item.name),
        })),
    [bestSellerNames, menuItems],
  );
  const canGoNext = isStepReady(currentStep.id, {
    name,
    type,
    description,
    address,
    hours,
    submittedBy,
    coordinates,
    menuItems: cleanedMenuItems,
    bestSellerNames,
    photoUrl,
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canGoNext) {
      return;
    }

    const bestSellerName = bestSellerNames[0] ?? cleanedMenuItems[0]?.name;
    const input: CreatePlaceInput = {
      name: name.trim(),
      type: type.trim(),
      description: description.trim(),
      coordinates,
      address: address.trim(),
      priceRange: buildPriceRange(cleanedMenuItems),
      walkTime: "Pending route check",
      hours: hours.trim(),
      tags: splitTags(tags),
      menuHighlights: bestSellerNames.length
        ? bestSellerNames
        : cleanedMenuItems.slice(0, 3).map((item) => item.name),
      menuItems: cleanedMenuItems,
      bestSeller: {
        name: bestSellerName,
        imageUrl: photoUrl.trim() || fallbackPhoto,
      },
      contact: contact.trim() || "Pending contact",
      submittedBy: submittedBy.trim(),
      recentReviews: [],
    };

    setError(null);
    setStatus("submitting");

    try {
      await submissionsApi.create(input);
      setStatus("submitted");
    } catch {
      setStatus("idle");
      setError("Submission failed. Please check the details and try again.");
    }
  }

  if (status === "submitted") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f3ec] px-5 text-[#171714]">
        <section className="max-w-xl rounded-lg border border-black/10 bg-white/86 p-6 shadow-sm">
          <span className="grid size-12 place-items-center rounded-lg bg-[#1f6f53] text-white">
            <Check size={24} aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-3xl font-black">Submitted for review</h1>
          <p className="mt-2 font-semibold leading-7 text-black/62">
            Thanks for adding {name}. It is now in the pending queue and will
            stay hidden from the public map until an admin approves it.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#171714] px-4 text-sm font-black text-white transition hover:bg-[#2a2822]"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to map
          </Link>
        </section>
      </main>
    );
  }

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
              Crowdsourced submission
            </p>
            <h1 className="mt-2 text-4xl font-black leading-tight">
              Add a place
            </h1>
            <p className="mt-2 max-w-2xl font-semibold leading-7 text-black/60">
              New places enter the pending queue first. Approved submissions
              become visible on the campus map and recommendation results.
            </p>
          </div>
          <div className="rounded-lg border border-black/10 bg-[#fffaf0] px-4 py-3">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-black/45">
              Step {stepIndex + 1} of {steps.length}
            </p>
            <p className="mt-1 text-2xl font-black">{currentStep.title}</p>
          </div>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="mx-auto grid max-w-6xl gap-5 px-5 py-6 lg:grid-cols-[280px_1fr]"
      >
        <aside className="space-y-2 lg:sticky lg:top-5 lg:self-start">
          {steps.map((step, index) => (
            <button
              key={step.id}
              type="button"
              onClick={() => setStepIndex(index)}
              className={`w-full rounded-lg border p-3 text-left transition ${
                index === stepIndex
                  ? "border-[#1f6f53]/40 bg-[#eef7ef]"
                  : "border-black/10 bg-white/78 hover:border-[#1f6f53]/30"
              }`}
            >
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#7b3320]">
                {String(index + 1).padStart(2, "0")}
              </p>
              <p className="mt-1 font-black">{step.title}</p>
              <p className="mt-1 text-sm font-semibold leading-5 text-black/55">
                {step.description}
              </p>
            </button>
          ))}
        </aside>

        <section className="rounded-lg border border-black/10 bg-white/86 p-5 shadow-sm">
          {currentStep.id === "basic" && (
            <BasicInfoStep
              address={address}
              contact={contact}
              description={description}
              hours={hours}
              name={name}
              submittedBy={submittedBy}
              tags={tags}
              type={type}
              onAddressChange={setAddress}
              onContactChange={setContact}
              onDescriptionChange={setDescription}
              onHoursChange={setHours}
              onNameChange={setName}
              onSubmittedByChange={setSubmittedBy}
              onTagsChange={setTags}
              onTypeChange={setType}
            />
          )}

          {currentStep.id === "location" && (
            <PinLocationStep
              coordinates={coordinates}
              onCoordinatesChange={setCoordinates}
            />
          )}

          {currentStep.id === "menu" && (
            <MenuItemsStep
              menuItems={menuItems}
              onMenuItemsChange={setMenuItems}
            />
          )}

          {currentStep.id === "best-sellers" && (
            <BestSellersStep
              bestSellerNames={bestSellerNames}
              menuItems={cleanedMenuItems}
              onBestSellerNamesChange={setBestSellerNames}
            />
          )}

          {currentStep.id === "photos" && (
            <PhotosStep photoUrl={photoUrl} onPhotoUrlChange={setPhotoUrl} />
          )}

          {error && (
            <p className="mt-5 rounded-md border border-[#7b3320]/20 bg-[#fff4e7] px-3 py-2 text-sm font-bold text-[#7b3320]">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3 border-t border-black/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
              disabled={stepIndex === 0}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-black/10 bg-white px-4 text-sm font-black text-[#171714] transition hover:border-[#1f6f53] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} aria-hidden="true" />
              Back
            </button>

            {stepIndex < steps.length - 1 ? (
              <button
                type="button"
                onClick={() =>
                  setStepIndex((index) => Math.min(steps.length - 1, index + 1))
                }
                disabled={!canGoNext}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#1f6f53] px-4 text-sm font-black text-white transition hover:bg-[#185840] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Continue
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canGoNext || status === "submitting"}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#1f6f53] px-4 text-sm font-black text-white transition hover:bg-[#185840] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Send size={16} aria-hidden="true" />
                {status === "submitting" ? "Submitting..." : "Submit place"}
              </button>
            )}
          </div>
        </section>
      </form>
    </main>
  );
}

function BasicInfoStep({
  address,
  contact,
  description,
  hours,
  name,
  submittedBy,
  tags,
  type,
  onAddressChange,
  onContactChange,
  onDescriptionChange,
  onHoursChange,
  onNameChange,
  onSubmittedByChange,
  onTagsChange,
  onTypeChange,
}: {
  address: string;
  contact: string;
  description: string;
  hours: string;
  name: string;
  submittedBy: string;
  tags: string;
  type: string;
  onAddressChange: (value: string) => void;
  onContactChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onHoursChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onSubmittedByChange: (value: string) => void;
  onTagsChange: (value: string) => void;
  onTypeChange: (value: string) => void;
}) {
  return (
    <div>
      <StepHeading
        icon={Store}
        title="Basic information"
        body="Tell admins what this place is and why students might look for it."
      />
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Place name" value={name} onChange={onNameChange} />
        <Field
          label="Type"
          value={type}
          placeholder="Carinderia, cafe, food stall..."
          onChange={onTypeChange}
        />
        <Field label="Address" value={address} onChange={onAddressChange} />
        <Field
          label="Hours"
          value={hours}
          placeholder="8:00 AM - 8:00 PM"
          onChange={onHoursChange}
        />
        <Field
          label="Contact"
          value={contact}
          placeholder="Phone, Facebook, or email"
          onChange={onContactChange}
        />
        <Field
          label="Submitted by"
          value={submittedBy}
          placeholder="Your name or section"
          onChange={onSubmittedByChange}
        />
        <Field
          label="Tags"
          value={tags}
          placeholder="coffee, budget, snack"
          onChange={onTagsChange}
        />
        <label className="md:col-span-2">
          <span className="text-sm font-black text-black/65">
            Short description
          </span>
          <textarea
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            className="mt-2 min-h-28 w-full rounded-md border border-black/10 bg-[#fffaf0] px-3 py-3 text-sm font-semibold outline-none transition focus:border-[#1f6f53]"
            placeholder="Fast rice meals near the gate, quiet cafe tables, late-night noodles..."
          />
        </label>
      </div>
    </div>
  );
}

function PinLocationStep({
  coordinates,
  onCoordinatesChange,
}: {
  coordinates: [number, number];
  onCoordinatesChange: (coordinates: [number, number]) => void;
}) {
  return (
    <div>
      <StepHeading
        icon={MapPin}
        title="Pin location on map"
        body="Click or drag the pin. The map stays constrained to the CvSU Indang discovery area."
      />
      <div className="mt-5 overflow-hidden rounded-lg border border-black/10">
        <SubmissionPinMap
          coordinates={coordinates}
          onCoordinatesChange={onCoordinatesChange}
        />
      </div>
      <p className="mt-3 rounded-md bg-[#fffaf0] px-3 py-2 text-sm font-bold text-black/62">
        Coordinates: {coordinates[1].toFixed(6)}, {coordinates[0].toFixed(6)}
      </p>
    </div>
  );
}

function SubmissionPinMap({
  coordinates,
  onCoordinatesChange,
}: {
  coordinates: [number, number];
  onCoordinatesChange: (coordinates: [number, number]) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const initialCoordinatesRef = useRef(coordinates);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle,
      center: initialCoordinatesRef.current,
      zoom: 16,
      minZoom: 14,
      maxZoom: 18,
      maxBounds: cvsuIndangBounds,
      attributionControl: { compact: true },
    });

    const markerElement = document.createElement("div");
    markerElement.className = "submission-pin-marker";

    markerRef.current = new maplibregl.Marker({
      element: markerElement,
      anchor: "bottom",
      draggable: true,
    })
      .setLngLat(initialCoordinatesRef.current)
      .addTo(mapRef.current);

    markerRef.current.on("dragend", () => {
      const lngLat = markerRef.current?.getLngLat();

      if (lngLat) {
        const nextCoordinates: [number, number] = [lngLat.lng, lngLat.lat];

        if (isWithinCvsuIndangBounds(nextCoordinates)) {
          onCoordinatesChange(nextCoordinates);
        }
      }
    });

    mapRef.current.on("click", (event) => {
      const nextCoordinates: [number, number] = [
        event.lngLat.lng,
        event.lngLat.lat,
      ];

      if (isWithinCvsuIndangBounds(nextCoordinates)) {
        onCoordinatesChange(nextCoordinates);
      }
    });

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [onCoordinatesChange]);

  useEffect(() => {
    markerRef.current?.setLngLat(coordinates);
    mapRef.current?.flyTo({ center: coordinates, duration: 500, zoom: 16 });
  }, [coordinates]);

  return <div ref={containerRef} className="h-[360px] w-full" />;
}

function MenuItemsStep({
  menuItems,
  onMenuItemsChange,
}: {
  menuItems: MenuDraft[];
  onMenuItemsChange: (items: MenuDraft[]) => void;
}) {
  function updateMenuItem(index: number, input: Partial<MenuDraft>) {
    onMenuItemsChange(
      menuItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...input } : item,
      ),
    );
  }

  return (
    <div>
      <StepHeading
        icon={Utensils}
        title="Menu items and prices"
        body="Add enough detail for search, recommendations, and future PHP CRUD screens."
      />
      <div className="mt-5 space-y-3">
        {menuItems.map((item, index) => (
          <div
            key={index}
            className="grid gap-3 rounded-lg border border-black/10 bg-[#fffaf0] p-3 md:grid-cols-[1fr_1fr_120px_auto]"
          >
            <Field
              label="Dish"
              value={item.name}
              onChange={(value) => updateMenuItem(index, { name: value })}
            />
            <Field
              label="Category"
              value={item.category}
              placeholder="Rice meals"
              onChange={(value) => updateMenuItem(index, { category: value })}
            />
            <Field
              label="Price"
              type="number"
              value={String(item.price || "")}
              onChange={(value) =>
                updateMenuItem(index, { price: Number(value) || 0 })
              }
            />
            <button
              type="button"
              onClick={() =>
                onMenuItemsChange(menuItems.filter((_, itemIndex) => itemIndex !== index))
              }
              disabled={menuItems.length === 1}
              className="mt-7 grid size-10 place-items-center rounded-md border border-black/10 bg-white text-[#7b3320] transition hover:border-[#7b3320] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={`Remove menu item ${index + 1}`}
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
            <Field
              label="Tags"
              value={item.tags.join(", ")}
              placeholder="burger, snack, budget"
              onChange={(value) =>
                updateMenuItem(index, { tags: splitTags(value) })
              }
            />
            <label className="md:col-span-3">
              <span className="text-sm font-black text-black/65">
                Prep note
              </span>
              <input
                value={item.prepNote ?? ""}
                onChange={(event) =>
                  updateMenuItem(index, { prepNote: event.target.value })
                }
                className="mt-2 h-11 w-full rounded-md border border-black/10 bg-white px-3 text-sm font-semibold outline-none transition focus:border-[#1f6f53]"
                placeholder="Made to order, quick batch, best for sharing..."
              />
            </label>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onMenuItemsChange([...menuItems, { ...defaultMenuItem }])}
        className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md border border-black/10 bg-white px-3 text-sm font-black text-[#171714] transition hover:border-[#1f6f53]"
      >
        <Plus size={16} aria-hidden="true" />
        Add menu item
      </button>
    </div>
  );
}

function BestSellersStep({
  bestSellerNames,
  menuItems,
  onBestSellerNamesChange,
}: {
  bestSellerNames: string[];
  menuItems: MenuDraft[];
  onBestSellerNamesChange: (names: string[]) => void;
}) {
  function toggleBestSeller(name: string) {
    onBestSellerNamesChange(
      bestSellerNames.includes(name)
        ? bestSellerNames.filter((item) => item !== name)
        : [...bestSellerNames, name],
    );
  }

  return (
    <div>
      <StepHeading
        icon={Check}
        title="Best sellers"
        body="These items become the public highlights after an admin approves the place."
      />
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {menuItems.map((item) => (
          <label
            key={item.name}
            className={`rounded-lg border p-4 transition ${
              bestSellerNames.includes(item.name)
                ? "border-[#1f6f53]/45 bg-[#eef7ef]"
                : "border-black/10 bg-[#fffaf0]"
            }`}
          >
            <input
              type="checkbox"
              checked={bestSellerNames.includes(item.name)}
              onChange={() => toggleBestSeller(item.name)}
              className="sr-only"
            />
            <span className="font-black">{item.name}</span>
            <span className="mt-1 block text-sm font-semibold text-black/58">
              PHP {item.price} - {item.category}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function PhotosStep({
  photoUrl,
  onPhotoUrlChange,
}: {
  photoUrl: string;
  onPhotoUrlChange: (value: string) => void;
}) {
  return (
    <div>
      <StepHeading
        icon={Camera}
        title="Photos"
        body="For the draft, use a public image URL. The PHP backend can later replace this with file upload storage."
      />
      <div className="mt-5 grid gap-4 md:grid-cols-[1fr_240px]">
        <Field
          label="Photo URL"
          value={photoUrl}
          placeholder="https://..."
          onChange={onPhotoUrlChange}
        />
        <div className="overflow-hidden rounded-lg border border-black/10 bg-[#fffaf0]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl.trim() || fallbackPhoto}
            alt="Submission preview"
            className="h-40 w-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}

function StepHeading({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Store;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-[#1f6f53] text-white">
        <Icon size={20} aria-hidden="true" />
      </span>
      <div>
        <h2 className="text-2xl font-black">{title}</h2>
        <p className="mt-1 font-semibold leading-6 text-black/58">{body}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  value: string;
}) {
  return (
    <label>
      <span className="text-sm font-black text-black/65">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-md border border-black/10 bg-[#fffaf0] px-3 text-sm font-semibold outline-none transition focus:border-[#1f6f53]"
        placeholder={placeholder}
      />
    </label>
  );
}

function isStepReady(
  stepId: StepId,
  values: {
    name: string;
    type: string;
    description: string;
    address: string;
    hours: string;
    submittedBy: string;
    coordinates: [number, number];
    menuItems: MenuDraft[];
    bestSellerNames: string[];
    photoUrl: string;
  },
) {
  if (stepId === "basic") {
    return Boolean(
      values.name.trim() &&
        values.type.trim() &&
        values.description.trim() &&
        values.address.trim() &&
        values.hours.trim() &&
        values.submittedBy.trim(),
    );
  }

  if (stepId === "location") {
    return isWithinCvsuIndangBounds(values.coordinates);
  }

  if (stepId === "menu") {
    return (
      values.menuItems.length > 0 &&
      values.menuItems.every(
        (item) => item.name && item.category && Number(item.price) > 0,
      )
    );
  }

  if (stepId === "best-sellers") {
    return values.bestSellerNames.length > 0;
  }

  return values.photoUrl.trim().startsWith("http");
}

function splitTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}

function buildPriceRange(menuItems: MenuDraft[]) {
  const prices = menuItems.map((item) => Number(item.price)).filter(Boolean);

  if (prices.length === 0) {
    return "PHP pending";
  }

  const min = Math.min(...prices);
  const max = Math.max(...prices);

  return min === max ? `PHP ${min}` : `PHP ${min}-${max}`;
}
