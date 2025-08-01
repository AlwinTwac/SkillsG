import React from "react";
import CircuitLinesFaint from "./CircuitLinesFaint";

// Combination of animated SVG circuit lines, glassmorphism blobs, and aurora sweep
const HeroBannerOverlay: React.FC = () => (
  <div className="hero-banner-overlay pointer-events-none absolute inset-0 w-full h-full z-10 overflow-hidden">
    {/* Animated Faint Circuit Lines */}
    <CircuitLinesFaint />

    {/* Aurora Gradient Sweep */}
    <div className="aurora-gradient absolute left-0 top-0 w-full h-full" />

    {/* Glassmorphism Blobs */}
    <svg width="100%" height="100%" viewBox="0 0 1440 320" className="absolute left-0 top-0 w-full h-full">
      <ellipse cx="320" cy="200" rx="180" ry="60" fill="#818cf8" opacity="0.17" filter="url(#blur1)" />
      <ellipse cx="1200" cy="140" rx="120" ry="40" fill="#a5b4fc" opacity="0.13" filter="url(#blur2)" />
      <defs>
        <filter id="blur1">
          <feGaussianBlur stdDeviation="30" />
        </filter>
        <filter id="blur2">
          <feGaussianBlur stdDeviation="20" />
        </filter>
      </defs>
    </svg>
  </div>
);

export default HeroBannerOverlay;
