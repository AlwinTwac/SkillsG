import React, { useState } from 'react';
import { Cpu, Users, RefreshCw, MonitorPlay } from 'lucide-react';
import CircuitLinesFaint from './CircuitLinesFaint';

const BUTTONS = [
  {
    label: 'Success stories',
    details: [
      'Hear from students who landed top jobs',
      'Stories from companies and recruiters',
      'Featured alumni interviews',
    ],
    icon: <Cpu className="w-7 h-7 text-cyan-300 drop-shadow-neon" />, // Futuristic processor icon
  },
  {
    label: 'Key Partners',
    details: [
      'Kimtronix Global',
      'Major universities',
      'Industry leaders',
    ],
    icon: <Users className="w-7 h-7 text-indigo-300 drop-shadow-neon" />, // Teamwork/partners
  },
  {
    label: 'Recent Updates',
    details: [
      'Platform improvements',
      'New courses & features',
      'Upcoming events',
    ],
    icon: <RefreshCw className="w-7 h-7 text-emerald-300 drop-shadow-neon" />, // Updates/refresh
  },
  {
    label: 'Watch Live Tutorials',
    details: [
      'Join upcoming live sessions',
      'Expert Q&A',
      'Recorded webinars',
    ],
    icon: <MonitorPlay className="w-7 h-7 text-purple-300 drop-shadow-neon" />, // Live/monitor
  },
];

const GlassCircuitButtonPanel: React.FC = () => {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="glass-circuit-panel">
      {BUTTONS.map((btn, idx) => (
        <div
          key={btn.label}
          className={`glass-circuit-card${hovered === idx ? ' hovered' : ''}`}
          onMouseEnter={() => setHovered(idx)}
          onMouseLeave={() => setHovered(null)}
        >
          {/* Circuit background */}
          <div className="circuit-bg">
            <CircuitLinesFaint />
            {/* Optionally add a processor SVG or faint symbol here */}
          </div>
          <button className="glass-circuit-btn">
            <span className="icon">{btn.icon}</span>
            <span>{btn.label}</span>
          </button>
          {/* Dropdown details */}
          {hovered === idx && (
            <div className="glass-circuit-dropdown">
              <ul>
                {btn.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default GlassCircuitButtonPanel;
