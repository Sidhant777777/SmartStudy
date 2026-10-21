// ================================================================
// App.jsx  —  Root component
// ================================================================
// Auth flow:
//   1. On load, check localStorage for "smartstudy_token"
//   2. If no token → show AuthPage (login / register)
//   3. If token exists → show main app (home / review)
//   4. Logout clears the token and returns to AuthPage
//
// Page routing (no React Router — simple state machine):
//   page = "home"   → HomePage
//   page = "review" → ReviewPage
// ================================================================

import { useState } from "react";
import AuthPage   from "./pages/AuthPage";
import HomePage   from "./pages/HomePage";
import ReviewPage from "./pages/ReviewPage";
import { clearToken } from "./api";

export default function App() {
  // Check for existing token on first render
  const [token, setToken] = useState(() => localStorage.getItem("smartstudy_token"));
  const [page, setPage]   = useState("home");

  // Called by AuthPage after successful login / register
  function handleAuth() {
    setToken(localStorage.getItem("smartstudy_token"));
    setPage("home");
  }

  // Called by HomePage logout button
  function handleLogout() {
    clearToken();
    setToken(null);
    setPage("home");
  }

  // ── Not logged in ─────────────────────────────────────────────
  if (!token) {
    return <AuthPage onAuth={handleAuth} />;
  }

  // ── Logged in ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {page === "home" && (
        <HomePage
          onStartReview={() => setPage("review")}
          onLogout={handleLogout}
        />
      )}

      {page === "review" && (
        <ReviewPage
          onFinish={() => setPage("home")}
        />
      )}

    </div>
  );
}
