import React, { useState, useEffect } from "react";

interface FeatureCardProps {
  service: {
    title: string;
    desc: string;
    icon: React.ReactNode;
    extra?: React.ReactNode;
  };
  isTopTrending?: boolean;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ service, isTopTrending }) => {
  const [loading, setLoading] = useState(isTopTrending);
  useEffect(() => {
    if (isTopTrending) {
      const t = setTimeout(() => setLoading(false), 1500);
      return () => clearTimeout(t);
    }
  }, [isTopTrending]);

  return (
    <div className={`feature-card glass-circuit-card shadow-2xl p-7 flex flex-col items-center hover:scale-[1.07] transition-transform duration-300 relative group ${isTopTrending ? "top-trending-card" : ""}`}
      style={{
        background: 'rgba(30, 41, 59, 0.55)',
        border: '1.5px solid #60a5fa88',
        boxShadow: '0 8px 32px #60a5fa33, 0 2px 16px #23234a55',
        borderRadius: '2.2rem',
        overflow: 'visible',
      }}
    >
      {/* Futuristic animated circuit lines background */}
      <svg className="absolute left-0 top-0 w-full h-full z-0 opacity-30 pointer-events-none" viewBox="0 0 300 180" fill="none">
        <rect x="10" y="10" width="280" height="160" rx="32" stroke="#4F8EF7" strokeWidth="2" />
        <path d="M30 30 Q150 90 270 30" stroke="#60a5fa" strokeWidth="1.5" fill="none"/>
        <path d="M30 150 Q150 90 270 150" stroke="#60a5fa" strokeWidth="1.5" fill="none"/>
      </svg>
      <div className={isTopTrending ? "mb-4 font-pulse z-10" : "mb-4 z-10"}>
        {service.icon}
      </div>
      <h3 className={`text-xl font-semibold mb-2 z-10 animate-feature-title ${isTopTrending ? "font-pulse" : "text-indigo-100"}`}>{service.title}
        {loading && (
          <span className="ml-2 loading-circle" aria-label="Loading" />
        )}
      </h3>
      <p className="text-gray-300 text-center mb-2 z-10" style={{textShadow: '0 1px 8px #23234a88'}}>{service.desc}</p>
      {service.extra}
      {/* Neon glow effect on hover */}
      <div className="absolute inset-0 rounded-[2.2rem] pointer-events-none group-hover:drop-shadow-neon transition-all duration-300" />
    </div>
  );
};

export default FeatureCard;
