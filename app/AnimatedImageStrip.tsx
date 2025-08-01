import React, { useRef, useEffect, useState } from "react";

const IMAGES = [
  "/web1.png",
  "/web2.png",
  "/web3.png",
  "/web4.png",
  "/web5.png",
  "/web6.png",
];

const INTERVAL = 4000; // 4 seconds
const SLIDE_DURATION = 700; // ms for smooth slide
const VISIBLE_IMAGES = 6;

const AnimatedImageStrip: React.FC = () => {
  const [offset, setOffset] = useState(0);
  const [sliding, setSliding] = useState(false);
  const [windowWidth, setWindowWidth] = useState(1200);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Responsive width
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sliding interval
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSliding(true);
      timeoutRef.current = setTimeout(() => {
        setOffset((prev) => (prev + 1) % IMAGES.length);
        setSliding(false);
      }, SLIDE_DURATION);
    }, INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Calculate image width so 6 images span full width, minus 5px per separator
  const separatorWidth = 5;
  const totalSeparators = VISIBLE_IMAGES - 1;
  const imgWidth = Math.floor((windowWidth - (separatorWidth * totalSeparators)) / VISIBLE_IMAGES);

  // For smooth sliding, render VISIBLE_IMAGES + 1 images, shift container left by imgWidth px each slide
  const imagesToShow = [...Array(VISIBLE_IMAGES + 1).keys()].map(i => IMAGES[(offset + i) % IMAGES.length]);

  return (
    <div
      className="animated-image-strip"
      style={{
        width: '100vw',
        maxWidth: '100vw',
        height: imgWidth,
        overflow: 'hidden',
        position: 'relative',
        zIndex: 5,
        pointerEvents: 'none',
        margin: 0,
      }}
      ref={containerRef}
    >
      <div
        className="animated-image-strip-inner"
        style={{
          display: 'flex',
          height: imgWidth,
          width: (imgWidth + separatorWidth) * imagesToShow.length,
          transform: `translateX(-${sliding ? imgWidth : 0}px)`,
          transition: sliding ? `transform ${SLIDE_DURATION}ms cubic-bezier(.77,0,.18,1)` : 'none',
        }}
        onTransitionEnd={() => {
          if (sliding) {
            // After slide, reset transform to 0 (loop effect)
            (containerRef.current?.querySelector('.animated-image-strip-inner') as HTMLDivElement).style.transition = 'none';
            (containerRef.current?.querySelector('.animated-image-strip-inner') as HTMLDivElement).style.transform = 'translateX(0px)';
          }
        }}
      >
        {imagesToShow.map((src, i) => (
          <React.Fragment key={i}>
            <img
              src={src}
              alt={`web-bg-${i}`}
              style={{
                width: imgWidth,
                height: imgWidth,
                objectFit: 'cover',
                borderRadius: 0,
                margin: 0,
                boxShadow: 'none',
                opacity: 1,
                userSelect: 'none',
                pointerEvents: 'none',
                display: 'block',
              }}
              draggable={false}
            />
            {i < imagesToShow.length - 1 && (
              <div
                style={{
                  width: separatorWidth,
                  height: '100%',
                  background: 'linear-gradient(180deg, #60a5fa 60%, #2563eb 100%)',
                  minWidth: separatorWidth,
                  maxWidth: separatorWidth,
                }}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default AnimatedImageStrip;
