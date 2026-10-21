import { useState, useEffect, useRef } from "react";
import { uploadPDF, getDecks, getStats, getDueCards, deleteDeck, getNotifyEmail, saveNotifyEmail } from "../api";
import StatCard from "../components/StatCard";
import WelcomeModal from "../components/WelcomeModal";

export default function HomePage({ onStartReview, onLogout, dark, onToggleDark }) {
  const [stats, setStats]             = useState(null);
  const [decks, setDecks]             = useState([]);
  const [dueCount, setDueCount]       = useState(0);
  const [uploading, setUploading]     = useState(false);
  const [uploadMsg, setUploadMsg]     = useState("");
  const [loading, setLoading]         = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [emailSaved, setEmailSaved]   = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [dragOver, setDragOver]       = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const seen = localStorage.getItem("smartstudy_welcomed");
    if (!seen) setShowWelcome(true);

    async function loadData() {
      try {
        const [statsData, decksData, dueCards, emailData] = await Promise.all([
          getStats(), getDecks(), getDueCards(), getNotifyEmail(),
        ]);
        setStats(statsData);
        setDecks(decksData);
        setDueCount(dueCards.length);
        setNotifyEmail(emailData.email || "");
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  function handleCloseWelcome() {
    localStorage.setItem("smartstudy_welcomed", "true");
    setShowWelcome(false);
  }

  async function handleSaveEmail(e) {
    e.preventDefault();
    setEmailSaving(true);
    try {
      await saveNotifyEmail(notifyEmail);
      setEmailSaved(true);
      setTimeout(() => setEmailSaved(false), 3000);
    } catch (err) {
      alert("Failed to save email: " + err.message);
    } finally {
      setEmailSaving(false);
    }
  }

  async function handleDeleteDeck(deckId, deckName) {
    if (!window.confirm(`Delete "${deckName}" and all its cards?`)) return;
    try {
      await deleteDeck(deckId);
      const [newDecks, newStats, dueCards] = await Promise.all([getDecks(), getStats(), getDueCards()]);
      setDecks(newDecks);
      setStats(newStats);
      setDueCount(dueCards.length);
    } catch (err) {
      alert("Failed to delete deck: " + err.message);
    }
  }

  async function processFile(file) {
    if (!file) return;
    if (!file.name.endsWith(".pdf")) { setUploadMsg("❌ Please select a PDF file"); return; }
    setUploading(true);
    setUploadMsg("⏳ Generating flashcards… this takes ~30 seconds");
    try {
      const result = await uploadPDF(file);
      setUploadMsg(`✅ Created ${result.total_cards} flashcards from "${result.name}"!`);
      const [newDecks, newStats] = await Promise.all([getDecks(), getStats()]);
      setDecks(newDecks);
      setStats(newStats);
    } catch (err) {
      setUploadMsg(`❌ Error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleFileChange(event) {
    await processFile(event.target.files[0]);
    event.target.value = "";
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading your flashcards...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {showWelcome && <WelcomeModal onClose={handleCloseWelcome} />}

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-lg shadow-sm">🧠</div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">SmartStudy</h1>
            </div>
            <p className="text-gray-400 dark:text-gray-500 text-sm ml-12">Spaced repetition powered by FSRS</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            <button
              onClick={onToggleDark}
              className="w-9 h-9 rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-center text-base hover:scale-110 transition-transform"
            >
              {dark ? "☀️" : "🌙"}
            </button>

            {dueCount > 0 && (
              <button
                onClick={onStartReview}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 shadow-md shadow-indigo-200 dark:shadow-indigo-900 hover:-translate-y-0.5 flex items-center gap-2 text-sm"
              >
                <span>📖</span>
                <span>Review {dueCount} cards</span>
              </button>
            )}

            <button
              onClick={onLogout}
              className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-700 px-3 py-2.5 rounded-xl transition-colors bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Log out
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Cards" value={stats.total_cards} emoji="📚" gradient="from-indigo-500 to-purple-500" />
            <StatCard label="Due Today"   value={stats.due_today}   emoji="📅" gradient="from-orange-400 to-red-500" />
            <StatCard label="Mastered"    value={stats.mastered}    emoji="🏆" gradient="from-green-400 to-emerald-500" />
            <StatCard label="Retention"   value={`${stats.retention_rate}%`} emoji="🧠" gradient="from-blue-400 to-cyan-500" />
          </div>
        )}

        {/* How it works */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-3xl p-6 border border-indigo-100 dark:border-indigo-900">
          <h2 className="text-base font-semibold text-indigo-900 dark:text-indigo-300 mb-4">How it works</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: "📄", title: "1. Upload your PDF", desc: "AI reads your notes and generates flashcards automatically" },
              { icon: "🔁", title: "2. Review cards daily", desc: "Rate 1–4 and FSRS schedules your next review at the perfect time" },
              { icon: "📈", title: "3. Track your progress", desc: "Watch retention climb as you consistently review" },
            ].map(item => (
              <div key={item.title} className="flex items-start gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{item.title}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upload */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`
            rounded-3xl p-10 text-center border-2 border-dashed transition-all duration-200 cursor-pointer
            ${dragOver
              ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 scale-[1.01]"
              : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            }
          `}
          onClick={() => !uploading && fileInputRef.current.click()}
        >
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
            📄
          </div>
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-1">
            {uploading ? "Generating flashcards..." : "Upload PDF Notes"}
          </h2>
          <p className="text-gray-400 dark:text-gray-500 text-sm mb-5">
            {dragOver ? "Drop it here!" : "Drag & drop or click to choose a PDF"}
          </p>
          <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
          <button
            onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }}
            disabled={uploading}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-60 text-white px-6 py-2.5 rounded-xl font-medium transition-all duration-200 shadow-md shadow-indigo-200 dark:shadow-indigo-900 hover:-translate-y-0.5"
          >
            {uploading ? "Generating..." : "Choose PDF"}
          </button>
          {uploadMsg && (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 animate-fade-in">{uploadMsg}</p>
          )}
        </div>

        {/* Email Notifications */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-1">📬 Daily Reminders</h2>
          <p className="text-gray-400 dark:text-gray-500 text-sm mb-4">Get an email at 8 AM when you have cards due.</p>
          <form onSubmit={handleSaveEmail} className="flex gap-3">
            <input
              type="email"
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent placeholder-gray-300 dark:placeholder-gray-600 transition-all"
            />
            <button
              type="submit"
              disabled={emailSaving}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm"
            >
              {emailSaving ? "Saving..." : emailSaved ? "✓ Saved!" : "Save"}
            </button>
          </form>
        </div>

        {/* Decks */}
        {decks.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Your Decks</h2>
            <div className="space-y-3">
              {decks.map((deck) => (
                <div
                  key={deck.id}
                  className="group bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-900 transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 rounded-xl flex items-center justify-center text-lg">📚</div>
                    <div>
                      <p className="font-medium text-gray-800 dark:text-white text-sm">{deck.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{deck.total_cards} cards · {new Date(deck.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteDeck(deck.id, deck.name)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-all text-lg"
                    title="Delete deck"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {decks.length === 0 && (
          <div className="text-center py-16 text-gray-400 dark:text-gray-600">
            <p className="text-6xl mb-4">📭</p>
            <p className="font-medium">No decks yet</p>
            <p className="text-sm mt-1">Upload a PDF above to get started</p>
          </div>
        )}

      </div>
    </>
  );
}
