import React, { useEffect, useRef } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import SpecularButton from './SpecularButton';
import './HeroSection.css';

export interface HeroSectionProps {
  onStartOptimizing?: () => void;
  onTrySample?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onStartOptimizing }) => {
  const shouldReduceMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Interactive Mathematical Precision Grid Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.offsetWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.offsetHeight || 380);
    const mouse = { x: -1000, y: -1000, active: false };

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.offsetWidth;
      height = canvas.height = canvas.parentElement.offsetHeight;
      if (shouldReduceMotion) drawStatic();
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

    const parent = canvas.parentElement;
    parent?.addEventListener('mousemove', handleMouseMove);
    parent?.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('resize', handleResize);

    const spacing = 34;

    const drawStatic = () => {
      ctx.clearRect(0, 0, width, height);
      const isDark = document.documentElement.classList.contains('dark');
      ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)';
      for (let x = spacing; x < width; x += spacing) {
        for (let y = spacing; y < height; y += spacing) {
          ctx.fillRect(x - 0.75, y - 0.75, 1.5, 1.5);
        }
      }
    };

    if (shouldReduceMotion) {
      drawStatic();
      return () => {
        parent?.removeEventListener('mousemove', handleMouseMove);
        parent?.removeEventListener('mouseleave', handleMouseLeave);
        window.removeEventListener('resize', handleResize);
      };
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      const isDark = document.documentElement.classList.contains('dark');
      const dotColor = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)';
      const activeColor = isDark ? 'rgba(56, 189, 248, 0.55)' : 'rgba(37, 99, 235, 0.5)';
      const maxDist = 130;

      for (let x = spacing; x < width; x += spacing) {
        for (let y = spacing; y < height; y += spacing) {
          const dx = x - mouse.x;
          const dy = y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (mouse.active && dist < maxDist) {
            const factor = 1 - dist / maxDist;
            ctx.fillStyle = activeColor;
            ctx.beginPath();
            ctx.arc(x, y, 1.2 + factor * 1.6, 0, Math.PI * 2);
            ctx.fill();

            // Connect nearby points to mouse with subtle alignment ray
            if (dist < 75) {
              ctx.strokeStyle = isDark
                ? `rgba(56, 189, 248, ${0.18 * factor})`
                : `rgba(37, 99, 235, ${0.16 * factor})`;
              ctx.lineWidth = 0.8;
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(mouse.x, mouse.y);
              ctx.stroke();
            }
          } else {
            ctx.fillStyle = dotColor;
            ctx.fillRect(x - 0.75, y - 0.75, 1.5, 1.5);
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      parent?.removeEventListener('mousemove', handleMouseMove);
      parent?.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
    };
  }, [shouldReduceMotion]);

  // Framer Motion staggered entrance
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0.04 : 0.09,
        delayChildren: 0.05,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 },
    visible: {
      opacity: 1,
      y: 0,
      transition: shouldReduceMotion
        ? { duration: 0.15 }
        : { type: 'spring', damping: 26, stiffness: 240 },
    },
  };

  return (
    <section className="rf-hero" aria-labelledby="hero-title">
      {/* Interactive Precision Alignment Canvas */}
      <canvas ref={canvasRef} className="rf-hero__canvas" aria-hidden="true" />

      <motion.div
        className="rf-hero__container"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Purpose-driven Status Tag */}
        <motion.div variants={itemVariants}>
          <div className="rf-hero__mono-tag" role="status">
            <span>Evidence-Based ATS Alignment · Zero Fabrication</span>
          </div>
        </motion.div>

        {/* Main Kinetic Headline */}
        <motion.h1 id="hero-title" className="rf-hero__title" variants={itemVariants}>
          <span className="rf-hero__sweep-text">Precision match</span>
          <br />
          your resume.
        </motion.h1>

        {/* Subheadline */}
        <motion.p className="rf-hero__subtitle" variants={itemVariants}>
          Mathematical optimization for your career. We analyze the job description
          and restructure your experience without fabricating qualifications.
        </motion.p>

        {/* Meaningful Value Ribbon */}
        <motion.div className="rf-hero__specs" variants={itemVariants}>
          <div className="rf-spec-item">
            <span className="rf-spec-item__mark">✓</span>
            <span>100% authentic experience - no fabricated claims</span>
          </div>

          <div className="rf-spec-item">
            <span className="rf-spec-item__mark">✓</span>
            <span>Aligned to target job keywords & ATS criteria</span>
          </div>

          <div className="rf-spec-item">
            <span className="rf-spec-item__mark">✓</span>
            <span>Native LaTeX, PDF & Word formatting preserved</span>
          </div>
        </motion.div>

        {/* SpecularButton Action */}
        <motion.div variants={itemVariants} style={{ marginTop: '2rem' }}>
          <SpecularButton
            size="lg"
            radius={18}
            tint="#ffffff"
            tintOpacity={0.04}
            textColor="#f5f5f5"
            lineColor="#ffffff"
            baseColor="#525252"
            intensity={1}
            idleIntensity={0.35}
            shineSize={10}
            shineFade={34}
            thickness={1.2}
            glow={1}
            followMouse
            proximity={250}
            onClick={onStartOptimizing}
          >
            Get Started
          </SpecularButton>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
