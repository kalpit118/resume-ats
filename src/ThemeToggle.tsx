import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * ThemeToggle — A skeuomorphic light/dark toggle that triggers a smooth
 * diagonal clip-path wipe across the entire viewport.
 *
 * How the animation works:
 *   1. A fixed, full-screen `<div>` (the "curtain") is created.  It carries the
 *      *destination* theme's background colour.
 *   2. A CSS `clip-path: polygon(...)` on the curtain starts as a zero-area
 *      triangle pinned to the top-right corner.
 *   3. On each rAF tick, we linearly interpolate the polygon's control points
 *      so the triangle grows diagonally toward the bottom-left corner until it
 *      covers the whole viewport.
 *   4. Once the polygon fills the screen, we commit the theme class to `<html>`,
 *      remove the curtain, and we're done.
 */

const DURATION_MS = 500; // tune: higher = slower spread

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    // Respect OS preference on first visit, but localStorage wins
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const animatingRef = useRef(false);
  const curtainRef = useRef<HTMLDivElement | null>(null);

  // Apply saved theme on mount (no animation)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const animateThemeSwitch = useCallback((toDark: boolean) => {
    if (animatingRef.current) return;
    animatingRef.current = true;

    // Create curtain overlay
    const curtain = document.createElement('div');
    curtain.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 99999;
      pointer-events: none;
      background: ${toDark ? '#121212' : '#ffffff'};
      clip-path: polygon(100% 0, 100% 0, 100% 0);
      will-change: clip-path;
    `;
    document.body.appendChild(curtain);
    curtainRef.current = curtain;

    let start: number | null = null;

    const tick = (ts: number) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const t = Math.min(elapsed / DURATION_MS, 1);

      // Easing: ease-out cubic for snappy start, gentle finish
      const e = 1 - Math.pow(1 - t, 3);

      // Polygon grows from top-right corner to cover full viewport diagonally.
      // At t=0 the polygon is a zero-area point at (100%, 0).
      // At t=1 it spans: (100% 0) → (-100% 0) → (200% 200%) → (100% 200%)
      // effectively covering the entire viewport plus overshoot.
      const x1 = 100 - e * 200;  // top-left x:  100 → -100
      const y1 = 0;               // top-left y:  stays 0
      const x2 = 100;             // top-right x: stays 100
      const y2 = 0;               // top-right y: stays 0
      const x3 = 100 + e * 100;   // bottom-right x: 100 → 200
      const y3 = e * 200;         // bottom-right y: 0 → 200
      const x4 = x1;              // bottom-left x: mirrors top-left
      const y4 = y3;              // bottom-left y: mirrors bottom-right

      curtain.style.clipPath =
        `polygon(${x1}% ${y1}%, ${x2}% ${y2}%, ${x3}% ${y3}%, ${x4}% ${y4}%)`;

      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        // Animation complete — commit theme
        document.documentElement.classList.toggle('dark', toDark);
        // Small delay so the class swap renders under the curtain
        requestAnimationFrame(() => {
          curtain.remove();
          curtainRef.current = null;
          animatingRef.current = false;
        });
      }
    };

    requestAnimationFrame(tick);
  }, []);

  const handleToggle = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    animateThemeSwitch(next);
  };

  return (
    <div className="theme-toggle" onClick={handleToggle}>
      <input
        type="checkbox"
        checked={isDark}
        readOnly
        tabIndex={-1}
      />
      <span className="theme-toggle__button"></span>
      <span className="theme-toggle__label">{isDark ? '☽' : '☼'}</span>
    </div>
  );
}
