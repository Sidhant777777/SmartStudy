// ================================================================
// HomePage.jsx
// ================================================================
// The main dashboard page. Shows:
//   1. Stats (total cards, due today, retention rate, mastered)
//   2. PDF upload section
//   3. List of all decks
//   4. "Start Review" button if cards are due
//
// What is useEffect?
// ------------------
// useEffect runs code AFTER the component renders.
// We use it to fetch data from the backend when the page loads.
// It's the React equivalent of "run this when the page opens."
//
// What is useState?
// -----------------
// useState stores values in the component.
// When the value changes, React automatically re-renders the UI.
// ================================================================

import { useState, useEffect, useRef } from "react";
import { uploadPDF, getDecks, getStats, getDueCards } from "../api";
import StatCard from "../components/StatCard";

/**
 * HomePage component
 * @param {Function} onStartReview - Called when user clicks "Start Review"
 */
export default function HomePage({ onStartReview }) {

  // ── State ────────────────────────────────────────────────────
  const [stats, setStats]         = useState(null);   // dashboard numbers
  const [decks, setDecks]         = useState([]);      // list of all decks
  const [dueCount, setDueCount]   = useState(0);       // how many cards due today
  const [uploading, setUploading] = useState(false);   // is upload in progress?
  const [uploadMsg, setUploadMsg] = useState("");      // success/error message
  const [loading, setLoading]     = useState(true);    // initial page load

  // useRef gives us a reference to the hidden file input element
  // so we can trigger it programmatically when the upload button is clicked
  const fileInputRef = useRef(null);


  // ── Fetch data on page load ───────────────────────────────────
  // useEffect with [] (empty array) runs ONCE when component mounts
  // This is where we load all the data from the backend
  useEffect(() => {
    async function loadData() {
      try {
        // Fetch all three things at the same time (faster than one by one)
        // Promise.all waits for ALL promises to complete
        const [statsData, decksData, dueCards] = await Promise.all([
          getStats(),
          getDecks(),
          getDueCards(),
        ]);
        setStats(statsData);
        setDecks(decksData);
        setDueCount(dueCards.length);
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false); // stop showing loading spinner regardless of success/error
      }
    }

    loadData();
  }, []); // [] = run only once on mount


  // ── Handle PDF Upload ─────────────────────────────────────────
  async function handleFileChange(event) {
    // event.target.files[0] is the selected file
    const file = event.target.files[0];
    if (!file) return; // user cancelled the file picker

    if (!file.name.endsWith(".pdf")) {
      setUploadMsg("❌ Please select a PDF file");
      return;
    }

    setUploading(true);
    setUploadMsg("⏳ Generating flashcards... this takes ~30 seconds");

    try {
      const result = await uploadPDF(file);
      setUploadMsg(`✅ Created ${result.total_cards} flashcards from "${result.name}"!`);

      // Refresh the decks list and stats to show the new deck
      const [newDecks, newStats] = await Promise.all([getDecks(), getStats()]);
      setDecks(newDecks);
      setStats(newStats);

    } catch (err) {
      setUploadMsg(`❌ Error: ${err.message}`);
    } finally {
      setUploading(false);
      // Reset the file input so the same file can be uploaded again if needed
      event.target.value = "";
    }
  }


  // ── Loading State ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-lg">Loading your flashcards...</div>
      </div>
    );
  }


  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">FlashCard AI</h1>
          <p className="text-gray-500 mt-1">Spaced repetition powered by FSRS</p>
        </div>

        {/* Start Review button — only shown if cards are due */}
        {dueCount > 0 && (
          <button
            onClick={onStartReview}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2"
          >
            <span>📖</span>
            <span>Review {dueCount} cards</span>
          </button>
        )}
      </div>


      {/* ── Stats Grid ────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Cards"
            value={stats.total_cards}
            emoji="📚"
            color="bg-indigo-50"
          />
          <StatCard
            label="Due Today"
            value={stats.due_today}
            emoji="📅"
            color="bg-orange-50"
          />
          <StatCard
            label="Mastered"
            value={stats.mastered}
            emoji="🏆"
            color="bg-green-50"
          />
          <StatCard
            label="Retention Rate"
            value={`${stats.retention_rate}%`}
            emoji="🧠"
            color="bg-purple-50"
          />
        </div>
      )}


      {/* ── Upload Section ────────────────────────────────────── */}
      <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center">
        <p className="text-4xl mb-3">📄</p>
        <h2 className="text-lg font-semibold text-gray-700 mb-1">Upload PDF Notes</h2>
        <p className="text-gray-400 text-sm mb-4">
          AI will generate flashcards from your notes automatically
        </p>

        {/* Hidden file input — triggered by the button below */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="hidden"   // invisible — we control it via the button
        />

        <button
          onClick={() => fileInputRef.current.click()} // open file picker
          disabled={uploading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
        >
          {uploading ? "Generating..." : "Choose PDF"}
        </button>

        {/* Upload status message */}
        {uploadMsg && (
          <p className="mt-4 text-sm text-gray-600">{uploadMsg}</p>
        )}
      </div>


      {/* ── Decks List ────────────────────────────────────────── */}
      {decks.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Decks</h2>
          <div className="space-y-3">
            {decks.map((deck) => (
              <div
                key={deck.id}
                className="bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between shadow-sm"
              >
                <div>
                  <p className="font-medium text-gray-800">{deck.name}</p>
                  <p className="text-sm text-gray-400">{deck.total_cards} cards · Created {new Date(deck.created_at).toLocaleDateString()}</p>
                </div>
                <span className="text-2xl">📖</span>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* ── Empty State (no decks yet) ────────────────────────── */}
      {decks.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-5xl mb-3">📭</p>
          <p>No decks yet. Upload a PDF to get started!</p>
        </div>
      )}

    </div>
  );
}
