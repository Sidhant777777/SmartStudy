import { useState } from "react";

const ratings = [
  { value: 1, label: "Again",  emoji: "😫", bg: "bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400" },
  { value: 2, label: "Hard",   emoji: "😓", bg: "bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/40 border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400" },
  { value: 3, label: "Good",   emoji: "🙂", bg: "bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400" },
  { value: 4, label: "Easy",   emoji: "😄", bg: "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400" },
];

export default function FlashCard({ card, onRate }) {
  const [isFlipped, setIsFlipped] = useState(false);

  function handleRate(rating) {
    setIsFlipped(false);
    onRate(rating);
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto">

      {/* Topic badges */}
      <div className="flex gap-2 flex-wrap justify-center">
        <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs px-3 py-1.5 rounded-full font-medium border border-indigo-100 dark:border-indigo-800">
          {card.topic || "General"}
        </span>
        <span className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700">
          {card.card_type}
        </span>
      </div>

      {/* Card */}
      <div
        className="w-full cursor-pointer select-none"
        style={{ perspective: "1200px" }}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div
          className="relative w-full transition-transform duration-500 ease-out"
          style={{
            transformStyle: "preserve-3d",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            minHeight: "260px",
          }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 bg-white dark:bg-gray-900 rounded-3xl shadow-lg dark:shadow-black/30 p-8 flex flex-col items-center justify-center border border-gray-100 dark:border-gray-800"
            style={{ backfaceVisibility: "hidden" }}
          >
            <p className="text-xs uppercase tracking-widest text-gray-300 dark:text-gray-600 mb-5 font-medium">Question</p>
            <p className="text-xl font-medium text-gray-800 dark:text-white text-center leading-relaxed">
              {card.question}
            </p>
            <div className="mt-8 flex items-center gap-2 text-gray-300 dark:text-gray-600">
              <span className="text-sm">Tap to reveal</span>
              <span className="text-lg">↕</span>
            </div>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50 p-8 flex flex-col items-center justify-center"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <p className="text-xs uppercase tracking-widest text-indigo-200 mb-5 font-medium">Answer</p>
            <p className="text-xl text-white text-center leading-relaxed font-medium">
              {card.answer}
            </p>
          </div>
        </div>
      </div>

      {/* Rating buttons */}
      {isFlipped && (
        <div className="w-full animate-fade-in">
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 mb-3">How well did you remember?</p>
          <div className="grid grid-cols-4 gap-3">
            {ratings.map((r) => (
              <button
                key={r.value}
                onClick={() => handleRate(r.value)}
                className={`${r.bg} border rounded-2xl py-3.5 flex flex-col items-center gap-1 transition-all duration-150 active:scale-95 hover:-translate-y-0.5`}
              >
                <span className="text-2xl">{r.emoji}</span>
                <span className="text-xs font-semibold">{r.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
