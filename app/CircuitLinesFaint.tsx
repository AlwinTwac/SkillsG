import React from "react";

// Faint, transparent, lazy sine wave circuit lines with subtle current dots
const LINES = [
  { y: 50, color: "#a3ffb0", opacity: 0.12, duration: 8, delays: [0, 0.18, 0.39] },
  { y: 80, color: "#baffc9", opacity: 0.10, duration: 9, delays: [0.2, 0.38, 0.71] },
  { y: 110, color: "#eaffd0", opacity: 0.09, duration: 7.5, delays: [0.1, 0.5, 0.79] },
  { y: 140, color: "#9effbe", opacity: 0.13, duration: 8.7, delays: [0.05, 0.33, 0.6] },
  { y: 170, color: "#a3ffb0", opacity: 0.11, duration: 10, delays: [0.3, 0.62, 0.81] },
  { y: 200, color: "#baffc9", opacity: 0.10, duration: 8.3, delays: [0.13, 0.42, 0.77] },
  { y: 230, color: "#eaffd0", opacity: 0.09, duration: 9.5, delays: [0.22, 0.53, 0.78] },
  { y: 260, color: "#9effbe", opacity: 0.12, duration: 11, delays: [0.11, 0.41, 0.79] },
];

function getPath(y: number) {
  // Sine wave path
  return `M-100,${y} Q 120,${y-30} 240,${y} T 480,${y} T 720,${y} T 960,${y} T 1200,${y} T 1440,${y}`;
}

const CircuitLinesFaint: React.FC = () => (
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 1440 320"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="absolute left-0 top-0 w-full h-full pointer-events-none z-20"
    style={{ filter: "drop-shadow(0 0 8px #a3ffb0)" }}
  >
    {LINES.map((line, i) => (
      <g key={i}>
        <path
          d={getPath(line.y)}
          stroke={line.color}
          strokeWidth="3.5"
          fill="none"
          opacity={line.opacity}
        />
        {/* Faint current dots, lazy pulse with unique timings */}
        {line.delays.map((delay, j) => (
          <circle
            key={j}
            r="6"
            fill="#baffc9"
            opacity="0.19"
            className={`circuit-dot-faint circuit-dot-faint-${i}`}
            style={{
              animationDelay: `${delay * line.duration}s`,
              animationDuration: `${line.duration}s`,
              animationIterationCount: "infinite",
            }}
          >
            <animateMotion
              dur={`${line.duration}s`}
              repeatCount="indefinite"
              keyPoints="0;1"
              keyTimes="0;1"
              calcMode="linear"
              path={getPath(line.y)}
              fill="freeze"
            />
          </circle>
        ))}
      </g>
    ))}
  </svg>
);

export default CircuitLinesFaint;
