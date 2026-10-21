// ================================================================
// api.js  —  all communication with the FastAPI backend
// ================================================================
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ── Auth helpers ─────────────────────────────────────────────────

/** Returns the JWT token stored in localStorage, or null */
function getToken() {
  return localStorage.getItem("smartstudy_token");
}

/** Returns Authorization header object if a token exists */
function authHeaders() {
  const token = getToken();
  return token ? { "Authorization": `Bearer ${token}` } : {};
}

/** Register a new account. Stores token on success. */
export async function register(email, password) {
  const r = await fetch(`${BASE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) {
    const err = await r.json();
    throw new Error(err.detail || "Registration failed");
  }
  const data = await r.json();
  localStorage.setItem("smartstudy_token", data.token);
  return data;
}

/** Login with email + password. Stores token on success. */
export async function login(email, password) {
  const r = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) {
    const err = await r.json();
    throw new Error(err.detail || "Login failed");
  }
  const data = await r.json();
  localStorage.setItem("smartstudy_token", data.token);
  return data;
}

/** Remove token (logout) */
export function clearToken() {
  localStorage.removeItem("smartstudy_token");
}


// ── Deck functions ───────────────────────────────────────────────

export async function uploadPDF(file) {
  const formData = new FormData();
  formData.append("file", file);
  const r = await fetch(`${BASE_URL}/decks/upload`, {
    method: "POST",
    headers: { ...authHeaders() },
    body: formData,
  });
  if (!r.ok) {
    const error = await r.json();
    throw new Error(error.detail || "Upload failed");
  }
  return r.json();
}

export async function getDecks() {
  const r = await fetch(`${BASE_URL}/decks`, {
    headers: { ...authHeaders() },
  });
  if (!r.ok) throw new Error("Failed to fetch decks");
  return r.json();
}

export async function deleteDeck(deckId) {
  const r = await fetch(`${BASE_URL}/decks/${deckId}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (!r.ok) throw new Error("Failed to delete deck");
  return r.json();
}


// ── Card functions ───────────────────────────────────────────────

export async function getDueCards() {
  const r = await fetch(`${BASE_URL}/cards/due`, {
    headers: { ...authHeaders() },
  });
  if (!r.ok) throw new Error("Failed to fetch due cards");
  return r.json();
}

export async function reviewCard(cardId, rating) {
  const r = await fetch(`${BASE_URL}/cards/${cardId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ rating }),
  });
  if (!r.ok) throw new Error("Failed to submit review");
  return r.json();
}


// ── Stats functions ──────────────────────────────────────────────

export async function getStats() {
  const r = await fetch(`${BASE_URL}/stats`, {
    headers: { ...authHeaders() },
  });
  if (!r.ok) throw new Error("Failed to fetch stats");
  return r.json();
}

export async function getStreak() {
  const r = await fetch(`${BASE_URL}/stats/streak`, {
    headers: { ...authHeaders() },
  });
  if (!r.ok) return { streak: 0 };
  return r.json();
}

export async function getHeatmap() {
  const r = await fetch(`${BASE_URL}/stats/heatmap`, {
    headers: { ...authHeaders() },
  });
  if (!r.ok) return [];
  return r.json();
}

export async function getForecast() {
  const r = await fetch(`${BASE_URL}/stats/forecast`, {
    headers: { ...authHeaders() },
  });
  if (!r.ok) return [];
  return r.json();
}

export async function getTopicAccuracy() {
  const r = await fetch(`${BASE_URL}/stats/topics`, {
    headers: { ...authHeaders() },
  });
  if (!r.ok) return [];
  return r.json();
}


// ── Settings functions ───────────────────────────────────────────

export async function getNotifyEmail() {
  const r = await fetch(`${BASE_URL}/settings/email`, {
    headers: { ...authHeaders() },
  });
  if (!r.ok) return { email: "" };
  return r.json();
}

export async function saveNotifyEmail(email) {
  const r = await fetch(`${BASE_URL}/settings/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ email }),
  });
  if (!r.ok) throw new Error("Failed to save email");
  return r.json();
}

export async function getReminderTime() {
  const r = await fetch(`${BASE_URL}/settings/reminder-time`, {
    headers: { ...authHeaders() },
  });
  if (!r.ok) return { time: "08:00" };
  return r.json();
}

export async function saveReminderTime(time) {
  const r = await fetch(`${BASE_URL}/settings/reminder-time`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ time }),
  });
  if (!r.ok) throw new Error("Failed to save reminder time");
  return r.json();
}
