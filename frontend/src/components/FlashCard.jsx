// ================================================================
// FlashCard.jsx
// ================================================================
// This component renders the actual flashcard with a flip animation.
//
// What is a component?
// --------------------
// A React component is just a function that returns HTML (JSX).
// We can reuse it anywhere by writing <FlashCard ... />
//
// What is JSX?
// ------------
// JSX is HTML-like syntax inside JavaScript. It looks like HTML
// but it's actually JavaScript. React converts it to real HTML.
//
// How does the flip animation work?
// ----------------------------------
// We use CSS 3D transforms. The card has two faces (front/back).
// When flipped=true, we rotate the card 180 degrees on the Y axis.
// The back face starts rotated 180 degrees, so it becomes visible.
// This creates the realistic card-flip effect.
// ================================================================

import { useState } from "react";
// useState is a React "hook" — it lets us store values that,
// when changed, cause the component to re-render (update the UI)


/**
 * FlashCard component
 *
 * Props (inputs to the component):
 * @param {Object} card     - The card data { question, answer, topic, card_type }
 * @param {Function} onRate - Function to call when user rates the card (1/2/3/4)
 */
export default function FlashCard({ card, onRate }) {
  // isFlipped tracks whether we're showing the question or answer
  // false = showing question (front), true = showing answer (back)
  const [isFlipped, setIsFlipped] = useState(false);

  // The 4 rating buttons with their colors and labels
  const ratings = [
    { value: 1, label: "Again",  emoji: "😫", color: "bg-red-500 hover:bg-red-600" },
    { value: 2, label: "Hard",   emoji: "😓", color: "bg-orange-500 hover:bg-orange-600" },
    { value: 3, label: "Good",   emoji: "🙂", color: "bg-green-500 hover:bg-green-600" },
    { value: 4, label: "Easy",   emoji: "😄", color: "bg-blue-500 hover:bg-blue-600" },
  ];

  // When user clicks a rating button:
  // 1. Reset the flip so next card shows the front
  // 2. Call onRate with the rating value (triggers FSRS in backend)
  function handleRate(rating) {
    setIsFlipped(false);     // reset flip for next card
    onRate(rating);          // tell the parent component the rating
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto">

      {/* ── Topic Badge ─────────────────────────────────────── */}
      <div className="flex gap-2">
        <span className="bg-indigo-100 text-indigo-700 text-sm px-3 py-1 rounded-full font-medium">
          {card.topic || "General"}
        </span>
        <span className="bg-gray-100 text-gray-600 text-sm px-3 py-1 rounded-full">
          {card.card_type}
        </span>
      </div>

      {/* ── The Card (with flip animation) ──────────────────── */}
      {/*
        "perspective" is required for 3D CSS transforms to work.
        Without it, the 3D rotation looks flat.
        The outer div provides the perspective, inner div rotates.
      */}
      <div
        className="w-full cursor-pointer"
        style={{ perspective: "1000px" }}   // CSS 3D perspective
        onClick={() => setIsFlipped(!isFlipped)}  // click to flip
      >
        {/* This div is what actually rotates */}
        <div
          className="relative w-full transition-transform duration-500"
          style={{
            transformStyle: "preserve-3d",          // enable 3D on children
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            minHeight: "240px",
          }}
        >

          {/* ── Front Face (Question) ──────────────────────── */}
          <div
            className="absolute inset-0 bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center justify-center border border-gray-100"
            style={{ backfaceVisibility: "hidden" }}  // hide when flipped
          >
            <p className="text-xs uppercase tracking-widest text-gray-400 mb-4">Question</p>
            <p className="text-xl font-medium text-gray-800 text-center leading-relaxed">
              {card.question}
            </p>
            <p className="text-sm text-gray-400 mt-6">Click to reveal answer</p>
          </div>

          {/* ── Back Face (Answer) ────────────────────────── */}
          {/*
            The back face starts rotated 180deg.
            When the card flips 180deg, back + card = 360deg = facing forward.
            backfaceVisibility: hidden hides it when it's facing away.
          */}
          <div
            className="absolute inset-0 bg-indigo-50 rounded-2xl shadow-lg p-8 flex flex-col items-center justify-center border border-indigo-100"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",  // starts facing away
            }}
          >
            <p className="text-xs uppercase tracking-widest text-indigo-400 mb-4">Answer</p>
            <p className="text-lg text-gray-700 text-center leading-relaxed">
              {card.answer}
            </p>
          </div>

        </div>
      </div>

      {/* ── Rating Buttons (only show after flip) ───────────── */}
      {/*
        We show the rating buttons only after the user flips the card.
        No point rating something you haven't seen the answer to!
      */}
      {isFlipped && (
        <div className="w-full">
          <p className="text-center text-sm text-gray-500 mb-3">How well did you remember?</p>
          <div className="grid grid-cols-4 gap-3">
            {ratings.map((r) => (
              <button
                key={r.value}
                onClick={() => handleRate(r.value)}
                className={`${r.color} text-white rounded-xl py-3 flex flex-col items-center gap-1 transition-all duration-150 active:scale-95`}
              >
                <span className="text-xl">{r.emoji}</span>
                <span className="text-sm font-medium">{r.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
