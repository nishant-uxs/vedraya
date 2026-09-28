import { type ReactNode, useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useReducedMotion } from "../../lib/useReducedMotion";
import "./MagneticButton.css";

type Props = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  ariaLabel?: string;
};

export function MagneticButton({
  children,
  href,
  onClick,
  variant = "primary",
  className = "",
  ariaLabel,
}: Props) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLAnchorElement | HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 280, damping: 22, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 280, damping: 22, mass: 0.4 });

  const onMove = (e: React.MouseEvent) => {
    if (reduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    x.set(dx * 0.12);
    y.set(dy * 0.12);
  };

  const onLeave = () => {
    x.set(0);
    y.set(0);
  };

  const classes = `mag-btn mag-btn--${variant} ${className}`.trim();
  const style = { x: springX, y: springY };

  if (href) {
    return (
      <motion.a
        ref={ref as React.RefObject<HTMLAnchorElement>}
        href={href}
        className={classes}
        style={style}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        aria-label={ariaLabel}
      >
        <span className="mag-btn__label">{children}</span>
        <span className="mag-btn__arrow" aria-hidden>
          →
        </span>
      </motion.a>
    );
  }

  return (
    <motion.button
      ref={ref as React.RefObject<HTMLButtonElement>}
      type="button"
      className={classes}
      style={style}
      onClick={onClick}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      aria-label={ariaLabel}
    >
      <span className="mag-btn__label">{children}</span>
      <span className="mag-btn__arrow" aria-hidden>
        →
      </span>
    </motion.button>
  );
}
