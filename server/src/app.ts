import "dotenv/config";
console.log("OPENAI KEY EXISTS:", !!process.env.OPENAI_API_KEY);

import express, { Request, Response } from "express";
import cors from "cors";

import { admin, firestore } from "./config/firebase";
import personalizedStoryRoutes from "./routes/personalizedStory.routes";

import storyDraftRoutes from "./routes/storyDraft.routes";
import storyBriefRouter from "./routes/storyBrief.routes";
import templateRoutes from "./routes/template.routes";

const app = express();
const port = process.env.PORT || 5000;

// ---------- MIDDLEWARE ----------
app.use(cors());
app.use(express.json());

// ---------- ROUTES ----------
app.use("/api/story-templates", templateRoutes);
app.use("/api/story-drafts", storyDraftRoutes);
app.use("/api/admin/story-briefs", storyBriefRouter);
//personlized story routes
app.use("/api/personalized-stories", personalizedStoryRoutes);

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

// ---------- START SERVER ----------
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

export default app;
