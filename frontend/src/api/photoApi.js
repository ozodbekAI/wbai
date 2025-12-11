// src/api/photoApi.js
import { api } from "./client"; // sizda bor bo'lgan client

export const photoApi = {
  async deleteFile(token, fileName) {
    const res = await fetch(`/api/photo/files/${encodeURIComponent(fileName)}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok && res.status !== 204) {
      const text = await res.text();
      throw new Error(text || "Delete failed");
    }
  },
};
