import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { DashboardPreview, type DashFocus, type DashModule } from "../dashboard/DashboardPreview";
import { gsap, registerGsap, prefersReducedMotion } from "../../lib/motion";
import { useAuth } from "../../lib/AuthProvider";
import {
  api,
  type AdverseEvent,
  type AlertItem,
  type AuditEvent,
  type ConsentKpis,
  type Kpis,
  type RegulatoryKpis,
  type Study,
} from "../../lib/api";
import "./CommandCenter.css";

const FOCUS_STEPS: DashFocus[] = [
  "overview",
  "study",
  "risk",
  "safety",
  "compliance",
  "audit",
];

const STAGE_PAD_TOP = 72;
const STAGE_PAD_BOTTOM = 20;
const STAGE_GAP = 12;
const CMD_SCALE = 0.82;

const DEMO_ACCOUNTS = [
  { email: "admin@vedraya.demo", label: "Admin" },
  { email: "pi@vedraya.demo", label: "Principal Investigator" },
  { email: "coord@vedraya.demo", label: "Study Coordinator" },
  { email: "monitor@vedraya.demo", label: "Monitor" },
  { email: "pv@vedraya.demo", label: "Pharmacovigilance" },
  { email: "ethics@vedraya.demo", label: "Ethics Committee" },
  { email: "regulator@vedraya.demo", label: "Regulator" },
];

function fitShell(shell: HTMLElement, slot: HTMLElement, focusEl: HTMLElement) {
  shell.style.transform = "none";
  const naturalH = shell.offsetHeight;
  const naturalW = shell.offsetWidth;
  const focusH = focusEl.offsetHeight;
  const available = Math.max(
    300,
    window.innerHeight - STAGE_PAD_TOP - STAGE_PAD_BOTTOM - focusH - STAGE_GAP,
  );
  const scale = Math.min(CMD_SCALE, available / Math.max(naturalH, 1));
  shell.style.transform = `scale(${scale})`;
  slot.style.height = `${Math.round(naturalH * scale)}px`;
  slot.style.width = `${Math.round(Math.min(naturalW * scale, window.innerWidth - 48))}px`;
}

