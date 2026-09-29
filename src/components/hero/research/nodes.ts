export type ResearchNodeId =
  | "trials"
  | "safety"
  | "compliance"
  | "sites"
  | "data"
  | "audit";

export type ResearchNodeConfig = {
  id: ResearchNodeId;
  label: string;
  detail: string;
  /** degrees from 12 o'clock, clockwise */
  angle: number;
  /** 0–1 radius relative to network */
  radius: number;
  /** seconds for one orbit */
  period: number;
  active: boolean;
  mobile: boolean;
};

export const RESEARCH_NODES: ResearchNodeConfig[] = [
  {
    id: "trials",
    label: "Trials",
    detail: "27 active",
    angle: -128,
    radius: 0.78,
    period: 48,
    active: true,
    mobile: true,
  },
  {
    id: "safety",
    label: "Safety",
    detail: "12 open events",
    angle: -38,
    radius: 0.72,
    period: 36,
    active: true,
    mobile: true,
  },
  {
    id: "compliance",
    label: "Compliance",
    detail: "4 reviews",
    angle: 48,
    radius: 0.8,
    period: 42,
    active: true,
    mobile: true,
  },
  {
    id: "sites",
    label: "Sites",
    detail: "64 online",
    angle: 138,
    radius: 0.74,
    period: 40,
    active: true,
    mobile: false,
  },
  {
    id: "data",
    label: "Data",
    detail: "98.2% integrity",
    angle: 176,
    radius: 0.88,
    period: 52,
    active: false,
    mobile: false,
  },
  {
    id: "audit",
    label: "Audit",
    detail: "Live trail",
    angle: -168,
    radius: 0.86,
    period: 56,
    active: false,
    mobile: false,
  },
];

export const RESEARCH_METRICS = [
  { id: "studies", value: "27", label: "Active studies" },
  { id: "integrity", value: "98.2%", label: "Data integrity" },
] as const;

/** SVG viewBox center and unit radius */
export const NET = {
  cx: 250,
  cy: 250,
  size: 500,
  coreR: 58,
} as const;
