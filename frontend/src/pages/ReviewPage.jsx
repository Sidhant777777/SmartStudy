import { useState, useEffect } from "react";
import { getDueCards, reviewCard } from "../api";
import FlashCard from "../components/FlashCard";

export default function ReviewPage({ onFinish }) {
  const [cards, setCards]               = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading]           = useState(true);
  const [submitting, setSubmitting]     = useState(false);
  const [sessionStats, setSessionStats] = useState({ again: 0, hard: 0, good: 0, easy: 0 });

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

  async function handleRate(rating) {
    if (submitting) return;
    const currentCard = cards[currentIndex];
    setSubmitting(true);
    try {
      await reviewCard(currentCard.id, rating);
    } catch (err) {
      console.error("Failed to submit review:", err);
      // Still advance even on API error so user isn't stuck
    } finally {
      const labels = { 1: "again", 2: "hard", 3: "good", 4: "easy" };
      setSessionStats(prev => ({ ...prev, [labels[rating]]: prev[labels[rating]] + 1 }));
      setCurrentIndex(prev => prev + 1);
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading cards...</p>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center animate-bounce-in">
        <p className="text-7xl mb-4">🎉</p>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">All caught up!</h2>
        <p className="text-gray-400 mb-8">No cards due right now. Come back later!</p>
        <button
          onClick={onFinish}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-2xl font-semibold shadow-md shadow-indigo-200 dark:shadow-indigo-900 hover:-translate-y-0.5 transition-all"
        >
          Back to Home
        </button>
      </div>
    );
  }

  if (currentIndex >= cards.length) {
    const total = cards.length;
    const summaryItems = [
      { key: "again", label: "Again", color: "text-red-500 dark:text-red-400",    bg: "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900" },
      { key: "hard",  label: "Hard",  color: "text-orange-500 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-900" },
      { key: "good",  label: "Good",  color: "text-green-500 dark:text-green-400",  bg: "bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900" },
      { key: "easy",  label: "Easy",  color: "text-blue-500 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900" },
    ];

    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6 animate-bounce-in">
        <div className="text-7xl">🏆</div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Session Complete!</h2>
        <p className="text-gray-400">You reviewed {total} card{total !== 1 ? "s" : ""}</p>

        <div className="grid grid-cols-4 gap-3 max-w-sm mx-auto">
          {summaryItems.map(item => (
            <div key={item.key} className={`${item.bg} rounded-2xl p-4 border`}>
              <p className={`text-2xl font-bold ${item.color}`}>{sessionStats[item.key]}</p>
              <p className={`text-xs mt-0.5 ${item.color} opacity-70`}>{item.label}</p>
            </div>
          ))}
        </div>

        <button
          onClick={onFinish}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-10 py-3 rounded-2xl font-semibold shadow-md shadow-indigo-200 dark:shadow-indigo-900 hover:-translate-y-0.5 transition-all"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const progress = (currentIndex / cards.length) * 100;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onFinish}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm flex items-center gap-1 transition-colors"
        >
          ← Exit
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
            {currentIndex + 1} / {cards.length}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
        <div
          className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <FlashCard key={currentCard.id} card={currentCard} onRate={handleRate} />

      <p className="text-center text-xs text-gray-300 dark:text-gray-600">
        From: {currentCard.deck_name}
      </p>
    </div>
  );
}
