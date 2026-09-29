import { Router } from "express";
import { authenticate, requirePermission } from "../../middleware/auth.js";

/**
 * Interoperability adapter status surface.
 * FHIR = WORKING (prototype). ABDM/HIS/EDC = PLANNED / NOT CONNECTED.
 * Never claim CONNECTED without a real external integration.
 */
export type AdapterStatus = "WORKING" | "PROTOTYPE" | "PLANNED" | "NOT_CONNECTED";

export type InteropAdapterDescriptor = {
  id: string;
  name: string;
  status: AdapterStatus;
  capabilities: Array<"send" | "receive" | "validate" | "transform" | "status">;
  note: string;
};

const ADAPTERS: InteropAdapterDescriptor[] = [
  {
    id: "fhir",
    name: "FHIR R4 adapter",
    status: "PROTOTYPE",
    capabilities: ["receive", "validate", "transform", "status"],
    note: "ResearchStudy / ResearchSubject read endpoints from PostgreSQL — not FHIR certified",
  },
  {
    id: "abdm",
    name: "ABDM adapter",
    status: "PLANNED",
    capabilities: ["status"],
    note: "NOT CONNECTED — no ABDM credentials or gateway integration",
  },
  {
    id: "his",
    name: "HIS adapter",
    status: "PLANNED",
    capabilities: ["status"],
    note: "NOT CONNECTED — hospital information system bridge not implemented",
  },
  {
    id: "edc",
    name: "EDC adapter",
    status: "PLANNED",
    capabilities: ["status"],
    note: "NOT CONNECTED — external EDC sync not implemented",
  },
];

export const interopRouter = Router();

interopRouter.get("/adapters", authenticate, requirePermission("fhir:view"), (_req, res) => {
  res.json({
    data: ADAPTERS,
    meta: {
      note: "Statuses are honest: PROTOTYPE / PLANNED / NOT_CONNECTED — never fake CONNECTED",
    },
  });
});

interopRouter.get("/adapters/:id", authenticate, requirePermission("fhir:view"), (req, res) => {
  const adapter = ADAPTERS.find((a) => a.id === req.params.id);
  if (!adapter) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Adapter not found" } });
    return;
  }
  res.json({ data: adapter });
});
