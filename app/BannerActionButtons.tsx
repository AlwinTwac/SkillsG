import React from "react";
import { BookOpen, Lightbulb, Package, PlayCircle } from "lucide-react";

const BUTTONS = [
  {
    label: "Blogs",
    icon: <BookOpen className="w-5 h-5 mr-2" />,
    pulse: false,
    href: "#blogs"
  },
  {
    label: "New Inventions",
    icon: <Lightbulb className="w-5 h-5 mr-2" />,
    pulse: true,
    href: "#inventions"
  },
  {
    label: "Products",
    icon: <Package className="w-5 h-5 mr-2" />,
    pulse: false,
    href: "#products"
  },
  {
    label: "Quick Tour",
    icon: <PlayCircle className="w-5 h-5 mr-2" />,
    pulse: false,
    href: "#tour"
  }
];

const BannerActionButtons: React.FC = () => (
  <div className="banner-action-buttons">
    {BUTTONS.map(btn => (
      <a
        key={btn.label}
        href={btn.href}
        className={`banner-action-btn${btn.pulse ? " pulse" : ""}`}
      >
        {btn.icon}
        <span>{btn.label}</span>
      </a>
    ))}
  </div>
);

export default BannerActionButtons;
