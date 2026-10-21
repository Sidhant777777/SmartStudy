import { useEffect, useState } from "react";

const COLORS = ["#FF6B6B","#4ECDC4","#45B7D1","#96CEB4","#FFEAA7","#DDA0DD","#98D8C8","#F7DC6F","#FF8C42"];

export default function Confetti() {
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    const arr = Array.from({ length: 90 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: `${(Math.random() * 2.5).toFixed(2)}s`,
      duration: `${(2 + Math.random() * 2).toFixed(2)}s`,
      size: `${Math.floor(6 + Math.random() * 8)}px`,
      rotate: `${Math.floor(Math.random() * 360)}deg`,
      shape: Math.random() > 0.5 ? "50%" : "2px",
    }));
    setPieces(arr);
    const t = setTimeout(() => setPieces([]), 6000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="confetti-container">
      {pieces.map(p => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            backgroundColor: p.color,
            animationDelay: p.delay,
            animationDuration: p.duration,
            width: p.size,
            height: p.size,
            borderRadius: p.shape,
            transform: `rotate(${p.rotate})`,
          }}
        />
      ))}
    </div>
  );
}
