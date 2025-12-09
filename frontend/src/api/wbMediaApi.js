// src/api/wbMediaApi.js
import { request } from "./client";

export function syncWbMedia(token, nmID, finalPhotos, files) {
  const form = new FormData();
  form.append("nmID", nmID);
  form.append("finalPhotos", JSON.stringify(finalPhotos || []));

  (files || []).forEach((file) => {
    form.append("files", file);
  });

  return request("/api/wb/media/sync", {
    method: "POST",
    token,
    body: form,
  });
}
