import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "../../lib/motion";
import "./MetricTicker.css";

type Props = {
  value: number;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
};

export function MetricTicker({
  value,
  suffix = "",
  decimals = 0,
  duration = 1.4,
  className = "",
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      el.textContent = `${value.toFixed(decimals)}${suffix}`;
      return;
    }

    const obj = { n: 0 };
    const tween = gsap.to(obj, {
      n: value,
      duration,
      ease: "power2.out",
      onUpdate: () => {
        el.textContent = `${obj.n.toFixed(decimals)}${suffix}`;
      },
    });

    return () => {
      tween.kill();
    };
  }, [value, suffix, decimals, duration]);

  return (
    <span ref={ref} className={`metric-ticker ${className}`.trim()}>
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}
