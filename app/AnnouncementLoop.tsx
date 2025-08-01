import React, { useRef, useEffect } from "react";

const ANNOUNCEMENTS = [
  "🚀 New: SkillsG Summer Coding Challenge now open!",
  "🎉 Congrats to our top learners this month!",
  "🌐 Kimtronix Global partners with 5 new companies.",
  "📢 Recruiter Dashboard: New features released!",
  "📚 Discover trending courses and workshops."
];

export default function AnnouncementLoop() {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animId: number;
    let offset = 0;
    const speed = 1.2; // px per frame
    const loop = () => {
      if (textRef.current && containerRef.current) {
        offset -= speed;
        const textWidth = textRef.current.offsetWidth;
        const containerWidth = containerRef.current.offsetWidth;
        if (offset < -textWidth) {
          offset = containerWidth;
        }
        textRef.current.style.transform = `translateX(${offset}px)`;
      }
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div
      ref={containerRef}
      className="announcement-loop-container"
      style={{
        width: "100%",
        overflow: "hidden",
        background: "rgba(255,255,255,0.92)",
        borderRadius: "0 0 1.5rem 1.5rem",
        borderTop: "1.5px solid #e0e7ff",
        padding: "0.35rem 0",
        minHeight: "2.4rem",
        position: "relative",
        zIndex: 15,
        boxShadow: "0 4px 24px 0 rgba(120,130,255,0.08)"
      }}
    >
      <div
        ref={textRef}
        className="announcement-loop-text"
        style={{
          display: "inline-block",
          whiteSpace: "nowrap",
          fontWeight: 700,
          fontSize: "1.1rem",
          color: "#2d237a",
          letterSpacing: "0.02em",
          textShadow: "0 1px 8px #e0e7ff, 0 0.5px 0 #fff"
        }}
      >
        {ANNOUNCEMENTS.join("   •   ")}
      </div>
    </div>
  );
}
