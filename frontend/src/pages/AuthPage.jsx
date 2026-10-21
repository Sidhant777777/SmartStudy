import { useState } from "react";
import { login, register } from "../api";

export default function AuthPage({ onAuth, dark, onToggleDark }) {
  const [mode, setMode]         = useState("login");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "register") {
        if (password.length < 6) { setError("Password must be at least 6 characters"); setLoading(false); return; }
        await register(email, password);
      } else {
        await login(email, password);
      }
      onAuth();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 flex items-center justify-center px-4 relative transition-colors duration-300">

      {/* Dark mode toggle */}
      <button
        onClick={onToggleDark}
        className="absolute top-5 right-5 w-10 h-10 rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-center text-lg hover:scale-110 transition-transform"
      >
        {dark ? "☀️" : "🌙"}
      </button>

      <div className="w-full max-w-sm animate-fade-in">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg shadow-indigo-200 dark:shadow-indigo-900">
            🧠
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">SmartStudy</h1>
          <p className="text-gray-400 mt-1 text-sm">Spaced repetition powered by FSRS</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl shadow-gray-100/80 dark:shadow-black/30 border border-gray-100 dark:border-gray-800 p-8">

          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6 text-center">
            {mode === "login" ? "Welcome back 👋" : "Start learning smarter"}
          </h2>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-2xl px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent placeholder-gray-300 dark:placeholder-gray-600 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === "register" ? "At least 6 characters" : "Your password"}
                required
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent placeholder-gray-300 dark:placeholder-gray-600 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-60 text-white py-3 rounded-2xl font-semibold transition-all duration-200 shadow-md shadow-indigo-200 dark:shadow-indigo-900 hover:shadow-lg hover:shadow-indigo-300 dark:hover:shadow-indigo-800 hover:-translate-y-0.5 active:translate-y-0 mt-2"
            >
              {loading
                ? (mode === "login" ? "Logging in..." : "Creating account...")
                : (mode === "login" ? "Log in" : "Create account")}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-6">
            {mode === "login" ? (
              <>Don't have an account?{" "}
                <button onClick={() => { setMode("register"); setError(""); }} className="text-indigo-500 hover:text-indigo-600 font-semibold transition-colors">Sign up free</button>
              </>
            ) : (
              <>Already have an account?{" "}
                <button onClick={() => { setMode("login"); setError(""); }} className="text-indigo-500 hover:text-indigo-600 font-semibold transition-colors">Log in</button>
              </>
            )}
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Your data is private and belongs only to you 🔒
        </p>
      </div>
    </div>
  );
}
