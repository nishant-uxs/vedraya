import type { CSSProperties } from "react";
import "./research.css";

type Props = {
  hovered?: boolean;
  morphProgress?: number;
};

export function ResearchCore({ hovered = false, morphProgress = 0 }: Props) {
  const style = {
    ["--core-scale" as string]: hovered ? 1.025 : 1,
    ["--morph" as string]: String(morphProgress),
  } as CSSProperties;

  return (
    <div
      className={`r-core${hovered ? " is-hovered" : ""}${morphProgress > 0.55 ? " is-morphing" : ""}`}
      style={style}
      data-research-core
    >
      <span className="r-core__outer" />
      <span className="r-core__precision" />
      <span className="r-core__inner">
        <span className="r-core__wordmark">VEDRAYA</span>
        <span className="r-core__sub">Research Core</span>
      </span>

      <div className="r-core__dashboard" aria-hidden>
        <div className="r-core__dash-nav" />
        <div className="r-core__dash-grid">
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
