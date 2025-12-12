import { request } from "./client";

export const updateCardDimensions = async (token, nmId, dimensions) => {
  return apiClient.patch(
    `/wb/cards/${nmId}/dimensions`,
    dimensions,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );
};

/**
 * Umumiy karta yangilash (title, description, characteristics, dimensions, sizes)
 */
export const updateWbCards = async (token, cards) => {
  return apiClient.post(
    "/wb/cards/update",
    cards,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
};