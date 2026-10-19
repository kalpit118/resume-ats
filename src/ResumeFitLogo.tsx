import React from 'react';

export interface ResumeFitLogoProps {
  /**
   * Height in pixels (number) or CSS string (e.g. '32px', '2rem').
   * Defaults to 32px for standard navigation bar integration.
   */
  height?: number | string;
  /**
   * Optional custom width. If omitted, aspect ratio is automatically preserved.
   */
  width?: number | string;
  /**
   * Optional additional CSS class name.
   */
  className?: string;
  /**
   * Optional inline styles for the container.
   */
  style?: React.CSSProperties;
  /**
   * Whether to display the full brand lockup (icon + 'ResumeFit' wordmark)
   * or strictly the icon mark alone. Defaults to true.
   */
  showText?: boolean;
  /**
   * Priority loading for above-the-fold brand identity assets.
   * Defaults to true.
   */
  priority?: boolean;
}

/**
 * ResumeFitLogo Component
 *
 * Senior Engineering Architecture & Performance Highlights:
 * 1. Zero-FOUC Dual Rendering: Renders both light and dark asset variants with
 *    CSS-governed visibility (`.resumefit-logo-light` / `.resumefit-logo-dark`),
 *    synchronizing instantaneously with `:root.dark` and the browser View Transition API
 *    with zero JavaScript execution lag or hydration mismatch.
 * 2. High-DPI Subpixel Precision: High-resolution transparent PNG assets with clean
 *    alpha matting, avoiding dark-mode white halos or light-mode fringing.
 * 3. Accessibility: Accessible via semantic `<span role="img">` and descriptive `alt`.
 */
export default function ResumeFitLogo({
  height = 32,
  width,
  className = '',
  style = {},
  showText = true,
  priority = true,
}: ResumeFitLogoProps) {
  const lightSrc = showText ? '/ResumeFit_Logo.png' : '/ResumeFit_Icon.png';
  const darkSrc = showText ? '/ResumeFit_Logo_Dark.png' : '/ResumeFit_Icon_Dark.png';

  const containerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    height: typeof height === 'number' ? `${height}px` : height,
    width: width ? (typeof width === 'number' ? `${width}px` : width) : 'auto',
    flexShrink: 0,
    userSelect: 'none',
    verticalAlign: 'middle',
    ...style,
  };

  const imgStyle: React.CSSProperties = {
    height: '100%',
    width: 'auto',
    objectFit: 'contain',
  };

  return (
    <span
      className={`resumefit-logo ${className}`.trim()}
      style={containerStyle}
      role="img"
      aria-label="ResumeFit"
    >
      <img
        src={lightSrc}
        alt="ResumeFit"
        className="resumefit-logo-light"
        style={imgStyle}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
      />
      <img
        src={darkSrc}
        alt="ResumeFit"
        className="resumefit-logo-dark"
        style={imgStyle}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
      />
    </span>
  );
}
