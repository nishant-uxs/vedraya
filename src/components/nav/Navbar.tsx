import { useEffect, useState } from "react";
import { MagneticButton } from "../ui/MagneticButton";
import { ThemeToggle } from "../ui/ThemeToggle";
import "./Navbar.css";

const LINKS = [
  { href: "#platform", label: "Platform", id: "platform" },
  { href: "#intelligence", label: "Intelligence", id: "intelligence" },
  { href: "#safety", label: "Safety", id: "safety" },
  { href: "#compliance", label: "Compliance", id: "compliance" },
  { href: "#interop", label: "Interoperability", id: "interop" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [overProduct, setOverProduct] = useState(true);
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      setOverProduct(y < window.innerHeight * 0.72);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let observer: IntersectionObserver | null = null;
    let raf = 0;
    let attempts = 0;
    let cancelled = false;

    const tryObserve = () => {
      if (cancelled) return;
      const ids = LINKS.map((l) => l.id);
      const elements = ids
        .map((id) => document.getElementById(id))
        .filter((el): el is HTMLElement => Boolean(el));

      if (elements.length < ids.length && attempts < 120) {
        attempts += 1;
        raf = window.requestAnimationFrame(tryObserve);
        return;
      }
      if (!elements.length) return;

      observer = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((e) => e.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
          if (visible[0]?.target.id) setActiveId(visible[0].target.id);
        },
        { rootMargin: "-20% 0px -55% 0px", threshold: [0.1, 0.35, 0.6] },
      );

      elements.forEach((el) => observer!.observe(el));
    };

    tryObserve();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      observer?.disconnect();
    };
  }, []);

  const classes = [
    "navbar",
    scrolled ? "is-scrolled" : "",
    overProduct && !scrolled ? "navbar--over-product" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={classes}>
      <div className="navbar__inner container">
        <a href="#top" className="navbar__brand" aria-label="VEDRAYA home">
          <span className="navbar__mark" aria-hidden />
          VEDRAYA
        </a>

        <nav className="navbar__nav" aria-label="Primary">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`navbar__link${activeId === link.id ? " is-active" : ""}`}
              aria-current={activeId === link.id ? "true" : undefined}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="navbar__actions">
          <ThemeToggle />
          <MagneticButton href="#command-center" variant="primary">
            Enter Live Command Center
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
              className={`navbar__drawer-link${activeId === link.id ? " is-active" : ""}`}
              aria-current={activeId === link.id ? "true" : undefined}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="navbar__drawer-theme">
            <ThemeToggle />
            <span>Theme</span>
          </div>
          <a href="#command-center" className="navbar__drawer-cta" onClick={() => setOpen(false)}>
            Enter Live Command Center →
          </a>
        </nav>
      </div>
    </header>
  );
}
