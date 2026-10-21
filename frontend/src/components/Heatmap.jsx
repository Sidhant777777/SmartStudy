import { useState } from "react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_LABELS = ["","Mon","","Wed","","Fri",""];

function getColor(count) {
  if (!count || count === 0) return "#ebedf0";
  if (count < 4)  return "#9be9a8";
  if (count < 8)  return "#40c463";
  if (count < 15) return "#30a14e";
  return "#216e39";
}

export default function Heatmap({ data = [] }) {
  const [tooltip, setTooltip] = useState(null);

  const dateMap = {};
  data.forEach(({ date, count }) => { dateMap[date] = count; });

  // Build 26 weeks starting from a Sunday ~26 weeks ago
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - today.getDay() - 25 * 7);

  const weeks = [];
  for (let w = 0; w < 26; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dt = new Date(startDate);
      dt.setDate(startDate.getDate() + w * 7 + d);
      const dateStr = dt.toISOString().split("T")[0];
      week.push({ date: dateStr, count: dateMap[dateStr] || 0, d: dt });
    }
    weeks.push(week);
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "inline-flex", gap: "2px", alignItems: "flex-start" }}>
        {/* Day labels */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginRight: "2px", marginTop: "20px" }}>
          {DAY_LABELS.map((lbl, i) => (
            <div key={i} style={{ height: "11px", fontSize: "9px", color: "#999", lineHeight: "11px", width: "20px" }}>
              {lbl}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* Month labels */}
          <div style={{ display: "flex", gap: "2px", height: "16px", marginBottom: "2px" }}>
            {weeks.map((week, wi) => {
              const first = week[0].d;
              const show = wi === 0 || first.getDate() <= 7;
              return (
                <div key={wi} style={{ width: "11px", fontSize: "9px", color: "#999", textAlign: "left", whiteSpace: "nowrap" }}>
                  {show ? MONTHS[first.getMonth()] : ""}
                </div>
              );
            })}
          </div>
          {/* Cells */}
          <div style={{ display: "flex", gap: "2px" }}>
            {weeks.map((week, wi) => (
              <div key={wi} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                {week.map(({ date, count }) => (
                  <div
                    key={date}
                    title={`${date}: ${count} reviews`}
                    style={{
                      width: "11px", height: "11px",
                      borderRadius: "2px",
                      backgroundColor: getColor(count),
                      cursor: "default",
                    }}
                    onMouseEnter={() => setTooltip({ date, count })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {tooltip && (
        <p style={{ fontSize: "11px", color: "#555", marginTop: "4px" }}>
          {tooltip.date}: <strong>{tooltip.count}</strong> reviews
        </p>
      )}

      <div style={{ display: "flex", gap: "4px", alignItems: "center", marginTop: "6px", fontSize: "10px", color: "#999" }}>
        <span>Less</span>
        {["#ebedf0","#9be9a8","#40c463","#30a14e","#216e39"].map(c => (
          <div key={c} style={{ width: "10px", height: "10px", borderRadius: "2px", backgroundColor: c }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
