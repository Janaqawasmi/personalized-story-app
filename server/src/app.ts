import express, { Request, Response } from 'express';
import cors from 'cors';
import { admin, firestore } from './config/firebase';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

export default app;
