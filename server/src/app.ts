import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middleware/errors.js";
import { csrfProtection } from "./middleware/csrf.js";
import { authRouter } from "./modules/auth/routes.js";
import { studiesRouter } from "./modules/studies/routes.js";
import { sitesRouter } from "./modules/sites/routes.js";
import { investigatorsRouter } from "./modules/investigators/routes.js";
import { participantsRouter } from "./modules/participants/routes.js";
import { milestonesRouter } from "./modules/milestones/routes.js";
import { auditRouter } from "./modules/audit/routes.js";
import { aeRouter } from "./modules/adverse-events/routes.js";
import { fhirRouter } from "./modules/interop/fhir.js";
import { interopRouter } from "./modules/interop/adapters.js";
import { exportsRouter } from "./modules/exports/routes.js";
import { alertsRouter } from "./modules/alerts/routes.js";
import { consentsRouter } from "./modules/consents/routes.js";
import { regulatoryRouter } from "./modules/regulatory/routes.js";
import { codingRouter } from "./modules/coding/routes.js";
import { qualityRouter } from "./modules/quality/routes.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use("/api/v1", csrfProtection);

  app.get("/api/v1/health", (_req, res) => {
    res.json({
      data: {
        ok: true,
        service: "vedraya-api",
        version: "0.1.0",
        time: new Date().toISOString(),
      },
    });
  });

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/studies", studiesRouter);
  app.use("/api/v1/sites", sitesRouter);
  app.use("/api/v1/investigators", investigatorsRouter);
  app.use("/api/v1/participants", participantsRouter);
  app.use("/api/v1/milestones", milestonesRouter);
  app.use("/api/v1/adverse-events", aeRouter);
  app.use("/api/v1/coding", codingRouter);
  app.use("/api/v1/quality", qualityRouter);
  app.use("/api/v1/consents", consentsRouter);
  app.use("/api/v1/regulatory", regulatoryRouter);
  app.use("/api/v1/audit-events", auditRouter);
  app.use("/api/v1/alerts", alertsRouter);
  app.use("/api/v1/fhir", fhirRouter);
  app.use("/api/v1/interop", interopRouter);
  app.use("/api/v1/exports", exportsRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
