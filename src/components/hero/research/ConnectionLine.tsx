import { NET, type ResearchNodeConfig } from "./nodes";
import "./research.css";

type Props = {
  nodes: ResearchNodeConfig[];
  activeId: string | null;
  pulseIds: Set<string>;
};

function polar(angleDeg: number, radius: number) {
  const r = radius * 210;
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: NET.cx + Math.sin(rad) * r,
    y: NET.cy - Math.cos(rad) * r,
  };
}

export function ConnectionLine({ nodes, activeId, pulseIds }: Props) {
  const visible = nodes.filter((n) => n.active);

  return (
    <svg
      className="r-lines"
      viewBox={`0 0 ${NET.size} ${NET.size}`}
      aria-hidden
    >
      {visible.map((node) => {
        const p = polar(node.angle, node.radius);
        const lit = activeId === node.id || pulseIds.has(node.id);
        return (
          <g key={node.id} className={`r-line${lit ? " is-lit" : ""}`}>
            <line
              className="r-line__stroke"
              x1={NET.cx}
              y1={NET.cy}
              x2={p.x}
              y2={p.y}
            />
            <circle className="r-line__pulse" r="1.6">
              <animateMotion
                dur={lit ? "2.4s" : "5.5s"}
                repeatCount="indefinite"
                path={`M ${NET.cx} ${NET.cy} L ${p.x} ${p.y}`}
                keyPoints="0;1"
                keyTimes="0;1"
                calcMode="linear"
              />
            </circle>
          </g>
        );
      })}
    </svg>
  );
}
