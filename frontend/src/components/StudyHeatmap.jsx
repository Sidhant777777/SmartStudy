import { useEffect, useState } from "react";

const BASE_URL = import.meta.env.VITE_API_URL || "https://smartstudy-backend-x6mo.onrender.com";

export default function StudyHeatmap() {
  const [data, setData] = useState({});
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("smartstudy_token");
    fetch(`${BASE_URL}/stats/heatmap`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(rows => {
        const map = {};
        rows.forEach(r => { map[r.date] = r.count; });
        setData(map);
      })
      .catch(() => {});
  }, []);

  // Build last 26 weeks of dates (like GitHub: Sun→Sat columns)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start from the Sunday 26 weeks ago
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 26 * 7);
  startDate.setDate(startDate.getDate() - startDate.getDay()); // back to Sunday

  const weeks = [];
  let current = new Date(startDate);
  while (current <= today) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = current.toISOString().split("T")[0];
      const isFuture = current > today;
      week.push({ date: dateStr, count: isFuture ? null : (data[dateStr] || 0), isFuture });
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
  }

  function getColor(count) {
    if (count === null) return "bg-transparent";
    if (count === 0)   return "bg-gray-100 dark:bg-gray-800";
    if (count < 5)     return "bg-indigo-200 dark:bg-indigo-900";
    if (count < 15)    return "bg-indigo-400 dark:bg-indigo-600";
    if (count < 30)    return "bg-indigo-600 dark:bg-indigo-400";
    return "bg-indigo-800 dark:bg-indigo-300";
  }

  const months = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const m = new Date(week[0].date).getMonth();
    if (m !== lastMonth) {
      months.push({ label: new Date(week[0].date).toLocaleString("default", { month: "short" }), col: wi });
      lastMonth = m;
    }
  });

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
      <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-4">📅 Study Activity</h2>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Month labels */}
          <div className="flex mb-1 ml-8">
            {weeks.map((_, wi) => {
              const m = months.find(m => m.col === wi);
              return (
                <div key={wi} className="w-4 mr-1 text-xs text-gray-400 dark:text-gray-500 shrink-0">
                  {m ? m.label : ""}
                </div>
              );
            })}
          </div>

          <div className="flex gap-0">
            {/* Day labels */}
            <div className="flex flex-col mr-1">
              {days.map((d, i) => (
                <div key={d} className={`h-4 mb-1 text-xs text-gray-400 dark:text-gray-500 leading-4 w-7 shrink-0 ${i % 2 === 0 ? "invisible" : ""}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* Grid */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col mr-1">
                {week.map((day, di) => (
                  <div
                    key={di}
                    className={`w-4 h-4 mb-1 rounded-sm cursor-default transition-opacity ${getColor(day.count)} ${day.isFuture ? "opacity-0" : "opacity-100"}`}
                    onMouseEnter={(e) => {
                      if (day.count !== null) {
                        setTooltip({ date: day.date, count: day.count, x: e.clientX, y: e.clientY });
                      }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-1 mt-2 ml-8">
            <span className="text-xs text-gray-400 dark:text-gray-500 mr-1">Less</span>
            {["bg-gray-100 dark:bg-gray-800", "bg-indigo-200 dark:bg-indigo-900", "bg-indigo-400 dark:bg-indigo-600", "bg-indigo-600 dark:bg-indigo-400", "bg-indigo-800 dark:bg-indigo-300"].map((c, i) => (
              <div key={i} className={`w-4 h-4 rounded-sm ${c}`} />
            ))}
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">More</span>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded-lg pointer-events-none shadow-lg"
          style={{ left: tooltip.x + 10, top: tooltip.y - 30 }}
        >
          {tooltip.count === 0 ? "No reviews" : `${tooltip.count} review${tooltip.count > 1 ? "s" : ""}`} · {tooltip.date}
        </div>
      )}
    </div>
  );
}
