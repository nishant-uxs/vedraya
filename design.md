# AIIA ResearchOS — Design System & Motion Bible

## 01. Product Identity

Product name: **AIIA ResearchOS**
Descriptor: **Clinical Research Intelligence Platform**

Core idea:

> Clinical research, finally operating as one system.

The experience must feel like:
- premium scientific infrastructure
- enterprise intelligence
- clinical research command center
- cinematic product storytelling

It must NOT feel like:
- generic SaaS
- student dashboard
- medical stock-photo website
- crypto/Web3 product
- template-generated admin panel
- Apple clone

Use Apple's underlying design principles for hierarchy, spacing, typography, contrast, consistency, and motion discipline — **not Apple's branding or visual identity**.

---

# 02. Visual Direction

### Core visual language

Dark, sophisticated, precise, technical.

Palette:
- near-black / midnight navy background
- soft white primary text
- cool gray secondary text
- electric cyan primary accent
- restrained violet secondary accent
- green / amber / red only for actual status

Avoid:
- neon overload
- huge gradient blobs
- excessive glassmorphism
- cartoon medical imagery
- stock doctors/hospitals
- decorative 3D objects without product meaning

### Typography

Use a modern grotesk such as Geist/Inter.

Create a deliberate type scale.

Suggested:
- Display: 72–96px desktop
- H1: 56–72px
- H2: 40–52px
- H3: 24–32px
- Body: 16–18px
- Small UI: 12–14px

Use fewer font weights. Prefer hierarchy through size, spacing and contrast.

### Spacing

Use a consistent spacing system based around 4/8px increments.

Do not mix arbitrary values such as 20px, 22px, 27px without a reason.

### Radius

Use a coherent radius system:
- large containers: 18–20px
- cards: 14–16px
- controls: 10–12px
- pills: fully rounded

Nested elements must use compatible radii.

---

# 03. Website Story

The website is a cinematic long-scroll product story.

The scroll itself should explain:

FRAGMENTED DATA
→ UNIFIED RESEARCH SYSTEM
→ RISK DETECTION
→ ACTION
→ SAFETY
→ COMPLIANCE
→ INTEROPERABILITY
→ AUDITABILITY
→ INTELLIGENCE

Do not build a collection of unrelated marketing sections.

Every section must advance the product story.

---

# 04. Hero

Full viewport.

Navigation:
AIIA ResearchOS

Platform
Intelligence
Safety
Compliance
Interoperability

CTA:
Enter Command Center →

Hero headline:

> Clinical research,
> finally operating
> as one system.

Supporting text:

> A real-time clinical research command center connecting trials, safety, compliance, sites and research data into one auditable intelligence layer.

### Hero visual

Create an abstract research network.

Center:
AIIA RESEARCHOS CORE

Connected nodes:
TRIALS
SITES
SAFETY
COMPLIANCE
FHIR
CDISC
AUDIT

Floating metrics:
27 ACTIVE STUDIES
04 HIGH RISK
12 OPEN ALERTS
98.2% DATA INTEGRITY

The network should subtly move.

### Hero animation

On scroll:
1. network slowly scales
2. nodes move toward the center
3. connection lines converge
4. floating metrics collapse
5. network morphs into the command center dashboard
6. dashboard becomes pinned
7. next section continues from the dashboard

This should be the signature animation.

---

# 05. Fragmented Research Section

Headline:

> Clinical research doesn't fail because there isn't enough data.

Second line:

> It fails when the data is fragmented.

Create floating fragments:
- SPREADSHEETS
- DISCONNECTED TOOLS
- MISSED DEADLINES
- SAFETY DELAYS
- DATA SILOS

Use horizontal scroll.

As the user scrolls, fragments drift together.

Final state:

> ONE RESEARCH SYSTEM

Animate the fragments physically converging into one central system.

---

# 06. Command Center Reveal

Create a realistic premium dashboard.

Dashboard modules:
- risk overview
- recruitment
- safety
- regulatory deadlines
- site performance
- data quality
- recent activity

Use scroll-driven zoom:

Overview
→ Study
→ Risk
→ Safety
→ Compliance
→ Audit

The dashboard should feel like a real product, not a mock screenshot.

Use subtle cursor interactions and hover states.

---

# 07. Risk Intelligence

Headline:

> See the risk before it becomes critical.

Study:
AYU-024

Risk:
78 — HIGH RISK

Factors:

Recruitment delay +24
Site inactivity +15
Open queries +12
Protocol deviations +10
SAE deadline +17

Animate each factor into view.

