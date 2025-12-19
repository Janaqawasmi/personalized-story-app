import { Request, Response } from 'express';
import { firestore } from '../config/firebase';
import { StoryBrief } from '../models/storyBrief.model';

export const listStoryBriefs = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Try with orderBy first, fallback to simple query if index is missing
    let snapshot;
    try {
      snapshot = await firestore.collection('admin_story_briefs').orderBy('createdAt', 'desc').get();
    } catch (orderByError: any) {
      // If orderBy fails (likely missing index), just get all documents
      console.warn('orderBy failed, fetching without ordering:', orderByError.message);
      snapshot = await firestore.collection('admin_story_briefs').get();
    }

    const briefs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Sort manually if we couldn't use orderBy
    briefs.sort((a: any, b: any) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    res.status(200).json({
      success: true,
      data: briefs,
    });
  } catch (error: any) {
    console.error('Error listing story briefs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list story briefs',
      details: error.message,
    });
  }
};

export const createStoryBrief = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      topicKey,
      targetAgeGroup,
      therapeuticMessages,
      shortDescription,
      status,
      createdBy,
    } = req.body;

    // Validate required fields
    if (!topicKey || !targetAgeGroup || !therapeuticMessages || !createdBy) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: topicKey, targetAgeGroup, therapeuticMessages, createdBy',
      });
      return;
    }

    // Validate therapeuticMessages is an array
    if (!Array.isArray(therapeuticMessages)) {
      res.status(400).json({
        success: false,
        error: 'therapeuticMessages must be an array',
      });
      return;
    }

    // Validate status if provided
    if (status && status !== 'pending_generation' && status !== 'draft_generated') {
      res.status(400).json({
        success: false,
        error: 'status must be either "pending_generation" or "draft_generated"',
      });
      return;
    }

    // Create story brief document
    const storyBrief: Omit<StoryBrief, 'id'> = {
      topicKey,
      targetAgeGroup,
      therapeuticMessages,
      shortDescription,
      status: status || 'pending_generation',
      createdAt: new Date().toISOString(),
      createdBy,
    };

    // Save to Firestore
    const docRef = await firestore.collection('admin_story_briefs').add(storyBrief);

    res.status(201).json({
      success: true,
      id: docRef.id,
      data: {
        ...storyBrief,
        id: docRef.id,
      },
    });
  } catch (error) {
    console.error('Error creating story brief:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create story brief',
    });
  }
};

