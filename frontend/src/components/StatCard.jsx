export default function StatCard({ label, value, emoji, gradient = "from-indigo-500 to-purple-500" }) {
  return (
    <div className="group relative bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 overflow-hidden">
      {/* Subtle gradient accent */}
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${gradient} opacity-70 group-hover:opacity-100 transition-opacity`} />
      <span className="text-2xl">{emoji}</span>
      <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{value}</p>
      <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
