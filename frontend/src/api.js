// ================================================================
// api.js
// ================================================================
// This file contains ALL communication with our FastAPI backend.
//
// Why put all API calls in one file?
// -----------------------------------
// Instead of writing fetch("http://localhost:8000/...") scattered
// across 10 different components, we keep it all here.
// If the backend URL ever changes, we change it in ONE place.
// This pattern is called a "service layer" — very common in
// professional React codebases.
//
// How does fetch() work?
// ----------------------
// fetch() sends an HTTP request to our FastAPI backend.
// It returns a Promise — meaning it takes time (network request).
// We use "await" to wait for the response before continuing.
// ================================================================

// The base URL of our FastAPI backend
// During development, FastAPI runs on port 8000
// When we deploy, we'll change this to the live URL
const BASE_URL = "http://localhost:8000";


// ── DECK FUNCTIONS ──────────────────────────────────────────────

/**
 * Upload a PDF file and generate flashcards from it.
 *
 * Why FormData?
 * -------------
 * When sending files over HTTP, we use FormData instead of JSON.
 * It's the standard format for file uploads — same as HTML forms.
 *
 * @param {File} file - The PDF file object from the file input
 * @returns {Object} - { deck_id, name, total_cards, message }
 */
export async function uploadPDF(file) {
  // FormData is how we send files over HTTP
  const formData = new FormData();
  formData.append("file", file); // "file" must match FastAPI's parameter name

  const response = await fetch(`${BASE_URL}/decks/upload`, {
    method: "POST",    // POST because we're sending data
    body: formData,    // the file goes in the body
    // Note: don't set Content-Type header — browser sets it automatically for FormData
  });

  if (!response.ok) {
    // response.ok is false when status is 4xx or 5xx
    const error = await response.json();
    throw new Error(error.detail || "Upload failed");
  }

  return response.json(); // parse the JSON response body
}


/**
 * Get all decks the user has created.
 * @returns {Array} - [{ id, name, filename, total_cards, created_at }, ...]
 */
export async function getDecks() {
  const response = await fetch(`${BASE_URL}/decks`);
  if (!response.ok) throw new Error("Failed to fetch decks");
  return response.json();
}


// ── CARD FUNCTIONS ──────────────────────────────────────────────

/**
 * Get all cards that are due for review today.
 * These are cards where due_date <= today.
 * @returns {Array} - [{ id, question, answer, deck_name, ... }, ...]
 */
export async function getDueCards() {
  const response = await fetch(`${BASE_URL}/cards/due`);
  if (!response.ok) throw new Error("Failed to fetch due cards");
  return response.json();
}


/**
 * Submit a review rating for a card.
 * This triggers the FSRS algorithm to calculate the next due date.
 *
 * @param {number} cardId - The card's ID in the database
 * @param {number} rating - 1=Again, 2=Hard, 3=Good, 4=Easy
 * @returns {Object} - { next_due_date, scheduled_days, message }
 */
export async function reviewCard(cardId, rating) {
  const response = await fetch(`${BASE_URL}/cards/${cardId}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json", // we're sending JSON this time
    },
    body: JSON.stringify({ rating }), // { rating: 3 }
  });

  if (!response.ok) throw new Error("Failed to submit review");
  return response.json();
}


// ── STATS FUNCTION ──────────────────────────────────────────────

/**
 * Get dashboard statistics.
 * @returns {Object} - { total_cards, due_today, mastered, retention_rate, top_topics }
 */
export async function getStats() {
  const response = await fetch(`${BASE_URL}/stats`);
  if (!response.ok) throw new Error("Failed to fetch stats");
  return response.json();
}
