import {
  foodPlaces,
  getFoodPlaceById,
  rankPlaces,
  type FoodPlace,
} from "@/app/data/places";

export type ApiResult<T> = {
  data: T;
  source: "mock" | "php";
};

export type CreatePlaceInput = Omit<
  FoodPlace,
  "id" | "rating" | "reviews" | "status"
> & {
  submittedBy: string;
};

export type UpdatePlaceInput = Partial<CreatePlaceInput> & {
  status?: FoodPlace["status"];
};

export type CreateMenuItemInput = FoodPlace["menuItems"][number];
export type UpdateMenuItemInput = Partial<CreateMenuItemInput>;

export type CreateReviewInput = {
  placeId: string;
  author: string;
  rating: number;
  body: string;
};

export type UpdateReviewInput = Partial<Omit<CreateReviewInput, "placeId">>;

export type FavoriteRecord = {
  placeId: string;
  userId: string;
};

export type SubmissionStatus = "pending" | "approved" | "rejected";

export type SubmissionRecord = {
  id: string;
  placeId: string;
  status: SubmissionStatus;
  submittedBy: string;
  notes?: string;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_KABSUBO_API_BASE_URL ?? "";
const shouldUseMock =
  process.env.NEXT_PUBLIC_KABSUBO_USE_MOCK_API !== "false" || !apiBaseUrl;

let mockPlaces = structuredClone(foodPlaces);
let mockFavorites: FavoriteRecord[] = [];
let mockSubmissions: SubmissionRecord[] = mockPlaces.map((place) => ({
  id: `submission-${place.id}`,
  placeId: place.id,
  status: place.status === "approved" ? "approved" : "pending",
  submittedBy: place.submittedBy,
}));

export const phpEndpoints = {
  places: "/places.php",
  menuItems: "/menu_items.php",
  reviews: "/reviews.php",
  favorites: "/favorites.php",
  submissions: "/submissions.php",
  recommendations: "/recommendations.php",
};

export const placesApi = {
  async list(params: { status?: FoodPlace["status"]; query?: string } = {}) {
    if (shouldUseMock) {
      const places = params.query
        ? rankPlaces(params.query).filter((place) => place.matchScore > 0)
        : mockPlaces;

      return fromMock(
        places.filter((place) =>
          params.status ? place.status === params.status : true,
        ),
      );
    }

    return fromPhp<FoodPlace[]>(
      `${phpEndpoints.places}${toQueryString(params)}`,
    );
  },

  async listApproved() {
    return this.list({ status: "approved" });
  },

  async get(placeId: string) {
    if (shouldUseMock) {
      const place =
        mockPlaces.find((item) => item.id === placeId) ??
        getFoodPlaceById(placeId);

      if (!place) {
        throw new Error(`Place not found: ${placeId}`);
      }

      return fromMock(place);
    }

    return fromPhp<FoodPlace>(
      `${phpEndpoints.places}${toQueryString({ id: placeId })}`,
    );
  },

  async create(input: CreatePlaceInput) {
    if (shouldUseMock) {
      const place: FoodPlace = {
        ...input,
        id: slugify(input.name),
        rating: 0,
        reviews: 0,
        status: "pending",
      };

      mockPlaces = [...mockPlaces, place];
      mockSubmissions = [
        ...mockSubmissions,
        {
          id: `submission-${place.id}`,
          placeId: place.id,
          status: "pending",
          submittedBy: input.submittedBy,
        },
      ];

      return fromMock(place);
    }

    return fromPhp<FoodPlace>(phpEndpoints.places, {
      method: "POST",
      body: input,
    });
  },

  async update(placeId: string, input: UpdatePlaceInput) {
    if (shouldUseMock) {
      const place = requireMockPlace(placeId);
      const updatedPlace = { ...place, ...input };

      mockPlaces = mockPlaces.map((item) =>
        item.id === placeId ? updatedPlace : item,
      );

      return fromMock(updatedPlace);
    }

    return fromPhp<FoodPlace>(
      `${phpEndpoints.places}${toQueryString({ id: placeId })}`,
      {
        method: "PUT",
        body: input,
      },
    );
  },

  async remove(placeId: string) {
    if (shouldUseMock) {
      requireMockPlace(placeId);
      mockPlaces = mockPlaces.filter((place) => place.id !== placeId);
      mockFavorites = mockFavorites.filter(
        (favorite) => favorite.placeId !== placeId,
      );
      mockSubmissions = mockSubmissions.filter(
        (submission) => submission.placeId !== placeId,
      );

      return fromMock({ ok: true });
    }

    return fromPhp<{ ok: true }>(
      `${phpEndpoints.places}${toQueryString({ id: placeId })}`,
      { method: "DELETE" },
    );
  },
};

export const menuItemsApi = {
  async list(placeId: string) {
    if (shouldUseMock) {
      return fromMock(requireMockPlace(placeId).menuItems);
    }

    return fromPhp<FoodPlace["menuItems"]>(
      `${phpEndpoints.menuItems}${toQueryString({ place_id: placeId })}`,
    );
  },

  async create(placeId: string, input: CreateMenuItemInput) {
    if (shouldUseMock) {
      const place = requireMockPlace(placeId);
      const updatedPlace = {
        ...place,
        menuItems: [...place.menuItems, input],
      };

      mockPlaces = replaceMockPlace(updatedPlace);
      return fromMock(input);
    }

    return fromPhp<CreateMenuItemInput>(phpEndpoints.menuItems, {
      method: "POST",
      body: { ...input, place_id: placeId },
    });
  },

  async update(placeId: string, itemName: string, input: UpdateMenuItemInput) {
    if (shouldUseMock) {
      const place = requireMockPlace(placeId);
      const updatedItem = {
        ...requireMockMenuItem(place, itemName),
        ...input,
      };
      const updatedPlace = {
        ...place,
        menuItems: place.menuItems.map((item) =>
          item.name === itemName ? updatedItem : item,
        ),
      };

      mockPlaces = replaceMockPlace(updatedPlace);
      return fromMock(updatedItem);
    }

    return fromPhp<CreateMenuItemInput>(
      `${phpEndpoints.menuItems}${toQueryString({
        place_id: placeId,
        name: itemName,
      })}`,
      { method: "PUT", body: input },
    );
  },

  async remove(placeId: string, itemName: string) {
    if (shouldUseMock) {
      const place = requireMockPlace(placeId);
      requireMockMenuItem(place, itemName);
      mockPlaces = replaceMockPlace({
        ...place,
        menuItems: place.menuItems.filter((item) => item.name !== itemName),
      });

      return fromMock({ ok: true });
    }

    return fromPhp<{ ok: true }>(
      `${phpEndpoints.menuItems}${toQueryString({
        place_id: placeId,
        name: itemName,
      })}`,
      { method: "DELETE" },
    );
  },
};

export const reviewsApi = {
  async list(placeId: string) {
    if (shouldUseMock) {
      return fromMock(requireMockPlace(placeId).recentReviews);
    }

    return fromPhp<FoodPlace["recentReviews"]>(
      `${phpEndpoints.reviews}${toQueryString({ place_id: placeId })}`,
    );
  },

  async create(input: CreateReviewInput) {
    if (shouldUseMock) {
      const place = requireMockPlace(input.placeId);
      const review = {
        author: input.author,
        rating: input.rating,
        body: input.body,
        date: "Draft",
      };
      const nextReviewCount = place.reviews + 1;
      const updatedPlace = {
        ...place,
        rating:
          (place.rating * place.reviews + input.rating) / nextReviewCount,
        reviews: nextReviewCount,
        recentReviews: [review, ...place.recentReviews],
      };

      mockPlaces = replaceMockPlace(updatedPlace);
      return fromMock(review);
    }

    return fromPhp<FoodPlace["recentReviews"][number]>(phpEndpoints.reviews, {
      method: "POST",
      body: input,
    });
  },

  async update(placeId: string, author: string, input: UpdateReviewInput) {
    if (shouldUseMock) {
      const place = requireMockPlace(placeId);
      const currentReview = place.recentReviews.find(
        (review) => review.author === author,
      );

      if (!currentReview) {
        throw new Error(`Review not found for ${author}`);
      }

      const updatedReview = { ...currentReview, ...input };
      mockPlaces = replaceMockPlace({
        ...place,
        recentReviews: place.recentReviews.map((review) =>
          review.author === author ? updatedReview : review,
        ),
      });

      return fromMock(updatedReview);
    }

    return fromPhp<FoodPlace["recentReviews"][number]>(
      `${phpEndpoints.reviews}${toQueryString({ place_id: placeId, author })}`,
      { method: "PUT", body: input },
    );
  },

  async remove(placeId: string, author: string) {
    if (shouldUseMock) {
      const place = requireMockPlace(placeId);
      mockPlaces = replaceMockPlace({
        ...place,
        recentReviews: place.recentReviews.filter(
          (review) => review.author !== author,
        ),
      });

      return fromMock({ ok: true });
    }

    return fromPhp<{ ok: true }>(
      `${phpEndpoints.reviews}${toQueryString({ place_id: placeId, author })}`,
      { method: "DELETE" },
    );
  },
};

export const favoritesApi = {
  async list(userId: string) {
    if (shouldUseMock) {
      return fromMock(
        mockFavorites
          .filter((favorite) => favorite.userId === userId)
          .map((favorite) => requireMockPlace(favorite.placeId)),
      );
    }

    return fromPhp<FoodPlace[]>(
      `${phpEndpoints.favorites}${toQueryString({ user_id: userId })}`,
    );
  },

  async add(input: FavoriteRecord) {
    if (shouldUseMock) {
      requireMockPlace(input.placeId);
      mockFavorites = [
        ...mockFavorites.filter(
          (favorite) =>
            favorite.placeId !== input.placeId ||
            favorite.userId !== input.userId,
        ),
        input,
      ];

      return fromMock(input);
    }

    return fromPhp<FavoriteRecord>(phpEndpoints.favorites, {
      method: "POST",
      body: input,
    });
  },

  async remove(input: FavoriteRecord) {
    if (shouldUseMock) {
      mockFavorites = mockFavorites.filter(
        (favorite) =>
          favorite.placeId !== input.placeId ||
          favorite.userId !== input.userId,
      );

      return fromMock({ ok: true });
    }

    return fromPhp<{ ok: true }>(
      `${phpEndpoints.favorites}${toQueryString({
        place_id: input.placeId,
        user_id: input.userId,
      })}`,
      { method: "DELETE" },
    );
  },
};

export const submissionsApi = {
  async list(params: { status?: SubmissionStatus } = {}) {
    if (shouldUseMock) {
      return fromMock(
        mockSubmissions.filter((submission) =>
          params.status ? submission.status === params.status : true,
        ),
      );
    }

    return fromPhp<SubmissionRecord[]>(
      `${phpEndpoints.submissions}${toQueryString(params)}`,
    );
  },

  async create(input: CreatePlaceInput) {
    if (!shouldUseMock) {
      return fromPhp<SubmissionRecord>(phpEndpoints.submissions, {
        method: "POST",
        body: input,
      });
    }

    const createdPlace = await placesApi.create(input);

    return fromMock({
      id: `submission-${createdPlace.data.id}`,
      placeId: createdPlace.data.id,
      status: "pending",
      submittedBy: input.submittedBy,
    });
  },

  async updateStatus(
    submissionId: string,
    status: SubmissionStatus,
    notes?: string,
  ) {
    if (shouldUseMock) {
      const submission = mockSubmissions.find((item) => item.id === submissionId);

      if (!submission) {
        throw new Error(`Submission not found: ${submissionId}`);
      }

      const updatedSubmission = { ...submission, status, notes };
      mockSubmissions = mockSubmissions.map((item) =>
        item.id === submissionId ? updatedSubmission : item,
      );
      mockPlaces = mockPlaces.map((place) =>
        place.id === submission.placeId
          ? { ...place, status }
          : place,
      );

      return fromMock(updatedSubmission);
    }

    return fromPhp<SubmissionRecord>(
      `${phpEndpoints.submissions}${toQueryString({ id: submissionId })}`,
      {
        method: "PUT",
        body: { status, notes },
      },
    );
  },

  async remove(submissionId: string) {
    if (shouldUseMock) {
      mockSubmissions = mockSubmissions.filter(
        (submission) => submission.id !== submissionId,
      );

      return fromMock({ ok: true });
    }

    return fromPhp<{ ok: true }>(
      `${phpEndpoints.submissions}${toQueryString({ id: submissionId })}`,
      { method: "DELETE" },
    );
  },
};

export const recommendationsApi = {
  async search(query: string) {
    if (shouldUseMock) {
      return fromMock(
        rankPlaces(query).filter(
          (place) => place.status === "approved" && place.matchScore > 0,
        ),
      );
    }

    return fromPhp<ReturnType<typeof rankPlaces>>(
      `${phpEndpoints.recommendations}${toQueryString({ q: query })}`,
    );
  },
};

function fromMock<T>(data: T): ApiResult<T> {
  return { data, source: "mock" };
}

async function fromPhp<T>(
  endpoint: string,
  options: { method?: string; body?: unknown } = {},
): Promise<ApiResult<T>> {
  const response = await fetch(`${apiBaseUrl}${endpoint}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`PHP API request failed: ${response.status}`);
  }

  const payload = (await response.json()) as { data?: T } | T;

  return {
    data: "data" in Object(payload) ? (payload as { data: T }).data : (payload as T),
    source: "php",
  };
}

function toQueryString(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      query.set(key, String(value));
    }
  });

  const value = query.toString();
  return value ? `?${value}` : "";
}

function requireMockPlace(placeId: string) {
  const place = mockPlaces.find((item) => item.id === placeId);

  if (!place) {
    throw new Error(`Place not found: ${placeId}`);
  }

  return place;
}

function requireMockMenuItem(place: FoodPlace, itemName: string) {
  const menuItem = place.menuItems.find((item) => item.name === itemName);

  if (!menuItem) {
    throw new Error(`Menu item not found: ${itemName}`);
  }

  return menuItem;
}

function replaceMockPlace(place: FoodPlace) {
  return mockPlaces.map((item) => (item.id === place.id ? place : item));
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
