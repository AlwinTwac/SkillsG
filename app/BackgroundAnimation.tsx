import React, { useRef, useEffect, useState } from "react";

/**
 * Animated background with two modes: welding sparks (canvas) and starfield (canvas).
 * Lightweight, no external dependencies.
 * Switchable with a toggle button.
 */
const BackgroundAnimation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // --- Starfield ---
    type Star = { x: number; y: number; z: number; pz: number };
    let stars: Star[] = [];
    function createStar() {
      return {
        x: Math.random() * width - width / 2,
        y: Math.random() * height - height / 2,
        z: Math.random() * width,
        pz: Math.random() * width,
      };
    }
    function resetStars() {
      stars = [];
      for (let i = 0; i < 200; i++) stars.push(createStar());
    }
    // --- Animation Loop ---
    function animate() {
      ctx!.clearRect(0, 0, width, height);
      // Always render starfield
      ctx!.fillStyle = '#0a0a23';
      ctx!.fillRect(0, 0, width, height);
      for (let i = 0; i < stars.length; i++) {
        let star = stars[i];
        star.z -= 2;
        if (star.z < 1) {
          stars[i] = createStar();
          stars[i].z = width;
        }
        let sx = (star.x / star.z) * 400 + width / 2;
        let sy = (star.y / star.z) * 400 + height / 2;
        let r = (1 - star.z / width) * 2.2;
        ctx!.beginPath();
        ctx!.arc(sx, sy, r, 0, Math.PI * 2);
        ctx!.fillStyle = '#bfcfff';
        ctx!.shadowColor = '#fff';
        ctx!.shadowBlur = 8;
        ctx!.fill();
      }
      animationId = requestAnimationFrame(animate);
    }
    // --- Resize Handler ---
    function handleResize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      resetStars();
    }
    window.addEventListener('resize', handleResize);
    resetStars();
    animate();
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
    // eslint-disable-next-line
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.7,
      }}
    />
  );
};

export default BackgroundAnimation;