export function CommandCenter() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef<HTMLParagraphElement>(null);
  const [focus, setFocus] = useState<DashFocus>("overview");
  const [module, setModule] = useState<DashModule>("overview");
  const [moduleFilter, setModuleFilter] = useState<string | null>(null);

  const { user, loading: authLoading, login, logout, error: authError } = useAuth();
  const [email, setEmail] = useState("admin@vedraya.demo");
  const [password, setPassword] = useState("Vedraya!Demo1");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [studies, setStudies] = useState<Study[]>([]);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [consentKpis, setConsentKpis] = useState<ConsentKpis | null>(null);
  const [regulatoryKpis, setRegulatoryKpis] = useState<RegulatoryKpis | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [adverseEvents, setAdverseEvents] = useState<AdverseEvent[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const loadOps = useCallback(async () => {
    if (!user) {
      setStudies([]);
      setKpis(null);
      setConsentKpis(null);
      setRegulatoryKpis(null);
      setAlerts([]);
      setAuditEvents([]);
      setAdverseEvents([]);
      return;
    }
    setDataLoading(true);
    setDataError(null);
    try {
      const [s, k, a, aud, ae, ck, rk] = await Promise.all([
        api.studies(),
        api.kpis(),
        api.alerts(),
        api.auditEvents(24),
        api.adverseEvents(),
        api.consentKpis().catch(() => null),
        api.regulatoryKpis().catch(() => null),
      ]);
      setStudies(s);
      setKpis(k);
      setAlerts(a);
      setAuditEvents(aud);
      setAdverseEvents(ae);
      setConsentKpis(ck);
      setRegulatoryKpis(rk);
    } catch (err) {
      setDataError(err instanceof Error ? err.message : "Failed to load command center data");
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadOps();
  }, [loadOps]);

  useEffect(() => {
    registerGsap();
    const section = sectionRef.current;
    const stage = stageRef.current;
    const shell = shellRef.current;
    const slot = slotRef.current;
    const focusEl = focusRef.current;
    if (!section || !stage || !shell || !slot || !focusEl) return;

    const refit = () => fitShell(shell, slot, focusEl);
    refit();
    const t1 = window.setTimeout(refit, 100);
    const t2 = window.setTimeout(refit, 400);
    window.addEventListener("resize", refit);

    if (prefersReducedMotion()) {
      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
        window.removeEventListener("resize", refit);
      };
    }

    const ctx = gsap.context(() => {
      gsap
        .timeline({
          scrollTrigger: {
            trigger: stage,
            start: "top top",
            end: "+=140%",
            scrub: 0.9,
            pin: true,
            anticipatePin: 1,
            onEnter: refit,
            onRefresh: refit,
            onUpdate: (self) => {
              const idx = Math.min(
                FOCUS_STEPS.length - 1,
                Math.floor(self.progress * FOCUS_STEPS.length),
              );
              setFocus(FOCUS_STEPS[idx]);
            },
          },
        })
        .fromTo(slot, { autoAlpha: 0.92 }, { autoAlpha: 1, ease: "none", duration: 1 });
    }, section);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("resize", refit);
      ctx.revert();
    };
  }, []);

  useEffect(() => {
    const shell = shellRef.current;
    const slot = slotRef.current;
    const focusEl = focusRef.current;
    if (!shell || !slot || !focusEl) return;
    const id = window.setTimeout(() => fitShell(shell, slot, focusEl), 80);
    return () => window.clearTimeout(id);
  }, [
    studies,
    kpis,
    alerts,
    auditEvents,
    adverseEvents,
    user,
    dataLoading,
    module,
    consentKpis,
    regulatoryKpis,
  ]);

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setLoginBusy(true);
    setLoginError(null);
    try {
      await login(email, password);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoginBusy(false);
    }
  }

  return (
    <section ref={sectionRef} className="cmd" aria-labelledby="cmd-heading">
      <div className="container cmd__lead">
        <span className="eyebrow">Operating environment</span>
        <h2 id="cmd-heading" className="h2">
          The research command center
        </h2>
        <p className="body">
          One operational surface for studies, risk, safety, compliance, and audit — denser than
          the story above, built for day-to-day work.
        </p>

        <div className="cmd__auth">
          {authLoading ? (
            <p className="mono cmd__auth-status">Checking session…</p>
          ) : user ? (
            <div className="cmd__auth-row">
              <p className="mono cmd__auth-status">
                Signed in as <strong>{user.name}</strong> ({user.roles.join(", ")})
              </p>
              <button type="button" className="cmd__auth-btn" onClick={() => void logout()}>
                Sign out
              </button>
              <button
                type="button"
                className="cmd__auth-btn cmd__auth-btn--ghost"
                onClick={() => void loadOps()}
              >
                Refresh
              </button>
            </div>
          ) : (
            <form className="cmd__login" onSubmit={onLogin}>
              <label>
                <span className="ui-label">Demo account</span>
                <select
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-label="Demo account"
                >
                  {DEMO_ACCOUNTS.map((a) => (
                    <option key={a.email} value={a.email}>
                      {a.label} — {a.email}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="ui-label">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </label>
              <button type="submit" className="cmd__auth-btn" disabled={loginBusy}>
                {loginBusy ? "Signing in…" : "Sign in"}
              </button>
              {(loginError || authError) && (
                <p className="cmd__auth-error" role="alert">
                  {loginError || authError}
                </p>
              )}
              <p className="mono cmd__auth-hint">Demo password: Vedraya!Demo1 · synthetic data only</p>
            </form>
          )}
        </div>
      </div>

      <div ref={stageRef} id="command-center" className="cmd__stage">
        <p ref={focusRef} className="mono cmd__focus" aria-live="polite">
          Focus: {module === "overview" ? focus.toUpperCase() : module.toUpperCase()}
        </p>
        <div ref={slotRef} className="cmd__slot">
          <div ref={shellRef} className="cmd__shell">
            <DashboardPreview
              focus={focus}
              user={user}
              studies={studies}
              kpis={kpis}
              consentKpis={consentKpis}
              regulatoryKpis={regulatoryKpis}
              alerts={alerts}
              auditEvents={auditEvents}
              adverseEvents={adverseEvents}
              loading={dataLoading}
              error={dataError}
              source={user ? "live" : "offline"}
              module={module}
              moduleFilter={moduleFilter}
              onModuleChange={(m, f = null) => {
                setModule(m);
                setModuleFilter(f);
              }}
              onOpsChanged={() => void loadOps()}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
