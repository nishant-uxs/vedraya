import "./research.css";

type Props = {
  value: string;
  label: string;
  position: "a" | "b";
};

export function MetricCard({ value, label, position }: Props) {
  return (
    <div className={`r-metric r-metric--${position}`} data-metric>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
