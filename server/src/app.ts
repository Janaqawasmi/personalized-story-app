// server/src/app.ts
//
// PHASE 1 CHANGES:
//   - Removed duplicate storyDraftRoutes mount
//   - All specialist/admin routes now go through auth middleware (applied at router level)
//   - Added comment explaining which routes are protected and how

import "dotenv/config";
console.log("OPENAI KEY EXISTS:", !!process.env.OPENAI_API_KEY);

// ---------- GLOBAL ERROR HANDLERS ----------
process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error: Error) => {
  console.error("Uncaught Exception:", error);
});

// ---------- IMPORTS ----------
import express, { Request, Response } from "express";
import cors from "cors";

import { admin, firestore } from "./config/firebase";

import storyDraftRoutes from "./routes/storyDraft.routes";
import storyBriefRouter from "./routes/storyBrief.routes";
import agent1Routes from "./routes/agent1.routes";
import templateRoutes from "./routes/template.routes";
import personalizedStoryRoutes from "./routes/personalizedStory.routes";
import storyReviewRoutes from "./routes/storyReview.routes";
import specialistPromptRoutes from "./routes/specialistPrompt.routes";
import storiesRoutes from "./routes/stories.routes";
import referenceDataRoutes from "./routes/referenceData.routes";

// ---------- APP ----------
const app = express();
const port = process.env.PORT || 5000;

// ---------- MIDDLEWARE ----------
app.use(cors());
app.use(express.json());

// ---------- ROUTES ----------
//
// AUTHENTICATION STRATEGY:
//   Auth middleware is applied at the ROUTER level (inside each router file),
//   not here at the app level. This allows:
//     - Public routes (templates, stories) to remain unauthenticated
//     - Specialist routes to require auth + role checks
//     - Generation routes to additionally require contract approval
//
//   See individual route files for their auth requirements:
//     - storyBrief.routes.ts    → requireAuth on all, requireRole on mutations
//     - agent1.routes.ts        → requireAuth on all, requireRole on approvals
//     - storyDraft.routes.ts    → requireAuth on all (read-only)
//

// Public routes (no auth required)
app.use("/api/story-templates", templateRoutes);
app.use("/api/stories", storiesRoutes);
app.use("/api/personalized-stories", personalizedStoryRoutes);
app.use("/api/reference-data", referenceDataRoutes);

// Protected routes (auth enforced at router level)
app.use("/api/admin/story-briefs", storyBriefRouter);
app.use("/api/agent1", agent1Routes);
app.use("/api/story-drafts", storyDraftRoutes);
app.use("/api/specialist", specialistPromptRoutes);

// PHASE 1 FIX: Removed duplicate mount of storyDraftRoutes.
// Previously mounted twice at "/api/story-drafts" — this caused
// double middleware execution and unpredictable behavior.

// REVIEW/APPROVAL ENDPOINTS — uncomment when storyReview routes are updated with auth
// app.use("/api/specialist/reviews", storyReviewRoutes);

// ---------- HEALTH CHECK ----------
app.get("/", (_req: Request, res: Response) => {
  res.json({ status: "ok", message: "Server is running" });
});

// ---------- FIRESTORE WRITE TEST ----------
app.post("/api/test-firestore", async (_req: Request, res: Response) => {
  try {
    await firestore.collection("tests").add({
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Error writing test document to Firestore:", error);
    res.status(500).json({ success: false });
  }
});

// ---------- EXPRESS ERROR HANDLER (LAST) ----------
app.use((err: any, _req: Request, res: Response, _next: any) => {
  console.error("Express error:", err);
  res.status(500).json({
    error: "Internal server error",
    details: err.message,
  });
});

// ---------- START SERVER ----------
const server = app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});

// ---------- SERVER ERROR ----------
server.on("error", (error: any) => {
  console.error("Server error:", error);
});

// ---------- GRACEFUL SHUTDOWN ----------
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

export default app;
