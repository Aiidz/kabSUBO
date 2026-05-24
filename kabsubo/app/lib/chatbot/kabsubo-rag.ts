import type { FoodPlace } from "@/app/data/places";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

type ChatPlace = FoodPlace & {
  distanceKm: number;
  openNow: boolean;
};

type ChatbotReplyInput = {
  message: string;
  originLabel: string;
  places: ChatPlace[];
  selectedPlaceIds: string[];
};

const currencyFormatter = new Intl.NumberFormat("en-PH", {
  maximumFractionDigits: 0,
  style: "currency",
  currency: "PHP",
});

export function createChatMessage(role: ChatMessage["role"], text: string) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
  };
}

export function createKabsuboReply({
  message,
  originLabel,
  places,
  selectedPlaceIds,
}: ChatbotReplyInput) {
  const normalizedMessage = message.trim().toLowerCase();
  const selectedPlaces = selectedPlaceIds
    .map((placeId) => places.find((place) => place.id === placeId))
    .filter((place): place is ChatPlace => Boolean(place));
  const retrievedPlaces = retrievePlaces(normalizedMessage, places);

  if (selectedPlaces.length > 0 && isCompareIntent(normalizedMessage)) {
    return comparePlaces(selectedPlaces, places, originLabel);
  }

  if (isNearestIntent(normalizedMessage)) {
    return listNearestPlaces(places, originLabel);
  }

  if (isPopularIntent(normalizedMessage)) {
    return listMostLikedPlaces(places);
  }

  if (isBudgetIntent(normalizedMessage)) {
    return listBudgetPlaces(places);
  }

  if (isOpenIntent(normalizedMessage)) {
    return listOpenPlaces(places);
  }

  if (retrievedPlaces.length > 0) {
    return recommendPlaces(retrievedPlaces, originLabel);
  }

  return [
    "I can help compare places, find nearby food, suggest budget meals, or show the most liked spots.",
    "Try asking: \"nearest places\", \"most liked\", \"cheap lunch\", or \"compare my picks\".",
  ].join("\n");
}

export function createComparisonPrompt(placeId: string, places: ChatPlace[]) {
  const selectedPlace = places.find((place) => place.id === placeId);

  if (!selectedPlace) {
    return "Compare this place with other kabSUBO options.";
  }

  return `Compare ${selectedPlace.name} with other nearby options.`;
}

function retrievePlaces(message: string, places: ChatPlace[]) {
  const terms = message
    .split(/[^a-z0-9]+/i)
    .map((term) => term.trim())
    .filter((term) => term.length > 1);

  if (terms.length === 0) {
    return places
      .slice()
      .sort((a, b) => b.rating + b.reviews / 1000 - (a.rating + a.reviews / 1000))
      .slice(0, 3);
  }

  return places
    .map((place) => {
      const searchable = [
        place.name,
        place.type,
        place.description,
        place.priceRange,
        place.hours,
        ...place.tags,
        ...place.menuHighlights,
        ...place.menuItems.flatMap((item) => [
          item.name,
          item.category,
          item.prepNote ?? "",
          ...item.tags,
        ]),
      ]
        .join(" ")
        .toLowerCase();
      const score = terms.reduce(
        (total, term) => total + (searchable.includes(term) ? 1 : 0),
        0,
      );

      return { place, score };
    })
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score * 10 +
        b.place.rating -
        b.place.distanceKm / 2 -
        (a.score * 10 + a.place.rating - a.place.distanceKm / 2),
    )
    .map(({ place }) => place)
    .slice(0, 3);
}

