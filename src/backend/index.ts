import "dotenv/config";
import express from "express";
import cors from "cors";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import { auth } from "./lib/auth.js";
import { classroomsRouter } from "./modules/classrooms/classrooms.routes.js";
import { assignmentsRouter } from "./modules/assignments/assignments.routes.js";
import { submissionsRouter } from "./modules/submissions/submissions.routes.js";
import { webhooksRouter } from "./modules/github/webhooks.routes.js";
import { gradesRouter } from "./modules/grades/grades.routes.js";
import { requireAuth } from "./middleware/auth.js";

export { requireAuth };

const app: express.Express = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Mount Better Auth router before express.json() so body streaming works properly
app.all(["/api/auth", "/api/auth/{*path}"], toNodeHandler(auth));

app.use(
  express.json({
    verify: (req: express.Request, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// GET /users/me endpoint per agent.md spec
app.get("/users/me", requireAuth, (req: express.Request, res: express.Response) => {
  res.json(req.user);
});

// Classrooms Module (Phase 4 & 5)
app.use("/classrooms", requireAuth, classroomsRouter);
app.use("/api/classrooms", requireAuth, classroomsRouter);

// Assignments Module (Phase 6)
app.use("/assignments", requireAuth, assignmentsRouter);
app.use("/api/assignments", requireAuth, assignmentsRouter);

// Submissions Module (Phase 8 & 9)
app.use("/submissions", requireAuth, submissionsRouter);
app.use("/api/submissions", requireAuth, submissionsRouter);

// Webhook Endpoints (Phase 10: GitHub App Webhooks - Unauthenticated, verified by HMAC)
app.use("/api/webhooks/github", webhooksRouter);
app.use("/webhooks/github", webhooksRouter);
app.use("/github/webhook", webhooksRouter);

// Grades Module (Phase 11: Tier 1 Autograding & Ingestion)
app.use("/grades", gradesRouter);
app.use("/api/grades", gradesRouter);

// Health check
app.get("/health", (_req: express.Request, res: express.Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export { app };

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log(`Auth endpoints available at http://localhost:${port}/api/auth`);
  });
}
