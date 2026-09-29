import { useMemo } from "react";
import { ConnectionLine } from "./ConnectionLine";
import { MetricCard } from "./MetricCard";
import { NetworkRing } from "./NetworkRing";
import { ResearchCore } from "./ResearchCore";
import { ResearchNode } from "./ResearchNode";
import { RESEARCH_METRICS, RESEARCH_NODES, type ResearchNodeId } from "./nodes";
import "./research.css";

type Props = {
  hoveredNode: ResearchNodeId | null;
  coreHovered: boolean;
  morphProgress: number;
  pulseIds: Set<string>;
  isMobile: boolean;
  onNodeEnter: (id: ResearchNodeId) => void;
  onNodeLeave: () => void;
  onCoreEnter: () => void;
  onCoreLeave: () => void;
};

export function ResearchNetwork({
  hoveredNode,
  coreHovered,
  morphProgress,
  pulseIds,
  isMobile,
  onNodeEnter,
  onNodeLeave,
  onCoreEnter,
  onCoreLeave,
}: Props) {
  const nodes = useMemo(
    () =>
      RESEARCH_NODES.filter((n) => {
        if (isMobile) return n.mobile;
        return n.active || n.id === hoveredNode;
      }).slice(0, isMobile ? 3 : 4),
    [isMobile, hoveredNode],
  );

  const ringActive =
    hoveredNode !== null || coreHovered || morphProgress > 0.2;

  return (
    <div className="r-network" data-research-network>
      <div className="r-network__field" aria-hidden />

      <div className="r-network__mid" data-network-mid>
        <NetworkRing variant="orbit" />
        <NetworkRing variant="interaction" active={ringActive} />
        <NetworkRing variant="primary" active={Boolean(hoveredNode)} />
        <NetworkRing variant="precision" active={coreHovered} />

        <ConnectionLine
          nodes={RESEARCH_NODES.filter((n) => nodes.some((v) => v.id === n.id))}
          activeId={hoveredNode}
          pulseIds={pulseIds}
        />

        <div className="r-network__core-anchor">
          <div
            className="r-network__core-wrap"
            data-core-wrap
            onMouseEnter={onCoreEnter}
            onMouseLeave={onCoreLeave}
          >
            <ResearchCore hovered={coreHovered} morphProgress={morphProgress} />
          </div>
        </div>

        {nodes.map((node) => (
          <ResearchNode
            key={node.id}
            node={node}
            active={node.active || node.id === hoveredNode}
            hovered={hoveredNode === node.id}
            onEnter={() => onNodeEnter(node.id)}
            onLeave={onNodeLeave}
          />
        ))}
      </div>

      {RESEARCH_METRICS.map((m, i) => (
        <MetricCard
          key={m.id}
          value={m.value}
          label={m.label}
          position={i === 0 ? "a" : "b"}
        />
      ))}
    </div>
  );
}
