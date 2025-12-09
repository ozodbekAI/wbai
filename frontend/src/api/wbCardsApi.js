import { request } from "./client";

export function updateWbCards(token, cards) {
  return request("/api/wb/cards/update", {
    method: "POST",
    token,
    body: cards,
  });
}
