import { useState, useEffect } from "react";
import AuthPage   from "./pages/AuthPage";
import HomePage   from "./pages/HomePage";
import ReviewPage from "./pages/ReviewPage";
import SidePanel  from "./components/SidePanel";
import { clearToken } from "./api";

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("smartstudy_token"));
  const [page, setPage]   = useState("home");
  const [dark, setDark]   = useState(() => localStorage.getItem("smartstudy_dark") === "true");

  // Apply/remove dark class on <html> so Tailwind dark: classes work everywhere
  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("smartstudy_dark", dark);
  }, [dark]);

  function handleAuth() {
    setToken(localStorage.getItem("smartstudy_token"));
    setPage("home");
  }

  function handleLogout() {
    clearToken();
    setToken(null);
    setPage("home");
  }

  if (!token) {
    return <AuthPage onAuth={handleAuth} dark={dark} onToggleDark={() => setDark(d => !d)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      <SidePanel />

      {page === "home" && (
        <HomePage
          onStartReview={() => setPage("review")}
          onLogout={handleLogout}
          dark={dark}
          onToggleDark={() => setDark(d => !d)}
        />
      )}

      {page === "review" && (
        <ReviewPage
          onFinish={() => setPage("home")}
          dark={dark}
        />
      )}
    </div>
  );
}
