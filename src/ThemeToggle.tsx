import { useState, useCallback, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

/**
 * ThemeToggle — Uses the View Transition API to animate a circular
 * clip-path reveal from the button's position toward the bottom-left
 * corner of the viewport.
 *
 * Icons: High-quality SVG Lucide Sun and Moon with smooth spring rotation
 * and scaling micro-interactions.
 */

const DURATION_MS = 500;

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Apply saved theme on mount (no animation)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = useCallback(() => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem('theme', next ? 'dark' : 'light');

    // Locate the button center for the circle origin
    const btn = document.querySelector('.theme-toggle');
    const rect = btn?.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width / 2 : window.innerWidth - 40;
    const cy = rect ? rect.top + rect.height / 2 : 20;

    // Max radius = distance from button center to the farthest viewport corner
    const maxRadius = Math.hypot(
      Math.max(cx, window.innerWidth - cx),
      Math.max(cy, window.innerHeight - cy)
    );

    // ── View Transition API (Chrome 111+, Safari 18+, Edge 111+) ──
    if (document.startViewTransition) {
      const transition = document.startViewTransition(() => {
        document.documentElement.classList.toggle('dark', next);
      });

      transition.ready.then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${cx}px ${cy}px)`,
              `circle(${maxRadius}px at ${cx}px ${cy}px)`,
            ],
          },
          {
            duration: DURATION_MS,
            easing: 'ease-out',
            pseudoElement: '::view-transition-new(root)',
          }
        );
      });
    } else {
      // Fallback for older browsers — instant toggle, no animation
      document.documentElement.classList.toggle('dark', next);
    }
  }, [isDark]);

  return (
    <div
      className="theme-toggle"
      onClick={handleToggle}
      role="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <input
        type="checkbox"
        checked={isDark}
        readOnly
        tabIndex={-1}
        aria-hidden="true"
      />
      <span className="theme-toggle__button"></span>
      <span className="theme-toggle__icon-wrap">
        <Sun
          className={`theme-toggle__icon theme-toggle__icon--sun ${!isDark ? 'is-active' : ''}`}
          size={18}
          strokeWidth={2.2}
        />
        <Moon
          className={`theme-toggle__icon theme-toggle__icon--moon ${isDark ? 'is-active' : ''}`}
          size={16}
          strokeWidth={2.2}
        />
      </span>
    </div>
  );
}

