import React from "react";

/**
 * Animated circular K.G logo with indigo/metallic theme and electronics/computer engineering accents.
 * Uses SVG and CSS animation for lightweight performance.
 */
interface LogoAnimationProps {
  size?: number;
}

export default function LogoAnimation({ size = 90 }: LogoAnimationProps) {
  // Add padding so nothing is cut off
  const padding = size * 0.18;
  const svgSize = size + padding * 2;
  const center = svgSize / 2;
  const globeRadius = size * 0.42;
  const orbitRadius1 = size * 0.48;
  const orbitRadius2 = size * 0.57;
  const satelliteSize = size * 0.10;
  return (
    <div className="logo-globe" style={{ width: svgSize, height: svgSize, display: 'block', position: 'relative' }}>
      <svg
        width={svgSize}
        height={svgSize}
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block' }}
      >
        {/* Globe */}
        <circle
          cx={center}
          cy={center}
          r={globeRadius}
          fill="url(#globeGradient)"
          stroke="#6366f1"
          strokeWidth={size*0.025}
          filter="url(#globeShadow)"
        />
        {/* K.G Text */}
        <g filter="url(#flicker)">
          <text
            x={center}
            y={center + size*0.08}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={size*0.33}
            fontWeight="bold"
            fill="#c7d2fe"
            className="logo-flicker"
            style={{
              filter: 'drop-shadow(0 0 3px #6366f1)',
              animation: 'logoPulse 1.5s infinite',
            }}
          >K.G</text>
        </g>
        {/* Orbit 1 */}
        <g className="orbit orbit1">
          <style>{`
        @keyframes orbit1 {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes orbit2 {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(-360deg); }
        }
        @keyframes logoPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .logo-globe .orbit1 {
          transform-box: fill-box;
          transform-origin: 50% 50%;
          animation: orbit1 4s linear infinite;
        }
        .logo-globe .orbit2 {
          transform-box: fill-box;
          transform-origin: 50% 50%;
          animation: orbit2 6s linear infinite;
        }
      `}</style>
          <ellipse
            cx={center}
            cy={center}
            rx={orbitRadius1}
            ry={globeRadius*0.72}
            stroke="#818cf8"
            strokeWidth={size*0.012}
            fill="none"
            style={{ opacity: 0.7 }}
          />
          <circle
            cx={center + orbitRadius1}
            cy={center}
            r={satelliteSize}
            fill="#818cf8"
            stroke="#fff"
            strokeWidth={size*0.01}
            className="satellite1"
          />
        </g>
        {/* Orbit 2 */}
        <g className="orbit orbit2">
          <ellipse
            cx={center}
            cy={center}
            rx={orbitRadius2}
            ry={globeRadius*0.55}
            stroke="#a5b4fc"
            strokeWidth={size*0.009}
            fill="none"
            style={{ opacity: 0.5 }}
          />
          <circle
            cx={center - orbitRadius2}
            cy={center}
            r={satelliteSize*0.8}
            fill="#a5b4fc"
            stroke="#fff"
            strokeWidth={size*0.008}
            className="satellite2"
          />
        </g>
        <defs>
          <radialGradient id="globeGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#18182b" />
          </radialGradient>
          <filter id="globeShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#6366f1" floodOpacity="0.5" />
          </filter>
          <filter id="flicker">
            <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" result="turb" seed="2" />
            <feDisplacementMap in2="turb" in="SourceGraphic" scale="2" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
    </div>
  );
};
