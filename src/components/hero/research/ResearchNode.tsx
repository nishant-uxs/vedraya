import type { ResearchNodeConfig } from "./nodes";
import "./research.css";

type Props = {
  node: ResearchNodeConfig;
  active: boolean;
  hovered: boolean;
  onEnter: () => void;
  onLeave: () => void;
};

export function ResearchNode({ node, active, hovered, onEnter, onLeave }: Props) {
  return (
    <button
      type="button"
      className={`r-node${active ? " is-active" : " is-muted"}${hovered ? " is-hovered" : ""}`}
      style={{ ["--angle" as string]: `${node.angle}deg`, ["--radius" as string]: String(node.radius) }}
      data-node={node.id}
      data-period={node.period}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      aria-label={`${node.label}: ${node.detail}`}
    >
      <span className="r-node__surface">
        <span className="r-node__dot" />
        <span className="r-node__label">{node.label}</span>
      </span>
      <span className={`r-node__detail${hovered ? " is-visible" : ""}`}>{node.detail}</span>
    </button>
  );
}
