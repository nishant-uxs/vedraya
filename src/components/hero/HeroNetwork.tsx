import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "../../lib/motion";
import "./HeroNetwork.css";

const NODES = [
  { id: "trials", label: "TRIALS", x: 18, y: 22 },
  { id: "sites", label: "SITES", x: 82, y: 18 },
  { id: "safety", label: "SAFETY", x: 12, y: 58 },
  { id: "compliance", label: "COMPLIANCE", x: 88, y: 55 },
  { id: "fhir", label: "FHIR", x: 28, y: 86 },
  { id: "cdisc", label: "CDISC", x: 72, y: 88 },
  { id: "audit", label: "AUDIT", x: 50, y: 12 },
];

const METRICS = [
  { label: "ACTIVE STUDIES", value: "27" },
  { label: "HIGH RISK", value: "04" },
  { label: "OPEN ALERTS", value: "12" },
  { label: "DATA INTEGRITY", value: "98.2%" },
];

type Props = {
  progress?: number;
};

export function HeroNetwork({ progress = 0 }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pulseRef = useRef<number | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion()) return;

    const nodes = root.querySelectorAll<HTMLElement>(".hero-net__node");
    const onMove = (e: MouseEvent) => {
      const rect = root.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width - 0.5;
      const my = (e.clientY - rect.top) / rect.height - 0.5;
      nodes.forEach((node, i) => {
        const factor = 6 + (i % 3) * 2;
        gsap.to(node, {
          x: mx * factor,
          y: my * factor,
          duration: 0.6,
          ease: "power2.out",
          overwrite: "auto",
        });
      });
    };

    root.addEventListener("mousemove", onMove);
    return () => root.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion()) return;

    const lines = root.querySelectorAll<SVGLineElement>(".hero-net__line");
    let t = 0;
    const tick = () => {
      t += 0.015;
      lines.forEach((line, i) => {
        const opacity = 0.2 + Math.sin(t + i) * 0.12;
        line.style.opacity = String(opacity);
      });
      pulseRef.current = requestAnimationFrame(tick);
    };
    pulseRef.current = requestAnimationFrame(tick);
    return () => {
      if (pulseRef.current) cancelAnimationFrame(pulseRef.current);
    };
  }, []);

  const converge = Math.min(1, Math.max(0, progress));
  const scale = 1 + converge * 0.18;
  const coreScale = 1 + converge * 0.45;
  const metricsOpacity = 1 - converge * 1.2;
  const lineBoost = 0.28 + converge * 0.45;

  return (
    <div
      ref={rootRef}
      className="hero-net"
      style={{ ["--converge" as string]: converge }}
      aria-hidden
    >
      <div className="hero-net__glow" />
      <svg className="hero-net__svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        {NODES.map((node) => {
          const x = 50 + (node.x - 50) * (1 - converge * 0.85);
          const y = 50 + (node.y - 50) * (1 - converge * 0.85);
          return (
            <line
              key={`line-${node.id}`}
              className="hero-net__line"
              x1="50"
              y1="50"
              x2={x}
              y2={y}
              style={{
                opacity: lineBoost,
                stroke: converge > 0.35 ? "#0b8fbf" : "#c5cad3",
              }}
            />
          );
        })}
      </svg>

      <div className="hero-net__stage" style={{ transform: `scale(${scale})` }}>
        <div className="hero-net__core" style={{ transform: `scale(${coreScale})` }}>
          <div className="hero-net__ring hero-net__ring--a" />
          <div className="hero-net__ring hero-net__ring--b" />
          <div className="hero-net__hub">
            <span className="hero-net__hub-label">VEDRAYA</span>
            <span className="hero-net__hub-sub">RESEARCH CORE</span>
          </div>
        </div>

        {NODES.map((node) => {
          const x = 50 + (node.x - 50) * (1 - converge * 0.85);
          const y = 50 + (node.y - 50) * (1 - converge * 0.85);
          return (
            <div
              key={node.id}
              className="hero-net__node"
              style={{ left: `${x}%`, top: `${y}%`, opacity: 1 - converge * 0.7 }}
            >
              <span className="hero-net__node-dot" />
              <span className="hero-net__node-label">{node.label}</span>
            </div>
          );
        })}
      </div>

      <div className="hero-net__metrics" style={{ opacity: Math.max(0, metricsOpacity) }}>
        {METRICS.map((m) => (
          <div key={m.label} className="hero-net__metric">
            <strong>{m.value}</strong>
            <span>{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
