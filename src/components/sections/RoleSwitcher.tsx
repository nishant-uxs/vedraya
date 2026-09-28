import { useState } from "react";
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

  return (
    <section className="roles section" aria-labelledby="roles-heading">
      <div className="container roles__inner">
        <div className="roles__copy">
          <span className="eyebrow">Role-based access</span>
          <h2 id="roles-heading" className="h2">
            The same system. The right surface.
          </h2>
          <p className="body">Changing role updates visible modules — a visual RBAC demonstration.</p>
        </div>

        <div className="roles__selector" role="tablist" aria-label="Roles">
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={role === r}
              className={role === r ? "is-active" : ""}
              onClick={() => setRole(r)}
            >
              {r}
            </button>
          ))}
        </div>

        <GlassPanel className="roles__board" as="div">
          <div className="roles__board-head">
            <StatusBadge label="RBAC active" status="info" />
            <p className="h3">{role}</p>
          </div>
          <ul className="roles__modules">
            {ROLE_MODULES[role].map((mod) => (
              <li key={mod}>
                <GlassPanel className="roles__module" interactive>
                  {mod}
                </GlassPanel>
              </li>
            ))}
          </ul>
        </GlassPanel>
      </div>
    </section>
  );
}
