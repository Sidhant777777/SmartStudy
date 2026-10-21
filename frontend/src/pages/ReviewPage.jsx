import { useState, useEffect } from "react";
import { getDueCards, reviewCard } from "../api";
import FlashCard from "../components/FlashCard";
import Confetti from "../components/Confetti";

export default function ReviewPage({ onFinish }) {
  const [cards, setCards]               = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading]           = useState(true);
  const [submitting, setSubmitting]     = useState(false);
  const [sessionStats, setSessionStats] = useState({ again: 0, hard: 0, good: 0, easy: 0 });
  const [showConfetti, setShowConfetti] = useState(false);

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

  // Fire confetti once when session completes
  useEffect(() => {
    if (cards.length > 0 && currentIndex >= cards.length) {
      setShowConfetti(true);
    }
  }, [currentIndex, cards.length]);

  async function handleRate(rating) {
    if (submitting) return;
    const currentCard = cards[currentIndex];
    setSubmitting(true);
    try {
      await reviewCard(currentCard.id, rating);
      const labels = { 1: "again", 2: "hard", 3: "good", 4: "easy" };
      setSessionStats(prev => ({ ...prev, [labels[rating]]: prev[labels[rating]] + 1 }));
      setCurrentIndex(prev => prev + 1);
    } catch (err) {
      console.error("Failed to submit review:", err);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 text-lg">Loading cards...</p>
      </div>
    );
  }

  // ── No cards due ─────────────────────────────────────────────
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

  // ── Session complete ─────────────────────────────────────────
  if (currentIndex >= cards.length) {
    const total = cards.length;
    const goodRate = Math.round(((sessionStats.good + sessionStats.easy) / total) * 100);
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        {showConfetti && <Confetti />}
        <p className="text-6xl animate-bounce">🏆</p>
        <h2 className="text-2xl font-bold text-gray-800">Session Complete!</h2>
        <p className="text-gray-500">You reviewed <strong>{total}</strong> cards · <strong>{goodRate}%</strong> correct</p>

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

  // ── Active session ───────────────────────────────────────────
  const currentCard = cards[currentIndex];
  const progress = (currentIndex / cards.length) * 100;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onFinish} className="text-gray-400 hover:text-gray-600 text-sm">← Exit</button>
        <p className="text-sm text-gray-500">{currentIndex + 1} / {cards.length}</p>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <FlashCard card={currentCard} onRate={handleRate} />

      <p className="text-center text-sm text-gray-400">From: {currentCard.deck_name}</p>
    </div>
  );
}
