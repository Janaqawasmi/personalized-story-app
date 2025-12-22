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
import templateRoutes from "./routes/template.routes";
import personalizedStoryRoutes from "./routes/personalizedStory.routes";
import storyReviewRoutes from "./routes/storyReview.routes";
import specialistPromptRoutes from "./routes/specialistPrompt.routes";

// ---------- APP ----------
const app = express();
const port = process.env.PORT || 5000;

// ---------- MIDDLEWARE ----------
app.use(cors());
app.use(express.json());

// ---------- ROUTES ----------
app.use("/api/story-templates", templateRoutes);
app.use("/api/story-drafts", storyDraftRoutes);
app.use("/api/personalized-stories", personalizedStoryRoutes);

app.use("/api/admin/story-briefs", storyBriefRouter);

app.use("/api/specialist/reviews", storyReviewRoutes);
app.use("/api/specialist/prompts", specialistPromptRoutes);

// ---------- DEBUG FIRESTORE ----------
app.get("/api/debug/firestore", async (_req: Request, res: Response) => {
  try {
    const snap = await firestore
      .collection("approved_story_templates")
      .limit(5)
      .get();

    res.json({
      empty: snap.empty,
      count: snap.size,
      docs: snap.docs.map((d) => d.id),
    });
  } catch (error) {
    console.error("🔥 Firestore debug error:", error);
    res.status(500).json({ success: false });
  }
});

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
  console.log(`🚀 Server listening on port ${port}`);
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
