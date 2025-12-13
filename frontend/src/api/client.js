// frontend/src/api/client.js

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function normalizePath(path) {
  if (
    !path.endsWith("/") &&
    !path.includes("?") &&
    !path.match(/\/\d+$/)
  ) {
    return path + "/";
  }
  return path;
}

export async function request(
  path,
  { method = "GET", token, body, params } = {}
) {
  const normalizedPath = normalizePath(path);
  const urlObj = new URL(`${API_URL}${normalizedPath}`);

  if (params && typeof params === "object") {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        urlObj.searchParams.append(key, String(value));
      }
    });
  }

  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const options = { method, headers };

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
    fetch(`${API_URL}/api/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ article }),
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
    list: (token) => request("/api/admin/prompts", { method: "GET", token }),

    get: (token, promptType) =>
      request(`/api/admin/prompts/${encodeURIComponent(promptType)}`, { method: "GET", token }),

    preview: (token, promptType) =>
      request(`/api/admin/prompts/${encodeURIComponent(promptType)}/preview`, { method: "GET", token }),

    create: (token, payload) =>
      request("/api/admin/prompts", { method: "POST", token, body: payload }),

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
      request(`/api/admin/prompts/${encodeURIComponent(promptType)}/activate`, { method: "POST", token }),

    types: (token) =>
      request("/api/admin/prompts/types/available", { method: "GET", token }),

    versions: (token, promptType) =>
      request(`/api/admin/prompts/${encodeURIComponent(promptType)}/versions`, { method: "GET", token }),
  },

  // ===== VIDEO API =====
  video: {
    getScenarios: (token) =>
      request("/api/video/scenarios", {
        method: "GET",
        token,
      }),
  },

  // ===== ADMIN VIDEO SCENARIOS =====
  admin: {
    videoScenarios: {
      list: (token, { only_active = false } = {}) =>
        request("/api/admin/video-scenarios", {
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
        request("/api/admin/video-scenarios", {
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

  // ===== PHOTO API =====
  photo: {
    // ✅ GENERATED (RIGHT BLOCK uchun)
    generated: {
      list: (token, { limit = 24, offset = 0 } = {}) =>
        request("/api/photo/generated", {
          method: "GET",
          token,
          params: { limit, offset },
        }),

      delete: (token, file_name) =>
        request("/api/photo/generated", {
          method: "DELETE",
          token,
          params: { file_name },      // backend kutayotgan parametr nomi
        }),
    },

    // ===== Scenes =====
    scenes: {
      listCategories: (token) =>
        request("/api/photo/scenes/categories", { method: "GET", token }),

      listSubcategories: (token, categoryId) =>
        request(`/api/photo/scenes/${categoryId}/subcategories`, { method: "GET", token }),

      listItems: (token, subcategoryId) =>
        request(`/api/photo/scenes/subcategories/${subcategoryId}/items`, { method: "GET", token }),

      createCategory: (token, payload) =>
        request("/api/admin/photo/scenes/categories", { method: "POST", token, body: payload }),

      updateCategory: (token, id, payload) =>
        request(`/api/admin/photo/scenes/categories/${id}`, { method: "PUT", token, body: payload }),

      deleteCategory: (token, id) =>
        request(`/api/admin/photo/scenes/categories/${id}`, { method: "DELETE", token }),

      createSubcategory: (token, categoryId, payload) =>
        request(`/api/admin/photo/scenes/categories/${categoryId}/subcategories`, {
          method: "POST",
          token,
          body: payload,
        }),

      updateSubcategory: (token, id, payload) =>
        request(`/api/admin/photo/scenes/subcategories/${id}`, { method: "PUT", token, body: payload }),

      deleteSubcategory: (token, id) =>
        request(`/api/admin/photo/scenes/subcategories/${id}`, { method: "DELETE", token }),

      createItem: (token, subcatId, payload) =>
        request(`/api/admin/photo/scenes/subcategories/${subcatId}/items`, { method: "POST", token, body: payload }),

      updateItem: (token, id, payload) =>
        request(`/api/admin/photo/scenes/items/${id}`, { method: "PUT", token, body: payload }),

      deleteItem: (token, id) =>
        request(`/api/admin/photo/scenes/items/${id}`, { method: "DELETE", token }),
    },

    // ===== Poses =====
    poses: {
      listGroups: (token) => request("/api/photo/poses/groups", { method: "GET", token }),

      listSubgroups: (token, groupId) =>
        request(`/api/photo/poses/groups/${groupId}/subgroups`, { method: "GET", token }),

      listPrompts: (token, subgroupId) =>
        request(`/api/photo/poses/subgroups/${subgroupId}/prompts`, { method: "GET", token }),

      createGroup: (token, payload) =>
        request("/api/admin/photo/poses/groups", { method: "POST", token, body: payload }),

      updateGroup: (token, id, payload) =>
        request(`/api/admin/photo/poses/groups/${id}`, { method: "PUT", token, body: payload }),

      deleteGroup: (token, id) =>
        request(`/api/admin/photo/poses/groups/${id}`, { method: "DELETE", token }),

      createSubgroup: (token, groupId, payload) =>
        request(`/api/admin/photo/poses/groups/${groupId}/subgroups`, { method: "POST", token, body: payload }),

      updateSubgroup: (token, id, payload) =>
        request(`/api/admin/photo/poses/subgroups/${id}`, { method: "PUT", token, body: payload }),

      deleteSubgroup: (token, id) =>
        request(`/api/admin/photo/poses/subgroups/${id}`, { method: "DELETE", token }),

      createPrompt: (token, subgroupId, payload) =>
        request(`/api/admin/photo/poses/subgroups/${subgroupId}/prompts`, { method: "POST", token, body: payload }),

      updatePrompt: (token, id, payload) =>
        request(`/api/admin/photo/poses/prompts/${id}`, { method: "PUT", token, body: payload }),

      deletePrompt: (token, id) =>
        request(`/api/admin/photo/poses/prompts/${id}`, { method: "DELETE", token }),
    },

    // ===== MODELS (normalize uchun) =====
    models: {
      listCategories: (token) => request("/api/photo/models/categories", { method: "GET", token }),

      listSubcategories: (token, categoryId) =>
        request(`/api/photo/models/categories/${categoryId}/subcategories`, { method: "GET", token }),

      listItems: (token, subId) =>
        request(`/api/photo/models/subcategories/${subId}/items`, { method: "GET", token }),

      // YANGI: create, update, delete to'liq
      createCategory: (token, payload) =>
        request("/api/admin/photo/models/categories", { method: "POST", token, body: payload }),

      updateCategory: (token, id, payload) =>
        request(`/api/admin/photo/models/categories/${id}`, { method: "PUT", token, body: payload }),

      deleteCategory: (token, id) =>
        request(`/api/admin/photo/models/categories/${id}`, { method: "DELETE", token }),

      createSubcategory: (token, categoryId, payload) =>
        request(`/api/admin/photo/models/categories/${categoryId}/subcategories`, { method: "POST", token, body: payload }),

      updateSubcategory: (token, id, payload) =>
        request(`/api/admin/photo/models/subcategories/${id}`, { method: "PUT", token, body: payload }),

      deleteSubcategory: (token, id) =>
        request(`/api/admin/photo/models/subcategories/${id}`, { method: "DELETE", token }),

      createItem: (token, subId, payload) =>
        request(`/api/admin/photo/models/subcategories/${subId}/items`, { method: "POST", token, body: payload }),

      updateItem: (token, id, payload) =>
        request(`/api/admin/photo/models/items/${id}`, { method: "PUT", token, body: payload }),

      deleteItem: (token, id) =>
        request(`/api/admin/photo/models/items/${id}`, { method: "DELETE", token }),
    },

    // ===== GENERATION ENDPOINTS =====
    generateScene: (token, { photo_url, item_id }) =>
      request("/api/photo/generate/scene", {
        method: "POST",
        token,
        body: { photo_url, item_id },
      }),

    generatePose: (token, { photo_url, prompt_id }) =>
      request("/api/photo/generate/pose", {
        method: "POST",
        token,
        body: { photo_url, prompt_id },
      }),

    generateCustom: (token, { photo_url, prompt, translate_to_en = true }) =>
      request("/api/photo/generate/custom", {
        method: "POST",
        token,
        body: { photo_url, prompt, translate_to_en },
      }),

    enhancePhoto: (token, { photo_url, level = "medium" }) =>
      request("/api/photo/generate/enhance", {
        method: "POST",
        token,
        body: { photo_url, level },
      }),

    generateVideo: (token, { photo_url, prompt, plan_key, translate_to_en = true }) =>
      request("/api/photo/generate/video", {
        method: "POST",
        token,
        body: { photo_url, prompt, plan_key, translate_to_en },
      }),

    generateNormalize: (token, payload) =>
      request("/api/photo/generate/normalize", {
        method: "POST",
        token,
        body: payload,
      }),

    // ===== FILE MANAGEMENT =====
    uploadPhoto: (token, file) => {
      const form = new FormData();
      form.append("file", file);
      return request("/api/photo/upload", {
        method: "POST",
        token,
        body: form,
      });
    },

    deleteFile: (token, fileName) =>
      request("/api/photo/generated", {
        method: "DELETE",
        token,
        params: { file_name: fileName },
      }),
  },
};