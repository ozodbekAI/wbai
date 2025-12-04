const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

async function request(path, { method = "GET", token, body, headers } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const ct = res.headers.get("content-type");
  if (ct && ct.includes("application/json")) data = await res.json();
  else data = await res.text();

  if (!res.ok) {
    const msg = data?.detail || data?.message || data || "Request failed";
    throw new Error(msg);
  }
  return data;
}


export const api = {
  login: (payload) =>
    request("/api/auth/auth/login", { method: "POST", body: payload }),

  process: (payload, token) =>
    fetch(`${API_BASE}/api/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }),

  getCurrentCard: (token, payload) =>
    request("/api/process/get_current_card", {
      method: "POST",
      token,
      body: payload, // { article: "..." }
    }),

  // prompts
  getPrompts: (token) => request("/api/admin/prompts", { token }),
  createPrompt: (token, payload) =>
    request("/api/admin/prompts", { method: "POST", token, body: payload }),
  updatePrompt: (token, promptType, payload) =>
    request(`/api/admin/prompts/${promptType}`, {
      method: "PUT",
      token,
      body: payload,
    }),
  deletePrompt: (token, promptType) =>
    request(`/api/admin/prompts/${promptType}`, {
      method: "DELETE",
      token,
    }),
  previewPrompt: (token, promptType) =>
    request(`/api/admin/prompts/${promptType}/preview`, { token }),
  versionsPrompt: (token, promptType) =>
    request(`/api/admin/prompts/${promptType}/versions`, { token }),
  availablePromptTypes: (token) =>
    request(`/api/admin/prompts/types/available`, { token }),
};
