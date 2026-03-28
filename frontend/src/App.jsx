// ================================================================
// App.jsx
// ================================================================
// This is the ROOT component — the entry point of the entire UI.
//
// What does it do?
// ----------------
// It manages which PAGE is currently visible.
// We have 2 pages: "home" and "review"
//
// Instead of using React Router (which adds complexity),
// we use a simple "page" state variable:
//   page = "home"   → show HomePage
//   page = "review" → show ReviewPage
//
// This is called a "single page application" pattern.
// The URL doesn't change, but the UI does.
// ================================================================

import { useState } from "react";
import HomePage from "./pages/HomePage";
import ReviewPage from "./pages/ReviewPage";

export default function App() {
  // "page" controls which component is rendered
  // Start on the home page
  const [page, setPage] = useState("home");

  return (
    // min-h-screen makes the background cover the full viewport height
    <div className="min-h-screen bg-gray-50">

      {/* Render the correct page based on the "page" state */}
      {page === "home" && (
        <HomePage
          onStartReview={() => setPage("review")}
          // When user clicks "Start Review", switch to review page
        />
      )}

      {page === "review" && (
        <ReviewPage
          onFinish={() => setPage("home")}
          // When review session ends, go back to home
        />
      )}

    </div>
  );
}
