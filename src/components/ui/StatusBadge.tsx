import "./StatusBadge.css";

type Status = "ok" | "warn" | "crit" | "info" | "neutral";

type Props = {
  label: string;
  status?: Status;
  pulse?: boolean;
};

export function StatusBadge({ label, status = "neutral", pulse = false }: Props) {
  return (
    <span className={`status-badge status-badge--${status}${pulse ? " is-pulse" : ""}`}>
      <span className="status-badge__dot" aria-hidden />
      {label}
    </span>
  );
}
