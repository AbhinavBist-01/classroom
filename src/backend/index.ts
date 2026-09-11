import "dotenv/config";
import express from "express";
import cors from "cors";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import { auth } from "./lib/auth.js";

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

app.use(express.json());

// Session authentication middleware
export const requireAuth = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    req.user = session.user;
    req.session = session.session;
    next();
  } catch {
    res.status(500).json({ error: "Authentication verification failed" });
  }
};

// GET /users/me endpoint per agent.md spec
app.get("/users/me", requireAuth, (req: express.Request, res: express.Response) => {
  res.json(req.user);
});

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
