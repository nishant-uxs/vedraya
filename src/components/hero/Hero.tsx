import { MagneticButton } from "../ui/MagneticButton";
import { HeroNetwork } from "./HeroNetwork";
import "./Hero.css";

export function Hero() {
  return (
    <section id="top" className="hero" aria-label="VEDRAYA hero">
      <div className="hero__stage">
        <div className="hero__glow" aria-hidden />

        <div className="hero__layout">
          <div className="hero__copy">
            <span className="hero__badge">Introducing clinical research intelligence</span>

            <h1 className="hero__title">
              Clinical research,
              <br />
              finally operating
              <br />
              as one system.
            </h1>

            <p className="hero__support">
              A real-time platform connecting trials, safety, compliance, sites and research data
              into one auditable system.
            </p>

            <div className="hero__cta">
              <MagneticButton href="#command-center">Enter Command Center</MagneticButton>
              <MagneticButton href="#platform" variant="secondary">
                Watch the platform
              </MagneticButton>
            </div>

            <div className="hero__trust">
              <div className="hero__avatars" aria-hidden>
                <span />
                <span />
                <span />
              </div>
              <p>
                <strong>27</strong> active studies · Trusted by research teams
              </p>
            </div>
          </div>

          <div className="hero__visual" aria-label="VEDRAYA research core">
            <HeroNetwork progress={0} calm />
          </div>
        </div>
      </div>
    </section>
  );
}
