import "./HeroNetwork.css";

const NODES = [
  { id: "trials", label: "TRIALS", x: 18, y: 24 },
  { id: "sites", label: "SITES", x: 82, y: 22 },
  { id: "safety", label: "SAFETY", x: 14, y: 62 },
  { id: "compliance", label: "COMPLIANCE", x: 86, y: 60 },
  { id: "audit", label: "AUDIT", x: 50, y: 10 },
];

const METRICS = [
  { label: "ACTIVE STUDIES", value: "27" },
  { label: "DATA INTEGRITY", value: "98.2%" },
];

type Props = {
  progress?: number;
  calm?: boolean;
};

export function HeroNetwork({ progress = 0, calm = false }: Props) {
  const converge = calm ? 0 : Math.min(1, Math.max(0, progress));

  return (
    <div className={`hero-net${calm ? " hero-net--calm" : ""}`} aria-hidden>
      <div className="hero-net__glow" />
      <svg className="hero-net__svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        {NODES.map((node) => {
          const x = 50 + (node.x - 50) * (1 - converge * 0.7);
          const y = 50 + (node.y - 50) * (1 - converge * 0.7);
          return (
            <line
              key={`line-${node.id}`}
              className="hero-net__line"
              x1="50"
              y1="50"
              x2={x}
              y2={y}
            />
          );
        })}
      </svg>

      <div className="hero-net__stage">
        <div className="hero-net__core">
          <div className="hero-net__ring hero-net__ring--a" />
          <div className="hero-net__ring hero-net__ring--b" />
          <div className="hero-net__hub">
            <span className="hero-net__hub-label">VEDRAYA</span>
            <span className="hero-net__hub-sub">RESEARCH CORE</span>
          </div>
        </div>

        {NODES.map((node) => {
          const x = 50 + (node.x - 50) * (1 - converge * 0.7);
          const y = 50 + (node.y - 50) * (1 - converge * 0.7);
          return (
            <div
              key={node.id}
              className="hero-net__node"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <span className="hero-net__node-dot" />
              <span className="hero-net__node-label">{node.label}</span>
            </div>
          );
        })}
      </div>

      <div className="hero-net__metrics">
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
