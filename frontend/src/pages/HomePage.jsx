import { useState, useEffect, useRef } from "react";
import {
  uploadPDF, getDecks, getStats, getDueCards,
  deleteDeck, getNotifyEmail, saveNotifyEmail,
  getStreak, getHeatmap, getForecast, getTopicAccuracy,
  getReminderTime, saveReminderTime,
} from "../api";
import StatCard from "../components/StatCard";
import WelcomeModal from "../components/WelcomeModal";
import Heatmap from "../components/Heatmap";

export default function HomePage({ onStartReview, onLogout }) {
  const [stats, setStats]             = useState(null);
  const [decks, setDecks]             = useState([]);
  const [dueCount, setDueCount]       = useState(0);
  const [uploading, setUploading]     = useState(false);
  const [uploadMsg, setUploadMsg]     = useState("");
  const [loading, setLoading]         = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);

  // Notification settings
  const [notifyEmail, setNotifyEmail]     = useState("");
  const [emailSaved, setEmailSaved]       = useState(false);
  const [emailSaving, setEmailSaving]     = useState(false);
  const [reminderTime, setReminderTime]   = useState("08:00");
  const [timeSaved, setTimeSaved]         = useState(false);
  const [timeSaving, setTimeSaving]       = useState(false);

  // New feature data
  const [streak, setStreak]       = useState(0);
  const [heatmap, setHeatmap]     = useState([]);
  const [forecast, setForecast]   = useState([]);
  const [topics, setTopics]       = useState([]);

  const fileInputRef = useRef(null);

  useEffect(() => {
    const seen = localStorage.getItem("smartstudy_welcomed");
    if (!seen) setShowWelcome(true);

    async function loadData() {
      try {
        const [statsData, decksData, dueCards, emailData, streakData,
               heatmapData, forecastData, topicsData, rtData] = await Promise.all([
          getStats(), getDecks(), getDueCards(), getNotifyEmail(),
          getStreak(), getHeatmap(), getForecast(), getTopicAccuracy(), getReminderTime(),
        ]);
        setStats(statsData);
        setDecks(decksData);
        setDueCount(dueCards.length);
        setNotifyEmail(emailData.email || "");
        setStreak(streakData.streak || 0);
        setHeatmap(heatmapData);
        setForecast(forecastData);
        setTopics(topicsData);
        setReminderTime(rtData.time || "08:00");
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

  async function handleSaveTime(e) {
    e.preventDefault();
    setTimeSaving(true);
    try {
      await saveReminderTime(reminderTime);
      setTimeSaved(true);
      setTimeout(() => setTimeSaved(false), 3000);
    } catch (err) {
      alert("Failed to save time: " + err.message);
    } finally {
      setTimeSaving(false);
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

  async function handleFileChange(event) {
    const file = event.target.files[0];
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
      event.target.value = "";
    }
  }

  // ── Forecast bar chart helpers ────────────────────────────────
  const maxForecast = Math.max(...forecast.map(f => f.count), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-lg">Loading your flashcards...</div>
      </div>
    );
  }

  return (
    <>
      {showWelcome && <WelcomeModal onClose={handleCloseWelcome} />}

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* ── Header with Streak ── */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">SmartStudy</h1>
            <p className="text-gray-500 mt-1">Spaced repetition powered by FSRS</p>
          </div>
          <div className="flex items-center gap-3">
            {streak > 0 && (
              <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 px-4 py-2 rounded-xl font-semibold">
                <span className="text-xl">🔥</span>
                <span>{streak}-day streak!</span>
              </div>
            )}
            {dueCount > 0 && (
              <button
                onClick={onStartReview}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2"
              >
                <span>📖</span>
                <span>Review {dueCount} cards</span>
              </button>
            )}
            <button
              onClick={onLogout}
              className="text-sm text-gray-400 hover:text-gray-600 border border-gray-200 px-4 py-2 rounded-xl transition-colors"
              title="Log out"
            >
              Log out
            </button>
          </div>
        </div>

        {/* ── Stats Grid ── */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Cards" value={stats.total_cards}          emoji="📚" color="bg-indigo-50" />
            <StatCard label="Due Today"   value={stats.due_today}            emoji="📅" color="bg-orange-50" />
            <StatCard label="Mastered"    value={stats.mastered}             emoji="🏆" color="bg-green-50"  />
            <StatCard label="Retention"   value={`${stats.retention_rate}%`} emoji="🧠" color="bg-purple-50" />
          </div>
        )}

        {/* ── Study Heatmap ── */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">🗓️ Study Activity</h2>
          <Heatmap data={heatmap} />
        </div>

        {/* ── Upcoming Review Forecast ── */}
        {forecast.length > 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">📅 Upcoming Reviews (next 14 days)</h2>
            <div className="flex items-end gap-1 h-24">
              {forecast.map(({ date, count }) => {
                const label = new Date(date + "T00:00:00").toLocaleDateString("en", { month: "short", day: "numeric" });
                const pct   = Math.round((count / maxForecast) * 100);
                return (
                  <div key={date} className="flex-1 flex flex-col items-center gap-1" title={`${label}: ${count} cards`}>
                    <p className="text-xs text-gray-500 font-medium">{count}</p>
                    <div
                      className="w-full bg-indigo-400 rounded-t-md transition-all"
                      style={{ height: `${Math.max(pct, 4)}%`, minHeight: "4px" }}
                    />
                    <p className="text-[9px] text-gray-400 rotate-45 origin-left mt-1 whitespace-nowrap">{label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Per-Topic Accuracy ── */}
        {topics.length > 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">📊 Topic Accuracy</h2>
            <div className="space-y-3">
              {topics.map(t => (
                <div key={t.topic}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 font-medium truncate">{t.topic}</span>
                    <span className="text-gray-500 ml-4 shrink-0">
                      {t.accuracy !== null ? `${t.accuracy}%` : "—"} · {t.card_count} cards
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        t.accuracy >= 80 ? "bg-green-500" :
                        t.accuracy >= 60 ? "bg-yellow-400" : "bg-red-400"
                      }`}
                      style={{ width: `${t.accuracy || 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── How it Works ── */}
        <div className="bg-indigo-50 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-indigo-900 mb-4">How it works</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📄</span>
              <div>
                <p className="font-semibold text-gray-800 text-sm">1. Upload your PDF</p>
                <p className="text-gray-500 text-xs mt-1">AI reads your notes and generates flashcards automatically</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔁</span>
              <div>
                <p className="font-semibold text-gray-800 text-sm">2. Review cards daily</p>
                <p className="text-gray-500 text-xs mt-1">Rate 1–4 and FSRS schedules your next review at the perfect time</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">📈</span>
              <div>
                <p className="font-semibold text-gray-800 text-sm">3. Track your progress</p>
                <p className="text-gray-500 text-xs mt-1">Watch retention climb as you consistently review — fight the forgetting curve</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Upload Section ── */}
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center">
          <p className="text-4xl mb-3">📄</p>
          <h2 className="text-lg font-semibold text-gray-700 mb-1">Upload PDF Notes</h2>
          <p className="text-gray-400 text-sm mb-4">AI will generate flashcards from your notes automatically</p>
          <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
          <button
            onClick={() => fileInputRef.current.click()}
            disabled={uploading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
          >
            {uploading ? "Generating..." : "Choose PDF"}
          </button>
          {uploadMsg && <p className="mt-4 text-sm text-gray-600">{uploadMsg}</p>}
        </div>

        {/* ── Notification Settings ── */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-5">
          <h2 className="text-lg font-semibold text-gray-800">📬 Daily Reminders</h2>

          {/* Email */}
          <div>
            <p className="text-sm text-gray-500 mb-2">Email address to receive reminders</p>
            <form onSubmit={handleSaveEmail} className="flex gap-3">
              <input
                type="email" value={notifyEmail}
                onChange={e => setNotifyEmail(e.target.value)}
                placeholder="you@example.com" required
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <button
                type="submit" disabled={emailSaving}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                {emailSaving ? "Saving..." : emailSaved ? "✓ Saved!" : "Save"}
              </button>
            </form>
          </div>

          {/* Reminder time */}
          <div>
            <p className="text-sm text-gray-500 mb-2">⏰ Reminder time</p>
            <form onSubmit={handleSaveTime} className="flex gap-3">
              <input
                type="time" value={reminderTime}
                onChange={e => setReminderTime(e.target.value)}
                required
                className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <button
                type="submit" disabled={timeSaving}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                {timeSaving ? "Saving..." : timeSaved ? "✓ Saved!" : "Set time"}
              </button>
            </form>
          </div>
        </div>

        {/* ── Decks List ── */}
        {decks.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Decks</h2>
            <div className="space-y-3">
              {decks.map(deck => (
                <div key={deck.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="font-medium text-gray-800">{deck.name}</p>
                    <p className="text-sm text-gray-400">{deck.total_cards} cards · Created {new Date(deck.created_at).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteDeck(deck.id, deck.name)}
                    className="text-gray-300 hover:text-red-500 transition-colors text-xl ml-4"
                    title="Delete deck"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {decks.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-5xl mb-3">📭</p>
            <p>No decks yet. Upload a PDF to get started!</p>
          </div>
        )}

      </div>
    </>
  );
}
