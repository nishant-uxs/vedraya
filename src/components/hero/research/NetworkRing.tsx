import "./research.css";

type Props = {
  variant: "precision" | "primary" | "interaction" | "orbit";
  active?: boolean;
};

const CLASS: Record<Props["variant"], string> = {
  precision: "r-ring--precision",
  primary: "r-ring--primary",
  interaction: "r-ring--interaction",
  orbit: "r-ring--orbit",
};

export function NetworkRing({ variant, active = false }: Props) {
  return (
    <div className="r-ring-wrap" data-ring={variant} aria-hidden>
      <div className={`r-ring ${CLASS[variant]}${active ? " is-active" : ""}`} />
    </div>
  );
}
