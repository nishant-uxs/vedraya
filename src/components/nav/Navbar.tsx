import { useEffect, useState } from "react";
import { MagneticButton } from "../ui/MagneticButton";
import "./Navbar.css";

const LINKS = [
  { href: "#platform", label: "Platform" },
  { href: "#intelligence", label: "Intelligence" },
  { href: "#safety", label: "Safety" },
  { href: "#compliance", label: "Compliance" },
  { href: "#interop", label: "Interoperability" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`navbar${scrolled ? " is-scrolled" : ""}`}>
      <div className="navbar__inner container">
        <a href="#top" className="navbar__brand" aria-label="VEDRAYA home">
          <span className="navbar__mark" aria-hidden />
          VEDRAYA
        </a>

        <nav className="navbar__nav" aria-label="Primary">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="navbar__link">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="navbar__actions">
          <MagneticButton href="#command-center" variant="primary">
            Enter Command Center
          </MagneticButton>
          <button
            type="button"
            className="navbar__menu"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label="Toggle navigation"
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
          </button>
        </div>
      </div>

      <div id="mobile-nav" className={`navbar__drawer${open ? " is-open" : ""}`} hidden={!open}>
        <nav aria-label="Mobile">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="navbar__drawer-link"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <a href="#command-center" className="navbar__drawer-cta" onClick={() => setOpen(false)}>
            Enter Command Center →
          </a>
        </nav>
      </div>
    </header>
  );
}
