// ================================================================
// ReviewPage.jsx
// ================================================================
// The actual flashcard review session page.
//
// How the review session works:
// 1. Load all due cards from backend on mount
// 2. Show the first card using FlashCard component
// 3. User flips card, then clicks a rating button
// 4. We call the backend to update FSRS scheduling
// 5. Move to next card
// 6. When all cards done → show a summary screen
//
// Key concept: currentIndex
// -------------------------
// We keep an index (0, 1, 2, ...) pointing to the current card
// in the dueCards array. Each time the user rates a card,
// we increment the index to move to the next card.
// ================================================================

import { useState, useEffect } from "react";
import { getDueCards, reviewCard } from "../api";
import FlashCard from "../components/FlashCard";


/**
 * ReviewPage component
 * @param {Function} onFinish - Called when review session is complete
 */
export default function ReviewPage({ onFinish }) {

  // ── State ─────────────────────────────────────────────────────
  const [cards, setCards]           = useState([]);    // all due cards
  const [currentIndex, setCurrentIndex] = useState(0); // which card we're on
  const [loading, setLoading]       = useState(true);  // fetching cards
  const [submitting, setSubmitting] = useState(false); // submitting a review
  const [sessionStats, setSessionStats] = useState({  // track this session
    again: 0, hard: 0, good: 0, easy: 0
  });


  // ── Load due cards when page opens ───────────────────────────
  useEffect(() => {
    async function loadCards() {
      try {
        const dueCards = await getDueCards();
        setCards(dueCards);
      } catch (err) {
        console.error("Failed to load due cards:", err);
      } finally {
        setLoading(false);
      }
    }
    loadCards();
  }, []);


  // ── Handle user rating a card ─────────────────────────────────
  async function handleRate(rating) {
    if (submitting) return; // prevent double-clicking

    const currentCard = cards[currentIndex];
    setSubmitting(true);

    try {
      // Tell the backend the user's rating
      // FSRS will calculate the next due date
      await reviewCard(currentCard.id, rating);

      // Update session stats for the summary screen
      const ratingLabels = { 1: "again", 2: "hard", 3: "good", 4: "easy" };
      setSessionStats(prev => ({
        ...prev,
        [ratingLabels[rating]]: prev[ratingLabels[rating]] + 1
      }));

      // Move to next card
      setCurrentIndex(prev => prev + 1);

    } catch (err) {
      console.error("Failed to submit review:", err);
    } finally {
      setSubmitting(false);
    }
  }


  // ── Loading State ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 text-lg">Loading cards...</p>
      </div>
    );
  }


  // ── No cards due ──────────────────────────────────────────────
  if (cards.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-6xl mb-4">🎉</p>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">All caught up!</h2>
        <p className="text-gray-500 mb-8">No cards due for review right now. Come back later!</p>
        <button
          onClick={onFinish}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
        >
          Back to Home
        </button>
      </div>
    );
  }


  // ── Session Complete (Summary Screen) ─────────────────────────
  // currentIndex >= cards.length means we've gone through all cards
  if (currentIndex >= cards.length) {
    const total = cards.length;

    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <p className="text-6xl">🏆</p>
        <h2 className="text-2xl font-bold text-gray-800">Session Complete!</h2>
        <p className="text-gray-500">You reviewed {total} cards</p>

        {/* Session breakdown */}
        <div className="grid grid-cols-4 gap-3 max-w-sm mx-auto">
          <div className="bg-red-50 rounded-xl p-3">
            <p className="text-2xl font-bold text-red-600">{sessionStats.again}</p>
            <p className="text-xs text-red-400">Again</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-3">
            <p className="text-2xl font-bold text-orange-600">{sessionStats.hard}</p>
            <p className="text-xs text-orange-400">Hard</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3">
            <p className="text-2xl font-bold text-green-600">{sessionStats.good}</p>
            <p className="text-xs text-green-400">Good</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3">
            <p className="text-2xl font-bold text-blue-600">{sessionStats.easy}</p>
            <p className="text-xs text-blue-400">Easy</p>
          </div>
        </div>

        <button
          onClick={onFinish}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-semibold transition-colors"
        >
          Back to Home
        </button>
      </div>
    );
  }


  // ── Active Review Session ─────────────────────────────────────
  const currentCard = cards[currentIndex];
  const progress = ((currentIndex) / cards.length) * 100; // percentage complete

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <button
          onClick={onFinish}
          className="text-gray-400 hover:text-gray-600 text-sm"
        >
          ← Exit
        </button>
        <p className="text-sm text-gray-500">
          {currentIndex + 1} / {cards.length}
        </p>
      </div>

      {/* ── Progress Bar ───────────────────────────────────────── */}
      {/*
        The width of the inner div is set dynamically using a style prop.
        We can't use template literals in Tailwind for dynamic values,
        so we use style={{ width: `${progress}%` }} instead.
      */}
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ── Flashcard ──────────────────────────────────────────── */}
      <FlashCard
        card={currentCard}
        onRate={handleRate}
      />

      {/* ── Deck Name ──────────────────────────────────────────── */}
      <p className="text-center text-sm text-gray-400">
        From: {currentCard.deck_name}
      </p>

    </div>
  );
}
