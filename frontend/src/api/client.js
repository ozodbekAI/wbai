// frontend/src/api/client.js

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Universal request helper
 */
export async function request(
  path,
  { method = "GET", token, body, params } = {}
) {
  const urlObj = new URL(`${API_URL}${path}`);

  if (params && typeof params === "object") {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        urlObj.searchParams.append(key, String(value));
      }
    });
  }

  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const options = {
    method,
    headers,
    credentials: "same-origin",
  };

  if (body instanceof FormData) {
    options.body = body;
  } else if (body) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  const res = await fetch(urlObj.toString(), options);
  const text = await res.text();

  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new Error(
      data?.detail ||
      data?.message ||
      data?.error ||
      `HTTP ${res.status}`
    );
  }

  return data;
}

/* ========================================================================
 * AUTH
 * ====================================================================== */
export const api = {
  login: (username, password) =>
    request("/api/auth/auth/login/", {
      method: "POST",
      body: { username, password },
    }),

  register: (payload) =>
    request("/api/auth/auth/register/", {
      method: "POST",
      body: payload,
    }),

  /* ====================================================================
   * CORE PROCESS
   * ================================================================== */
  getCurrentCard: (token, { article }) =>
    request("/api/process/get_current_card/", {
      method: "POST",
      token,
      body: { article },
    }),

  process: ({ article }, token) =>
    fetch(`${API_URL}/api/process/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ article }),
    }),

  /* ====================================================================
   * HISTORY
   * ================================================================== */
  history: {
    list: (token, { limit = 50, offset = 0, status } = {}) =>
      request("/api/history/", {
        method: "GET",
        token,
        params: { limit, offset, status },
      }),

    stats: (token, { days = 30 } = {}) =>
      request("/api/history/stats/", {
        method: "GET",
        token,
        params: { days },
      }),
  },

  /* ====================================================================
   * KEYWORDS
   * ================================================================== */
  keywords: {
    byName: (token, name) =>
      request("/api/admin/keywords/", {
        method: "GET",
        token,
        params: { name },
      }),
  },

  /* ====================================================================
   * PROMPTS
   * ================================================================== */
  prompts: {
    list: (token) =>
      request("/api/admin/prompts/", { method: "GET", token }),

    get: (token, promptType) =>
      request(`/api/admin/prompts/${encodeURIComponent(promptType)}`, {
        method: "GET",
        token,
      }),

    preview: (token, promptType) =>
      request(`/api/admin/prompts/${encodeURIComponent(promptType)}/preview`, {
        method: "GET",
        token,
      }),

    create: (token, payload) =>
      request("/api/admin/prompts/", {
        method: "POST",
        token,
        body: payload,
      }),

    update: (token, promptType, payload) =>
      request(`/api/admin/prompts/${encodeURIComponent(promptType)}`, {
        method: "PUT",
        token,
        body: payload,
      }),

    deactivate: (token, promptType) =>
      request(`/api/admin/prompts/${encodeURIComponent(promptType)}`, {
        method: "DELETE",
        token,
      }),

    activate: (token, promptType) =>
      request(
        `/api/admin/prompts/${encodeURIComponent(promptType)}/activate`,
        { method: "POST", token }
      ),

    types: (token) =>
      request("/api/admin/prompts/types/available/", {
        method: "GET",
        token,
      }),

    versions: (token, promptType) =>
      request(`/api/admin/prompts/${encodeURIComponent(promptType)}/versions`, {
        method: "GET",
        token,
      }),
  },

  /* ====================================================================
   * VIDEO
   * ================================================================== */
  video: {
    getScenarios: (token) =>
      request("/api/video/scenarios/", {
        method: "GET",
        token,
      }),
  },

  admin: {
    videoScenarios: {
      list: (token, { only_active = false } = {}) =>
        request("/api/admin/video-scenarios/", {
          method: "GET",
          token,
          params: { only_active },
        }),

      get: (token, id) =>
        request(`/api/admin/video-scenarios/${id}`, {
          method: "GET",
          token,
        }),

      create: (token, payload) =>
        request("/api/admin/video-scenarios/", {
          method: "POST",
          token,
          body: payload,
        }),

      update: (token, id, payload) =>
        request(`/api/admin/video-scenarios/${id}`, {
          method: "PUT",
          token,
          body: payload,
        }),

      delete: (token, id) =>
        request(`/api/admin/video-scenarios/${id}`, {
          method: "DELETE",
          token,
        }),
    },
  },

  /* ====================================================================
   * PHOTO
   * ================================================================== */
  photo: {
    generated: {
      list: (token, { limit = 24, offset = 0 } = {}) =>
        request("/api/photo/generated/", {
          method: "GET",
          token,
          params: { limit, offset },
        }),

      delete: (token, file_name) =>
        request("/api/photo/generated/", {
          method: "DELETE",
          token,
          params: { file_name },
        }),
    },

    scenes: {
      listCategories: (token) =>
        request("/api/photo/scenes/categories/", {
          method: "GET",
          token,
        }),

      listSubcategories: (token, categoryId) =>
        request(`/api/photo/scenes/${categoryId}/subcategories`, {
          method: "GET",
          token,
        }),

      listItems: (token, subcategoryId) =>
        request(`/api/photo/scenes/subcategories/${subcategoryId}/items`, {
          method: "GET",
          token,
        }),
    },

    poses: {
      listGroups: (token) =>
        request("/api/photo/poses/groups/", {
          method: "GET",
          token,
        }),
    },

    models: {
      listCategories: (token) =>
        request("/api/photo/models/categories/", {
          method: "GET",
          token,
        }),
    },

    generateScene: (token, payload) =>
      request("/api/photo/generate/scene/", {
        method: "POST",
        token,
        body: payload,
      }),

    generatePose: (token, payload) =>
      request("/api/photo/generate/pose/", {
        method: "POST",
        token,
        body: payload,
      }),

    generateCustom: (token, payload) =>
      request("/api/photo/generate/custom/", {
        method: "POST",
        token,
        body: payload,
      }),

    enhancePhoto: (token, payload) =>
      request("/api/photo/generate/enhance/", {
        method: "POST",
        token,
        body: payload,
      }),

    generateVideo: (token, payload) =>
      request("/api/photo/generate/video/", {
        method: "POST",
        token,
        body: payload,
      }),

    uploadPhoto: (token, file) => {
      const form = new FormData();
      form.append("file", file);
      return request("/api/photo/upload/", {
        method: "POST",
        token,
        body: form,
      });
    },
  },
};
