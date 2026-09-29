import "./SiteFooter.css";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <div className="site-footer__brand">
          <span className="site-footer__mark" aria-hidden />
          <span>VEDRAYA</span>
          <span className="site-footer__tag">Clinical research intelligence</span>
        </div>

        <nav className="site-footer__nav" aria-label="Footer">
          <a href="#platform">Platform</a>
          <a href="#intelligence">Intelligence</a>
          <a href="#safety">Safety</a>
          <a href="#compliance">Compliance</a>
          <a href="#interop">Interoperability</a>
          <a href="#command-center">Live Command Center</a>
        </nav>

        <p className="site-footer__meta">
          Precision instrumentation for research operations.
        </p>
      </div>
    </footer>
  );
}
