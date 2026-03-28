// ================================================================
// StatCard.jsx
// ================================================================
// A simple card that displays one statistic on the dashboard.
// Example: "Total Cards: 47" or "Retention Rate: 84%"
//
// This is a "presentational component" — it only displays data,
// it doesn't fetch anything or have complex logic.
// ================================================================

/**
 * @param {string} label  - The stat name, e.g. "Total Cards"
 * @param {string|number} value - The stat value, e.g. 47 or "84%"
 * @param {string} emoji  - Icon to display, e.g. "📚"
 * @param {string} color  - Tailwind color class for the accent
 */
export default function StatCard({ label, value, emoji, color = "bg-indigo-50" }) {
  return (
    <div className={`${color} rounded-2xl p-5 flex flex-col gap-2`}>
      <span className="text-2xl">{emoji}</span>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}
