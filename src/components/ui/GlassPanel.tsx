import { type ReactNode } from "react";
import "./GlassPanel.css";

type Props = {
  children: ReactNode;
  className?: string;
  as?: "div" | "article" | "section";
  interactive?: boolean;
};

export function GlassPanel({
  children,
  className = "",
  as: Tag = "div",
  interactive = false,
}: Props) {
  return (
    <Tag
      className={`glass-panel${interactive ? " glass-panel--interactive" : ""} ${className}`.trim()}
    >
      {children}
    </Tag>
  );
}
