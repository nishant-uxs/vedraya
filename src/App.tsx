import { useLenis } from "./lib/useLenis";
import { Navbar } from "./components/nav/Navbar";
import { Hero } from "./components/hero/Hero";
import { FragmentedData } from "./components/sections/FragmentedData";
import { CommandCenter } from "./components/sections/CommandCenter";
import { RiskIntelligence } from "./components/sections/RiskIntelligence";
import { TrialLifecycle } from "./components/sections/TrialLifecycle";
import { SafetyIntelligence } from "./components/sections/SafetyIntelligence";
import { ComplianceMatrix } from "./components/sections/ComplianceMatrix";
import { InteropPipeline } from "./components/sections/InteropPipeline";
import { AuditTimeline } from "./components/sections/AuditTimeline";
import { CopilotPanel } from "./components/sections/CopilotPanel";
import { RoleSwitcher } from "./components/sections/RoleSwitcher";
import { FinalCTA } from "./components/sections/FinalCTA";

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
      </main>
    </>
  );
}
