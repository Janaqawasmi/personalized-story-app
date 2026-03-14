import { Router, Request, Response } from "express";
import { admin, db } from "../../config/firebase";
import { requireCaregiverAuth } from "../../middleware/caregiverAuth.middleware";
import { COLLECTIONS } from "../../shared/firestore/paths";
import { childProfileConverter } from "../../shared/firestore/converters";
import { AgeGroup, Gender } from "../../shared/types/childProfile";

const router = Router();

const VALID_AGE_GROUPS: AgeGroup[] = ["0_3", "3_6", "6_9", "9_12"];
const VALID_GENDERS: Gender[] = ["male", "female"];

/**
 * POST /api/caregiver/children
 *
 * Create a new child profile.
 */
router.post(
  "/",
  requireCaregiverAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const caregiverUid = req.caregiverUser!.uid;
      const { firstName, gender, ageGroup } = req.body as {
        firstName?: string;
        gender?: string;
        ageGroup?: string;
      };

      // Validation
      if (!firstName || !gender || !ageGroup) {
        res.status(400).json({
          success: false,
          error: "firstName, gender, and ageGroup are required",
        });
        return;
      }

      if (!VALID_GENDERS.includes(gender as Gender)) {
        res.status(400).json({
          success: false,
          error: `Invalid gender. Must be one of: ${VALID_GENDERS.join(", ")}`,
        });
        return;
      }

      if (!VALID_AGE_GROUPS.includes(ageGroup as AgeGroup)) {
        res.status(400).json({
          success: false,
          error: `Invalid ageGroup. Must be one of: ${VALID_AGE_GROUPS.join(", ")}`,
        });
        return;
      }

      const childRef = db
        .collection(COLLECTIONS.children(caregiverUid))
        .doc();

      const childData = {
        firstName: firstName.trim(),
        gender: gender as Gender,
        ageGroup: ageGroup as AgeGroup,
        photoPath: null,
        photoStatus: "none" as const,
        photoUploadedAt: null,
        photoRetainUntil: null,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      };

      await childRef.set(childData);

      // Increment childCount on caregiver
      const caregiverRef = db.collection(COLLECTIONS.CAREGIVERS).doc(caregiverUid);
      await caregiverRef.update({
        childCount: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.Timestamp.now(),
      });

      res.status(201).json({
        success: true,
        data: {
          childId: childRef.id,
          ...childData,
        },
      });
    } catch (error) {
      console.error("Create child error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create child profile",
      });
    }
  }
);

/**
 * GET /api/caregiver/children
 *
 * List all children for the authenticated caregiver.
 */
router.get(
  "/",
  requireCaregiverAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const caregiverUid = req.caregiverUser!.uid;

      const snapshot = await db
        .collection(COLLECTIONS.children(caregiverUid))
        .withConverter(childProfileConverter)
        .orderBy("createdAt", "desc")
        .get();

      const children = snapshot.docs.map((doc) => doc.data());

      res.status(200).json({
        success: true,
        data: children,
      });
    } catch (error) {
      console.error("List children error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to list children",
      });
    }
  }
);

/**
 * GET /api/caregiver/children/:childId
 *
 * Get a single child profile.
 */
router.get(
  "/:childId",
  requireCaregiverAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const caregiverUid = req.caregiverUser!.uid;
      const { childId } = req.params;

      const childDoc = await db
        .collection(COLLECTIONS.children(caregiverUid))
        .withConverter(childProfileConverter)
        .doc(childId!)
        .get();

      if (!childDoc.exists) {
        res.status(404).json({
          success: false,
          error: "Child profile not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: childDoc.data(),
      });
    } catch (error) {
      console.error("Get child error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve child profile",
      });
    }
  }
);

/**
 * PUT /api/caregiver/children/:childId
 *
 * Update a child profile (firstName, gender, ageGroup only).
 */
router.put(
  "/:childId",
  requireCaregiverAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const caregiverUid = req.caregiverUser!.uid;
      const { childId } = req.params;
      const { firstName, gender, ageGroup } = req.body as {
        firstName?: string;
        gender?: string;
        ageGroup?: string;
      };

      const childRef = db
        .collection(COLLECTIONS.children(caregiverUid))
        .doc(childId!);
      const childDoc = await childRef.get();

      if (!childDoc.exists) {
        res.status(404).json({
          success: false,
          error: "Child profile not found",
        });
        return;
      }

      const updates: Record<string, unknown> = {
        updatedAt: admin.firestore.Timestamp.now(),
      };

      if (firstName !== undefined) {
        if (!firstName.trim()) {
          res.status(400).json({
            success: false,
            error: "firstName cannot be empty",
          });
          return;
        }
        updates.firstName = firstName.trim();
      }

      if (gender !== undefined) {
        if (!VALID_GENDERS.includes(gender as Gender)) {
          res.status(400).json({
            success: false,
            error: `Invalid gender. Must be one of: ${VALID_GENDERS.join(", ")}`,
          });
          return;
        }
        updates.gender = gender;
      }

      if (ageGroup !== undefined) {
        if (!VALID_AGE_GROUPS.includes(ageGroup as AgeGroup)) {
          res.status(400).json({
            success: false,
            error: `Invalid ageGroup. Must be one of: ${VALID_AGE_GROUPS.join(", ")}`,
          });
          return;
        }
        updates.ageGroup = ageGroup;
      }

      await childRef.update(updates);

      const updated = await childRef.withConverter(childProfileConverter).get();

      res.status(200).json({
        success: true,
        data: updated.data(),
      });
    } catch (error) {
      console.error("Update child error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update child profile",
      });
    }
  }
);

/**
 * DELETE /api/caregiver/children/:childId
 *
 * Delete a child profile and associated photo.
 */
router.delete(
  "/:childId",
  requireCaregiverAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const caregiverUid = req.caregiverUser!.uid;
      const { childId } = req.params;

      const childRef = db
        .collection(COLLECTIONS.children(caregiverUid))
        .doc(childId!);
      const childDoc = await childRef.get();

      if (!childDoc.exists) {
        res.status(404).json({
          success: false,
          error: "Child profile not found",
        });
        return;
      }

      // Delete associated photo from Storage if exists
      const photoPath = childDoc.data()?.photoPath as string | undefined;
      if (photoPath) {
        try {
          const bucket = admin.storage().bucket();
          const file = bucket.file(photoPath);
          const [exists] = await file.exists();
          if (exists) {
            await file.delete();
          }
        } catch {
          console.warn(`Failed to delete photo for child ${childId}`);
        }
      }

      await childRef.delete();

      // Decrement childCount on caregiver
      const caregiverRef = db.collection(COLLECTIONS.CAREGIVERS).doc(caregiverUid);
      await caregiverRef.update({
        childCount: admin.firestore.FieldValue.increment(-1),
        updatedAt: admin.firestore.Timestamp.now(),
      });

      res.status(200).json({
        success: true,
        data: { deleted: true },
      });
    } catch (error) {
      console.error("Delete child error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete child profile",
      });
    }
  }
);

export default router;
