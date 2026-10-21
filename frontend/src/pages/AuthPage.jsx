// ================================================================
// AuthPage.jsx
// ================================================================
// Login / Register page shown when the user has no JWT token.
//
// How it works:
// - Toggle between "Login" and "Register" mode with one button
// - On submit: call register() or login() from api.js
// - Both functions store the token in localStorage automatically
// - Then call onAuth() so App.jsx switches to the main app
// ================================================================

import { useState } from "react";
import { login, register } from "../api";

/**
 * @param {Function} onAuth - Called after successful login/register
 */
export default function AuthPage({ onAuth }) {
  const [mode, setMode]         = useState("login"); // "login" | "register"
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
        if (password.length < 6) {
          setError("Password must be at least 6 characters");
          return;
        }
        await register(email, password);
      } else {
        await login(email, password);
      }
      // Token is now in localStorage — tell App.jsx we're logged in
      onAuth();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* ── Logo / Title ── */}
        <div className="text-center mb-8">
          <p className="text-5xl mb-3">🧠</p>
          <h1 className="text-3xl font-bold text-gray-900">SmartStudy</h1>
          <p className="text-gray-500 mt-1 text-sm">Spaced repetition powered by FSRS</p>
        </div>

        {/* ── Card ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>

          {/* ── Error banner ── */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === "register" ? "At least 6 characters" : "Your password"}
                required
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white py-2.5 rounded-xl font-semibold transition-colors mt-2"
            >
              {loading
                ? (mode === "login" ? "Logging in..." : "Creating account...")
                : (mode === "login" ? "Log in" : "Create account")}
            </button>
          </form>

          {/* ── Toggle mode ── */}
          <p className="text-center text-sm text-gray-500 mt-6">
            {mode === "login" ? (
              <>Don't have an account?{" "}
                <button
                  onClick={() => { setMode("register"); setError(""); }}
                  className="text-indigo-600 hover:underline font-medium"
                >
                  Sign up free
                </button>
              </>
            ) : (
              <>Already have an account?{" "}
                <button
                  onClick={() => { setMode("login"); setError(""); }}
                  className="text-indigo-600 hover:underline font-medium"
                >
                  Log in
                </button>
              </>
            )}
          </p>
        </div>

        {/* ── Privacy note ── */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Your data is private and belongs only to you. 🔒
        </p>

      </div>
    </div>
  );
}
