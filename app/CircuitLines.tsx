import React from "react";

// Animated SVG circuit lines: current flows left to right, mild ember/green
const LINES = [
  { y: 60, color: "#a3ffb0" },
  { y: 110, color: "#c6ffb3" },
  { y: 160, color: "#baffc9" },
  { y: 210, color: "#eaffd0" },
  { y: 260, color: "#9effbe" },
  { y: 310, color: "#d4ffb2" },
];

const CircuitLines: React.FC = () => (
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 1440 400"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="absolute left-0 top-0 w-full h-full pointer-events-none z-20"
    style={{ filter: "drop-shadow(0 0 16px #a3ffb0) drop-shadow(0 0 24px #8affb3)" }}
  >
    {LINES.map((line, i) => (
      <g key={i}>
        <path
          d={`M-100,${line.y} C 200,${line.y-30} 600,${line.y+30} 1000,${line.y} S 1600,${line.y-40} 1540,${line.y}`}
          stroke={line.color}
          strokeWidth="4"
          fill="none"
          opacity="0.82"
          className={`circuit-anim circuit-anim-${i}`}
        />
        {/* Current dots */}
        {[0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map((t, j) => (
          <circle
            key={j}
            r="7"
            fill="#d1ffb3"
            opacity="0.85"
            className={`circuit-dot circuit-dot-${i}`}
            style={{
              animationDelay: `${t * 4}s`,
              animationDuration: "4s",
              animationIterationCount: "infinite",
            }}
          >
            <animateMotion
              dur="4s"
              repeatCount="indefinite"
              keyPoints="0;1"
              keyTimes="0;1"
              calcMode="linear"
              path={`M-100,${line.y} C 200,${line.y-30} 600,${line.y+30} 1000,${line.y} S 1600,${line.y-40} 1540,${line.y}`}
              fill="freeze"
            />
          </circle>
        ))}
      </g>
    ))}
  </svg>
);

export default CircuitLines;