function comparePlaces(
  selectedPlaces: ChatPlace[],
  allPlaces: ChatPlace[],
  originLabel: string,
) {
  const candidates =
    selectedPlaces.length >= 2
      ? selectedPlaces
      : [
          ...selectedPlaces,
          ...allPlaces
            .filter((place) => !selectedPlaces.some((item) => item.id === place.id))
            .sort((a, b) => scorePlace(b) - scorePlace(a))
            .slice(0, 2),
        ];
  const winner = candidates.slice().sort((a, b) => scorePlace(b) - scorePlace(a))[0];

  return [
    `Here is a quick comparison from ${originLabel}:`,
    ...candidates.map(
      (place) =>
        `${place.name}: ${place.rating.toFixed(1)} stars, ${place.reviews} reviews, ${formatDistance(place.distanceKm)}, ${place.priceRange}. Best picks: ${place.menuHighlights.slice(0, 2).join(", ")}.`,
    ),
    `My pick: ${winner.name}, because it has the strongest mix of rating, reviews, distance, and student-friendly menu options.`,
  ].join("\n");
}

function listNearestPlaces(places: ChatPlace[], originLabel: string) {
  const nearest = places.slice().sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 3);

  return [
    `Nearest options from ${originLabel}:`,
    ...nearest.map(
      (place) =>
        `${place.name}: ${formatDistance(place.distanceKm)} away, ${place.priceRange}, best seller is ${place.bestSeller.name}.`,
    ),
  ].join("\n");
}

function listMostLikedPlaces(places: ChatPlace[]) {
  const popular = places
    .slice()
    .sort((a, b) => b.rating * 100 + b.reviews - (a.rating * 100 + a.reviews))
    .slice(0, 3);

  return [
    "Most liked places in kabSUBO right now:",
    ...popular.map(
      (place) =>
        `${place.name}: ${place.rating.toFixed(1)} stars from ${place.reviews} reviews. Try ${place.menuHighlights.slice(0, 2).join(" or ")}.`,
    ),
  ].join("\n");
}

function listBudgetPlaces(places: ChatPlace[]) {
  const budgetPlaces = places
    .slice()
    .sort((a, b) => getMinimumMenuPrice(a) - getMinimumMenuPrice(b))
    .slice(0, 3);

  return [
    "Best budget-friendly picks:",
    ...budgetPlaces.map(
      (place) =>
        `${place.name}: meals start around ${currencyFormatter.format(getMinimumMenuPrice(place))}. Good picks: ${place.menuHighlights.slice(0, 2).join(", ")}.`,
    ),
  ].join("\n");
}

function listOpenPlaces(places: ChatPlace[]) {
  const openPlaces = places.filter((place) => place.openNow);

  if (openPlaces.length === 0) {
    return "No listed spots look open right now based on the mock hours. You can still check details for each place before going.";
  }

  return [
    "Places that look open now:",
    ...openPlaces.map(
      (place) =>
        `${place.name}: ${place.hours}, ${formatDistance(place.distanceKm)} away, ${place.priceRange}.`,
    ),
  ].join("\n");
}

function recommendPlaces(places: ChatPlace[], originLabel: string) {
  return [
    `Based on your question, I found these from ${originLabel}:`,
    ...places.map(
      (place) =>
        `${place.name}: ${place.description} ${formatDistance(place.distanceKm)} away, ${place.priceRange}. Try ${place.menuHighlights.slice(0, 2).join(" or ")}.`,
    ),
  ].join("\n");
}

function isCompareIntent(message: string) {
  return /compare|versus|vs|better|which|decide|choose|pili|sulit/.test(message);
}

function isNearestIntent(message: string) {
  return /near|nearest|nearby|closest|malapit|distance/.test(message);
}

function isPopularIntent(message: string) {
  return /popular|liked|visited|rating|reviews|best|top|pinaka/.test(message);
}

function isBudgetIntent(message: string) {
  return /cheap|budget|affordable|mura|tipid|student/.test(message);
}

function isOpenIntent(message: string) {
  return /open|hours|now|available/.test(message);
}

function scorePlace(place: ChatPlace) {
  return place.rating * 2 + place.reviews / 100 - place.distanceKm;
}

function getMinimumMenuPrice(place: ChatPlace) {
  return Math.min(...place.menuItems.map((item) => item.price));
}

function formatDistance(kilometers: number) {
  if (kilometers < 1) {
    return `${Math.max(50, Math.round((kilometers * 1000) / 50) * 50)}m`;
  }

  return `${kilometers.toFixed(1)}km`;
}
