// server/src/app.ts
//
// PHASE 1 CHANGES:
//   - All specialist/admin routes now go through auth middleware (applied at router level)
//   - Added comment explaining which routes are protected and how

import "dotenv/config";
console.log("OPENAI KEY EXISTS:", !!process.env.OPENAI_API_KEY);
console.log("ARK API KEY EXISTS:", !!process.env.ARK_API_KEY);
console.log("[startup] ElevenLabs key present:", !!process.env.ELEVENLABS_API_KEY?.trim());
if (!process.env.ELEVENLABS_API_KEY?.trim()) {
  console.warn(
    "ELEVENLABS_API_KEY not set — voice clone / TTS endpoints will return 503.",
  );
}

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
import { SeedreamProvider } from "./providers/seedream.provider";
import { registerImageProvider } from "./services/preview.service";
import { registerImageProviderForStory } from "./services/fullStoryGeneration.service";
import { startIllustrationWorker } from "./illustration/worker";
// v2 specialist illustration provider registration will be added in Phase 1
// of the redesign (docs/illustration/spec.md). v1 registration is removed.

import dammaStoryBriefRouter from "./routes/dammaStoryBrief.routes";
import templateRoutes from "./routes/template.routes";
import personalizedStoryRoutes from "./routes/personalizedStory.routes";
import storiesRoutes from "./routes/stories.routes";
import referenceDataRoutes from "./routes/referenceData.routes";

// Auth routes (registration)
import registerCaregiverRouter from "./routes/auth/registerCaregiver.router";

// Ideas routes
import ideasRouter from "./routes/ideas.router";

// Specialist routes
import specialistStoriesRouter from "./routes/specialist/stories.router";
import specialistTemplatesRouter from "./routes/specialist/templates.router";

// Caregiver routes (cart/checkout/previews/account)
import caregiverCartRouter from "./routes/caregiver/cart.router";
import caregiverPreviewsRouter from "./routes/caregiver/previews.router";
import caregiverCheckoutRouter from "./routes/caregiver/checkout.router";
import caregiverAccountRouter from "./routes/caregiver/account.router";
import caregiverStoriesRouter from "./routes/caregiver/stories.router";
import caregiverVoiceRouter from "./routes/caregiver/voice.router";

// ---------- IMAGE PROVIDER ----------
// Register Seedream as the image generation backend for all services.
// Guarded so the server still boots in test/CI environments without the key.
if (process.env.ARK_API_KEY) {
  const seedream = new SeedreamProvider();
  registerImageProvider(seedream);
  registerImageProviderForStory(seedream);
  console.log("Seedream image provider registered.");
} else {
  console.warn(
    "SEEDREAM_API_KEY not set — image generation will be unavailable.",
  );
}

startIllustrationWorker();

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
//     - Generation routes to apply any additional governance middleware (if used)
//
// Public routes (no auth required)
app.use("/api/story-templates", templateRoutes);
app.use("/api/stories", storiesRoutes);
app.use("/api/personalized-stories", personalizedStoryRoutes);
app.use("/api/reference-data", referenceDataRoutes);

// Auth routes (no role required — any authenticated user)
// Final endpoint:
//   POST /api/auth/register-caregiver
app.use("/api/auth", registerCaregiverRouter);

// Ideas (auth enforced at router level)
// Final endpoint:
//   POST /api/ideas
app.use("/api/ideas", ideasRouter);

// Protected routes (auth enforced at router level)
app.use("/api/admin/damma-story-briefs", dammaStoryBriefRouter);
app.use("/api/specialist/stories", specialistStoriesRouter);
app.use("/api/specialist/templates", specialistTemplatesRouter);

// Caregiver endpoints (auth enforced in each router)
app.use("/api/caregiver/cart", caregiverCartRouter);
app.use("/api/caregiver/previews", caregiverPreviewsRouter);
app.use("/api/caregiver/checkout", caregiverCheckoutRouter);
app.use("/api/caregiver/account", caregiverAccountRouter);
app.use("/api/caregiver/stories", caregiverStoriesRouter);
app.use("/api/caregiver/voice", caregiverVoiceRouter);
console.log("✅ caregiver voice routes at /api/caregiver/voice");

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