Then reveal:

> Why is this study high risk?

The system explains the actual contributing factors.

Do not present the risk model as clinically validated. Label it as an operational monitoring score.

---

# 08. Trial Lifecycle

Create a pinned horizontal timeline:

PROTOCOL
→ ETHICS
→ CTRI
→ SITE ACTIVATION
→ RECRUITMENT
→ MONITORING
→ DATA LOCK
→ ANALYSIS
→ CLOSEOUT

The active stage expands.

Use an animated SVG path / progress line.

Example active state:

RECRUITMENT
Target: 500
Enrolled: 327
Progress: 65.4%
Projected completion: 14 Aug 2027

---

# 09. Safety Intelligence

Headline:

> Safety doesn't belong in another spreadsheet.

Visual hierarchy:

AE
→ SAE
→ ADR
→ SAFETY SIGNAL

Workflow:

REPORTED
→ TRIAGED
→ UNDER REVIEW
→ CAUSALITY
→ REGULATORY
→ CLOSED

Use animated transitions between stages.

Show safety trend graphs and event distributions.

Do not use medical claims or diagnosis.

---

# 10. Compliance Engine

Headline:

> Compliance shouldn't be a report you generate.

Second line:

> It should be a system that continuously checks itself.

Live matrix:

ETHICS APPROVAL ✓
CTRI REGISTRATION ✓
CONSENT VERSION ✓
MONITORING ⚠
SAFETY REPORTING ✓
AUDIT TRAIL ✓
DATA INTEGRITY ⚠

Hover / click a warning to open contextual evidence.

Example:

2 overdue monitoring reports

Affected studies:
AYU-024
AYU-031

Recommended operational action:
Schedule monitoring visit

---

# 11. Interoperability

Headline:

> One research system.
> Every standard.

Create animated pipeline:

EDC
↓
CTMS
↓
FHIR / CDISC
↓
ABDM / SDTM / ADaM

Animate a real field transformation:

participant_id
↓
FHIR ResearchSubject.identifier
↓
SDTM USUBJID

Show:
source
transformation
validation
destination

The UI should feel technical and exact.

---

# 12. Audit Trail

Headline:

> If it changed, we know who changed it.

Create cinematic vertical audit stream.

Example:

14:32:08
Dr. Ananya Sharma

UPDATED
Recruitment Target

200 → 250

Reason:
Protocol Amendment v2.1

Then:
System → VALIDATED
Regulatory Officer → REVIEWED

Use a glowing timeline.

---

# 13. Research Copilot

Headline:

> Ask the research system.

Do not create a generic chatbot.

Create an embedded enterprise intelligence interface.

Question:
Why is AYU-024 high risk?

Response appears progressively:

AYU-024 is currently classified as HIGH RISK.

Recruitment is 31% below trajectory.
Site 03 has had no recruitment activity for 18 days.
Two monitoring visits are overdue.

Recommended operational actions:
Review Site 03
Schedule monitoring visit
Resolve high-priority queries

Responses must be grounded in application data.

Include suggested prompts:
- What changed this week?
- Show overdue regulatory actions
- Which sites need attention?
- Summarize this study

---

# 14. Role-Based Experience

Create horizontal role selector:

Principal Investigator
Ethics Committee
Pharmacovigilance
Regulatory
Institutional Leadership

Changing role changes the dashboard content.

Do this as a visual demonstration of RBAC.

---

# 15. Final Section

Minimal dark section.

Huge typography:

> One system.
> Every study.
> Every signal.
> Every decision.
>
> Auditable.

CTA:
ENTER THE COMMAND CENTER →

---

# 16. Motion System

Motion is a first-class design feature.

Use:
- GSAP
- ScrollTrigger
- Lenis or equivalent smooth-scroll system
- Framer Motion where appropriate
- IntersectionObserver for lightweight reveals
- SVG path animations
- transform/opacity animations
- pinned sections
- horizontal scroll sections
- parallax layers
- number counters
- chart drawing
- text split/reveal
- magnetic buttons
- cursor interactions
- dashboard zoom transitions
- morphing cards

### Motion rules

Motion must communicate:
- hierarchy
- causality
- transformation
- continuity
- system relationships

Never animate purely for decoration.

Use transform and opacity for performance.

Avoid layout-thrashing properties.

Support prefers-reduced-motion.

---

# 17. Motion Intensity

The user explicitly wants a highly animated experience.

Use many animations, but make them coherent.

Target:
- hero: very high
- product reveal: very high
- risk section: high
- lifecycle: high
- safety: medium-high
- compliance: medium
- interoperability: high
- audit: medium
- AI: medium-high
- final CTA: restrained

