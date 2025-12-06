// ============================================
// FILE 4: src/api/client.js
// COMPLETE VERSION - Replace entire file
// ============================================

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const {
    method = "GET",
    token,
    params,
    body,
    stream = false,
  } = options;

  let url = API_URL + path;

  if (params) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.append(k, String(v));
    });
    const qsStr = qs.toString();
    if (qsStr) url += "?" + qsStr;
  }

  const headers = {};
  if (!stream) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const fetchOptions = {
    method,
    headers,
  };

  if (body && method !== "GET" && method !== "HEAD") {
    fetchOptions.body = JSON.stringify(body);
  }

  const res = await fetch(url, fetchOptions);

  if (stream) {
    return res;
  }

  let data = null;
  try {
    data = await res.json();
  } catch (_) {
  }

  if (!res.ok) {
    const msg =
      data?.detail || data?.message || `HTTP ${res.status} ${res.statusText}`;
    throw new Error(msg);
  }

  return data;
}

export const api = {
  login: (username, password) =>
    request("/api/auth/auth/login", {
      method: "POST",
      body: { username, password },
    }),

  register: (payload) =>
    request("/api/auth/auth/register", {
      method: "POST",
      body: payload,
    }),

  getCurrentCard: (token, { article }) =>
    request("/api/process/get_current_card", {
      method: "POST",
      token,
      body: { article },
    }),

  process: ({ article }, token) =>
    request("/api/process", {
      method: "POST",
      token,
      body: { article },
      stream: true,
    }),

  history: {
    list: (token, { limit = 50, offset = 0, status } = {}) =>
      request("/api/history", {
        method: "GET",
        token,
        params: { limit, offset, status },
      }),

    stats: (token, { days = 30 } = {}) =>
      request("/api/history/stats", {
        method: "GET",
        token,
        params: { days },
      }),
  },

  keywords: {
    byName: (token, name) =>
      request("/api/admin/keywords", {
        method: "GET",
        token,
        params: { name },
      }),
  },

  prompts: {
    list: (token) =>
      request("/api/admin/prompts", {
        method: "GET",
        token,
      }),

    get: (token, promptType) =>
      request(`/api/admin/prompts/${encodeURIComponent(promptType)}`, {
        method: "GET",
        token,
      }),

    preview: (token, promptType) =>
      request(
        `/api/admin/prompts/${encodeURIComponent(promptType)}/preview`,
        {
          method: "GET",
          token,
        }
      ),

    create: (token, payload) =>
      request("/api/admin/prompts", {
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
        {
          method: "POST",
          token,
        }
      ),

    types: (token) =>
      request("/api/admin/prompts/types/available", {
        method: "GET",
        token,
      }),

    versions: (token, promptType) =>
      request(
        `/api/admin/prompts/${encodeURIComponent(promptType)}/versions`,
        {
          method: "GET",
          token,
        }
      ),
  },

  photo: {
    scenes: {
      listCategories: (token) =>
        request("/api/photo/scenes/categories", { method: "GET", token }),

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

      createCategory: (token, payload) =>
        request("/api/admin/photo/scenes/categories", {
          method: "POST",
          token,
          body: payload,
        }),

      updateCategory: (token, id, payload) =>
        request(`/api/admin/photo/scenes/categories/${id}`, {
          method: "PUT",
          token,
          body: payload,
        }),

      deleteCategory: (token, id) =>
        request(`/api/admin/photo/scenes/categories/${id}`, {
          method: "DELETE",
          token,
        }),

      createSubcategory: (token, categoryId, payload) =>
        request(`/api/admin/photo/scenes/categories/${categoryId}/subcategories`, {
          method: "POST",
          token,
          body: payload,
        }),

      updateSubcategory: (token, id, payload) =>
        request(`/api/admin/photo/scenes/subcategories/${id}`, {
          method: "PUT",
          token,
          body: payload,
        }),

      deleteSubcategory: (token, id) =>
        request(`/api/admin/photo/scenes/subcategories/${id}`, {
          method: "DELETE",
          token,
        }),

      createItem: (token, subcatId, payload) =>
        request(`/api/admin/photo/scenes/subcategories/${subcatId}/items`, {
          method: "POST",
          token,
          body: payload,
        }),

      updateItem: (token, id, payload) =>
        request(`/api/admin/photo/scenes/items/${id}`, {
          method: "PUT",
          token,
          body: payload,
        }),

      deleteItem: (token, id) =>
        request(`/api/admin/photo/scenes/items/${id}`, {
          method: "DELETE",
          token,
        }),
    },

    poses: {
      listGroups: (token) =>
        request("/api/photo/poses/groups", { method: "GET", token }),

      listSubgroups: (token, groupId) =>
        request(`/api/photo/poses/groups/${groupId}/subgroups`, {
          method: "GET",
          token,
        }),

      listPrompts: (token, subgroupId) =>
        request(`/api/photo/poses/subgroups/${subgroupId}/prompts`, {
          method: "GET",
          token,
        }),

      createGroup: (token, payload) =>
        request("/api/admin/photo/poses/groups", {
          method: "POST",
          token,
          body: payload,
        }),

      updateGroup: (token, id, payload) =>
        request(`/api/admin/photo/poses/groups/${id}`, {
          method: "PUT",
          token,
          body: payload,
        }),

      deleteGroup: (token, id) =>
        request(`/api/admin/photo/poses/groups/${id}`, {
          method: "DELETE",
          token,
        }),

      createSubgroup: (token, groupId, payload) =>
        request(`/api/admin/photo/poses/groups/${groupId}/subgroups`, {
          method: "POST",
          token,
          body: payload,
        }),

      updateSubgroup: (token, id, payload) =>
        request(`/api/admin/photo/poses/subgroups/${id}`, {
          method: "PUT",
          token,
          body: payload,
        }),

      deleteSubgroup: (token, id) =>
        request(`/api/admin/photo/poses/subgroups/${id}`, {
          method: "DELETE",
          token,
        }),

      createPrompt: (token, subgroupId, payload) =>
        request(`/api/admin/photo/poses/subgroups/${subgroupId}/prompts`, {
          method: "POST",
          token,
          body: payload,
        }),

      updatePrompt: (token, id, payload) =>
        request(`/api/admin/photo/poses/prompts/${id}`, {
          method: "PUT",
          token,
          body: payload,
        }),

      deletePrompt: (token, id) =>
        request(`/api/admin/photo/poses/prompts/${id}`, {
          method: "DELETE",
          token,
        }),
    },

    // ===== PHOTO GENERATION ENDPOINTS =====
    generateScene: (token, { photo_url, item_id }) =>
      request("/api/photo/generate/scene", {
        method: "POST",
        token,
        body: { photo_url, item_id },
      }),

    // pose
    generatePose: (token, { photo_url, prompt_id }) =>
      request("/api/photo/generate/pose", {
        method: "POST",
        token,
        body: { photo_url, prompt_id },
      }),

    // custom
    generateCustom: (token, { photo_url, prompt, translate_to_en = true }) =>
      request("/api/photo/generate/custom", {
        method: "POST",
        token,
        body: { photo_url, prompt, translate_to_en },
      }),
  },
};