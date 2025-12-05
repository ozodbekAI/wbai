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
};