The experience should feel alive throughout the scroll.

---

# 18. Interaction Details

Buttons:
- magnetic movement
- subtle hover lift
- animated border
- directional arrow movement

Cards:
- slight hover translation
- subtle border glow
- data updates on hover
- controlled parallax

Charts:
- draw on entry
- animate values
- highlight related points on hover

Network:
- moving connection pulses
- nodes react to cursor
- connections illuminate when relevant

Dashboard:
- cards expand into detail
- filters animate
- metric counters interpolate
- risk score changes smoothly

Timeline:
- progress line follows scroll
- active stage expands
- previous stage compresses
- next stage previews

---

# 19. Responsive Motion

Desktop:
cinematic pinned sections and horizontal storytelling.

Tablet:
retain major scroll transitions.

Mobile:
convert complex horizontal sequences to vertical sequences.

Never simply shrink desktop.

Disable/reduce expensive motion when prefers-reduced-motion is enabled.

---

# 20. Actual Application UI

The landing page can be cinematic.

The actual command center must prioritize speed and information density.

Application sidebar:

Overview
Studies
Sites
Recruitment
Safety & Pharmacovigilance
Regulatory
Compliance
Data Quality
Interoperability
CDISC
Audit Trail
Evidence Vault
Analytics
Research Copilot
Alerts
Administration

Application visual language:
- dense
- precise
- readable
- fast
- minimal decoration
- excellent tables
- strong filtering
- drill-down

---

# 21. Apple Design Audit Principles

Use Apple's published design principles as an audit framework.

Do NOT imitate Apple's branding.

Audit:
- typography hierarchy
- spacing consistency
- alignment
- contrast
- component consistency
- nested corner radii
- motion quality
- accessibility
- responsive behaviour
- interaction feedback

Use measurable values.

For every issue:
- exact element
- current value
- target value
- principle
- impact
- file/selector

Do not invent issues.

If correct:
FINE — NO CHANGE REQUIRED.

After implementation:
fix only the top three highest-impact issues at a time, then re-audit.

---

# 22. Performance

Animation must not destroy performance.

Requirements:
- GPU-friendly transforms
- avoid unnecessary blur
- avoid animating width/height/top/left when transform works
- lazy-load heavy visual assets
- avoid massive WebGL scenes unless necessary
- use requestAnimationFrame appropriately
- respect reduced motion
- maintain smooth scrolling
- test on mid-range laptop hardware

---

# 23. Accessibility

Support:
- keyboard navigation
- visible focus
- semantic HTML
- sufficient contrast
- reduced motion
- readable font sizes
- screen-reader labels for interactive visualizations

Do not make animations required to understand the content.

---

# 24. Component System

Build reusable components:

HeroNetwork
MetricTicker
ScrollReveal
PinnedSection
ParallaxLayer
NetworkGraph
DashboardPreview
RiskScore
RiskFactor
LifecycleTimeline
SafetyFlow
ComplianceMatrix
AuditTimeline
InteropPipeline
CopilotPanel
RoleSwitcher
AnimatedChart
MagneticButton
GlassPanel
StatusBadge
CommandPalette

Avoid one-off duplicated components.

---

# 25. Reference Philosophy

Use these reference categories:

1. Apple Vision Pro:
   scroll choreography, cinematic storytelling, pinned transitions

2. Palantir Foundry:
   operational intelligence, information density, command-center UX

3. Modern CTMS:
   clinical research data hierarchy

4. Pharmacovigilance dashboards:
   safety workflows and event visualization

5. Apple's design principles:
   spacing, typography, hierarchy, consistency, motion discipline

Do NOT copy any brand's visual identity.

The final product must have an original AIIA ResearchOS identity.

---

# 26. Final Quality Bar

The result should feel:

- breathtaking on first scroll
- technically credible
- premium
- cinematic
- highly interactive
- sophisticated
- trustworthy
- clinical without being boring
- futuristic without being gimmicky

The judge should immediately understand:

WHAT THE PROBLEM IS
→ HOW THE PLATFORM CONNECTS EVERYTHING
→ HOW IT DETECTS RISK
→ HOW IT HANDLES SAFETY
→ HOW IT MONITORS COMPLIANCE
→ HOW DATA INTEROPERATES
→ HOW EVERYTHING REMAINS AUDITABLE

The scroll experience itself should tell this story.

Do not build a static landing page with animations sprinkled on top.

Build a **motion-driven product narrative**.
