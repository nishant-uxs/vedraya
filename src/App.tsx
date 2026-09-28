import { lazy, Suspense } from "react";
import { useLenis } from "./lib/useLenis";
import { Navbar } from "./components/nav/Navbar";
import { Hero } from "./components/hero/Hero";

const FragmentedData = lazy(() =>
  import("./components/sections/FragmentedData").then((m) => ({ default: m.FragmentedData })),
);
const CommandCenter = lazy(() =>
  import("./components/sections/CommandCenter").then((m) => ({ default: m.CommandCenter })),
);
const RiskIntelligence = lazy(() =>
  import("./components/sections/RiskIntelligence").then((m) => ({ default: m.RiskIntelligence })),
);
const TrialLifecycle = lazy(() =>
  import("./components/sections/TrialLifecycle").then((m) => ({ default: m.TrialLifecycle })),
);
const SafetyIntelligence = lazy(() =>
  import("./components/sections/SafetyIntelligence").then((m) => ({
    default: m.SafetyIntelligence,
  })),
);
const ComplianceMatrix = lazy(() =>
  import("./components/sections/ComplianceMatrix").then((m) => ({ default: m.ComplianceMatrix })),
);
const InteropPipeline = lazy(() =>
  import("./components/sections/InteropPipeline").then((m) => ({ default: m.InteropPipeline })),
);
const AuditTimeline = lazy(() =>
  import("./components/sections/AuditTimeline").then((m) => ({ default: m.AuditTimeline })),
);
const CopilotPanel = lazy(() =>
  import("./components/sections/CopilotPanel").then((m) => ({ default: m.CopilotPanel })),
);
const RoleSwitcher = lazy(() =>
  import("./components/sections/RoleSwitcher").then((m) => ({ default: m.RoleSwitcher })),
);
const FinalCTA = lazy(() =>
  import("./components/sections/FinalCTA").then((m) => ({ default: m.FinalCTA })),
);

function SectionFallback() {
  return <div className="section" aria-hidden style={{ minHeight: "40vh" }} />;
}

export default function App() {
  useLenis();

  return (
    <>
      <a href="#main" className="sr-only">
        Skip to content
      </a>
      <Navbar />
      <main id="main">
        <Hero />
        <Suspense fallback={<SectionFallback />}>
          <FragmentedData />
          <CommandCenter />
          <RiskIntelligence />
          <TrialLifecycle />
          <SafetyIntelligence />
          <ComplianceMatrix />
          <InteropPipeline />
          <AuditTimeline />
          <CopilotPanel />
          <RoleSwitcher />
          <FinalCTA />
        </Suspense>
      </main>
    </>
  );
}
