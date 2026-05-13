export type FoodPlace = {
  id: string;
  name: string;
  type: string;
  description: string;
  coordinates: [number, number];
  address: string;
  priceRange: string;
  rating: number;
  walkTime: string;
  hours: string;
  tags: string[];
  menuHighlights: string[];
  status: "approved" | "sample";
};

export const campusCenter: [number, number] = [120.8807, 14.1959];

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
    walkTime: "4 min walk",
    hours: "7:00 AM - 8:00 PM",
    tags: ["rice meal", "grill", "sisig", "budget", "lunch"],
    menuHighlights: ["Pork sisig", "Chicken barbecue", "Silog meals"],
    status: "sample",
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
    walkTime: "7 min walk",
    hours: "9:00 AM - 9:00 PM",
    tags: ["noodles", "mami", "siomai", "snack", "soup"],
    menuHighlights: ["Beef mami", "Siomai rice", "Pancit canton"],
    status: "sample",
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
    walkTime: "9 min walk",
    hours: "10:00 AM - 10:00 PM",
    tags: ["coffee", "pastry", "dessert", "study", "wifi"],
    menuHighlights: ["Iced latte", "Cheesecake cup", "Tuna melt"],
    status: "sample",
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
    walkTime: "5 min walk",
    hours: "11:00 AM - 8:30 PM",
    tags: ["burger", "fries", "snack", "budget", "merienda"],
    menuHighlights: ["Cheese burger", "Loaded fries", "Milktea"],
    status: "sample",
  },
];

export function rankPlaces(query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return foodPlaces;
  }

  return [...foodPlaces].sort((a, b) => {
    const score = (place: FoodPlace) => {
      const searchable = [
        place.name,
        place.type,
        place.description,
        ...place.tags,
        ...place.menuHighlights,
      ]
        .join(" ")
        .toLowerCase();

      const matchScore = normalizedQuery
        .split(/\s+/)
        .filter((term) => searchable.includes(term)).length;

      return matchScore * 10 + place.rating;
    };

    return score(b) - score(a);
  });
}
