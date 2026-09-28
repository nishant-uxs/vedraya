import { MagneticButton } from "../ui/MagneticButton";
import "./FinalCTA.css";

export function FinalCTA() {
  return (
    <section className="final section" aria-labelledby="final-heading">
      <div className="container final__inner">
        <h2 id="final-heading" className="display final__title">
          One system.
          <br />
          Every study.
          <br />
          Every signal.
          <br />
          Every decision.
          <br />
          <span>Auditable.</span>
        </h2>
        <MagneticButton href="#command-center" className="final__cta">
          Enter the Command Center
        </MagneticButton>
      </div>
    </section>
  );
}
