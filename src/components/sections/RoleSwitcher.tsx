import { useId, useState } from "react";
import { GlassPanel } from "../ui/GlassPanel";
import { StatusBadge } from "../ui/StatusBadge";
import "./RoleSwitcher.css";

type Role =
  | "Principal Investigator"
  | "Ethics Committee"
  | "Pharmacovigilance"
  | "Regulatory"
  | "Institutional Leadership";

const ROLE_MODULES: Record<Role, string[]> = {
  "Principal Investigator": ["My studies", "Recruitment", "Site queries", "Protocol deviations"],
  "Ethics Committee": ["Pending reviews", "Consent versions", "Amendment queue", "Site approvals"],
  Pharmacovigilance: ["Open SAE", "Causality queue", "Signal watch", "Reporting deadlines"],
  Regulatory: ["CTRI status", "Submission calendar", "Inspection readiness", "Audit findings"],
  "Institutional Leadership": [
    "Portfolio risk",
    "Site performance",
    "Capacity",
    "Executive alerts",
  ],
};

const ROLES = Object.keys(ROLE_MODULES) as Role[];

export function RoleSwitcher() {
  const [role, setRole] = useState<Role>("Principal Investigator");
  const baseId = useId();
  const panelId = `${baseId}-panel`;

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    let next = index;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      next = (index + 1) % ROLES.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      next = (index - 1 + ROLES.length) % ROLES.length;
    } else if (e.key === "Home") {
      e.preventDefault();
      next = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      next = ROLES.length - 1;
    } else {
      return;
    }
    setRole(ROLES[next]);
    document.getElementById(`${baseId}-tab-${next}`)?.focus();
  };

  return (
    <section className="roles section" aria-labelledby="roles-heading">
      <div className="container roles__inner">
        <div className="roles__copy">
          <span className="eyebrow">Role-based access</span>
          <h2 id="roles-heading" className="h2">
            The same system. The right surface.
          </h2>
          <p className="body">
            Changing role updates visible modules — the operational surface stays one system.
          </p>
        </div>

        <div className="roles__selector" role="tablist" aria-label="Roles">
          {ROLES.map((r, index) => (
            <button
              key={r}
              id={`${baseId}-tab-${index}`}
              type="button"
              role="tab"
              aria-selected={role === r}
              aria-controls={panelId}
              tabIndex={role === r ? 0 : -1}
              className={role === r ? "is-active" : ""}
              onClick={() => setRole(r)}
              onKeyDown={(e) => onKeyDown(e, index)}
            >
              {r}
            </button>
          ))}
        </div>

        <GlassPanel className="roles__board" as="div">
          <div
            id={panelId}
            role="tabpanel"
            aria-labelledby={`${baseId}-tab-${ROLES.indexOf(role)}`}
          >
            <div className="roles__board-head">
              <StatusBadge label="RBAC active" status="info" />
              <p className="h3">{role}</p>
            </div>
            <ul className="roles__modules">
              {ROLE_MODULES[role].map((mod) => (
                <li key={mod} className="roles__module">
                  {mod}
                </li>
              ))}
            </ul>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
