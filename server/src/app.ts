import "dotenv/config";
console.log("OPENAI KEY EXISTS:", !!process.env.OPENAI_API_KEY);

// Add error handlers BEFORE any other imports that might cause issues
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - just log the error
});

process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit immediately - log and let the server try to continue
  // In production, you might want to exit gracefully
});

import storyDraftRoutes from "./routes/storyDraft.routes";
import express, { Request, Response } from 'express';
import cors from 'cors';
import { admin, firestore } from './config/firebase';
import storyBriefRouter from './routes/storyBrief.routes';
import storyReviewRoutes from "./routes/storyReview.routes";

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/specialist", storyReviewRoutes);

app.use("/api/story-drafts", storyDraftRoutes);

app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.post('/api/test-firestore', async (_req: Request, res: Response) => {
  try {
    await firestore.collection('tests').add({
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error writing test document to Firestore:', error);
    res.status(500).json({ success: false, error: 'Failed to write to Firestore' });
  }
});

app.use('/api/admin/story-briefs', storyBriefRouter);

// Error handling middleware (should be last)
app.use((err: any, _req: Request, res: Response, _next: any) => {
  console.error('Express error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

const server = app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

// Keep the process alive
server.on('error', (error: any) => {
  console.error('Server error:', error);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
