import { Request, Response } from 'express';
import { firestore } from '../config/firebase';
import { StoryBrief } from '../models/storyBrief.model';

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

