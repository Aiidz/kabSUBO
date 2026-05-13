export type FoodPlace = {
  id: string;
  name: string;
  type: string;
  description: string;
  coordinates: [number, number];
  address: string;
  priceRange: string;
  rating: number;
  reviews: number;
  walkTime: string;
  hours: string;
  tags: string[];
  menuHighlights: string[];
  menuItems: Array<{
    name: string;
    tags: string[];
  }>;
  bestSeller: {
    name: string;
    imageUrl: string;
  };
  status: "approved" | "sample";
};

export const campusCenter: [number, number] = [120.8807, 14.1959];
export const cvsuIndangBounds: [[number, number], [number, number]] = [
  [120.8675, 14.1845],
  [120.8945, 14.2075],
];

export function isWithinCvsuIndangBounds([lng, lat]: [number, number]) {
  const [[west, south], [east, north]] = cvsuIndangBounds;

  return lng >= west && lng <= east && lat >= south && lat <= north;
}

export const foodPlaces: FoodPlace[] = [
  {
    id: "main-gate-grill",
    name: "Main Gate Grill",
    type: "Carinderia",
    description: "Fast rice meals and grilled favorites near the campus gate.",
    coordinates: [120.8798, 14.1972],
    address: "Near CvSU Main Gate, Indang",
    priceRange: "PHP 55-120",
    rating: 4.6,
    reviews: 128,
    walkTime: "4 min walk",
    hours: "7:00 AM - 8:00 PM",
    tags: ["rice meal", "grill", "sisig", "budget", "lunch"],
    menuHighlights: ["Pork sisig", "Chicken barbecue", "Silog meals"],
    menuItems: [
      { name: "Pork sisig", tags: ["sisig", "rice meal", "lunch"] },
      { name: "Chicken barbecue", tags: ["grill", "budget", "rice meal"] },
      { name: "Silog meals", tags: ["breakfast", "budget", "egg"] },
    ],
    bestSeller: {
      name: "Pork sisig",
      imageUrl:
        "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=240&q=80",
    },
    status: "approved",
  },
  {
    id: "indang-noodle-house",
    name: "Indang Noodle House",
    type: "Diner",
    description: "Warm noodle bowls, siomai, and quick snacks for late classes.",
    coordinates: [120.8821, 14.1949],
    address: "Market road, Indang",
    priceRange: "PHP 45-100",
    rating: 4.3,
    reviews: 84,
    walkTime: "7 min walk",
    hours: "9:00 AM - 9:00 PM",
    tags: ["noodles", "mami", "siomai", "snack", "soup"],
    menuHighlights: ["Beef mami", "Siomai rice", "Pancit canton"],
    menuItems: [
      { name: "Beef mami", tags: ["noodles", "mami", "soup"] },
      { name: "Siomai rice", tags: ["siomai", "rice meal", "budget"] },
      { name: "Pancit canton", tags: ["noodles", "snack", "merienda"] },
    ],
    bestSeller: {
      name: "Beef mami",
      imageUrl:
        "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=240&q=80",
    },
    status: "approved",
  },
  {
    id: "green-cup-cafe",
    name: "Green Cup Cafe",
    type: "Cafe",
    description: "Coffee, pastries, and quiet tables for group study sessions.",
    coordinates: [120.8789, 14.1947],
    address: "Poblacion, Indang",
    priceRange: "PHP 80-180",
    rating: 4.7,
    reviews: 96,
    walkTime: "9 min walk",
    hours: "10:00 AM - 10:00 PM",
    tags: ["coffee", "pastry", "dessert", "study", "wifi"],
    menuHighlights: ["Iced latte", "Cheesecake cup", "Tuna melt"],
    menuItems: [
      { name: "Iced latte", tags: ["coffee", "iced", "study"] },
      { name: "Cheesecake cup", tags: ["dessert", "pastry", "sweet"] },
      { name: "Tuna melt", tags: ["sandwich", "snack", "study"] },
    ],
    bestSeller: {
      name: "Iced latte",
      imageUrl:
        "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=240&q=80",
    },
    status: "approved",
  },
  {
    id: "campus-burger-stop",
    name: "Campus Burger Stop",
    type: "Food stall",
    description: "Affordable burgers, fries, and drinks for quick cravings.",
    coordinates: [120.8818, 14.1978],
    address: "Beside campus tricycle terminal",
    priceRange: "PHP 35-95",
    rating: 4.2,
    reviews: 73,
    walkTime: "5 min walk",
    hours: "11:00 AM - 8:30 PM",
    tags: ["burger", "fries", "snack", "budget", "merienda"],
    menuHighlights: ["Cheese burger", "Loaded fries", "Milktea"],
    menuItems: [
      { name: "Cheese burger", tags: ["burger", "snack", "budget"] },
      { name: "Loaded fries", tags: ["fries", "snack", "sharing"] },
      { name: "Milktea", tags: ["drink", "sweet", "merienda"] },
    ],
    bestSeller: {
      name: "Cheese burger",
      imageUrl:
        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=240&q=80",
    },
    status: "approved",
  },
];

export type RankedPlace = FoodPlace & {
  matchScore: number;
  matchedMenuItems: string[];
};

export function getQueryTerms(query: string) {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

export function getPlaceMatch(place: FoodPlace, query: string) {
  const terms = getQueryTerms(query);

  if (terms.length === 0) {
    return {
      matchScore: 1,
      matchedMenuItems: place.menuItems.slice(0, 2).map((item) => item.name),
    };
  }

  const searchable = [
    place.name,
    place.type,
    place.description,
    ...place.tags,
    ...place.menuHighlights,
    ...place.menuItems.flatMap((item) => [item.name, ...item.tags]),
  ]
    .join(" ")
    .toLowerCase();

  const matchScore = terms.filter((term) => searchable.includes(term)).length;
  const matchedMenuItems = place.menuItems
    .filter((item) => {
      const itemSearchable = [item.name, ...item.tags].join(" ").toLowerCase();
      return terms.some((term) => itemSearchable.includes(term));
    })
    .map((item) => item.name);

  return {
    matchScore,
    matchedMenuItems:
      matchedMenuItems.length > 0
        ? matchedMenuItems
        : place.menuItems.slice(0, 2).map((item) => item.name),
  };
}

export function rankPlaces(query: string): RankedPlace[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return foodPlaces.map((place) => ({
      ...place,
      ...getPlaceMatch(place, query),
    }));
  }

  return foodPlaces
    .map((place) => ({
      ...place,
      ...getPlaceMatch(place, query),
    }))
    .sort(
      (a, b) =>
        b.matchScore * 10 +
        b.rating -
        (a.matchScore * 10 + a.rating),
    );
}
