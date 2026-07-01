import { createHash } from "crypto";
import { Router, Request, Response } from "express";
import multer from "multer";
import { admin, db } from "../../config/firebase";
import { requireCaregiverAuth } from "../../middleware/caregiverAuth.middleware";
import { COLLECTIONS, STORAGE_PATHS } from "../../shared/firestore/paths";
import {
  createVoiceClone,
  deleteVoiceClone,
  isElevenLabsConfigured,
  synthesizeSpeech,
} from "../../services/elevenLabsVoice.service";

const router = Router();

const AUDIO_MIMETYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    const mimetype = (file.mimetype || "").toLowerCase();
    if (!AUDIO_MIMETYPES.has(mimetype)) {
      return cb(
        new Error(
          `Unsupported audio format: ${file.mimetype}. Use MP3, WAV, WebM, or M4A.`,
        ),
      );
    }
    cb(null, true);
  },
});

const SIGNED_URL_TTL_MS = 24 * 60 * 60 * 1000;

function elevenLabsUnavailable(res: Response): void {
  res.status(503).json({
    success: false,
    error: {
      code: "ELEVENLABS_NOT_CONFIGURED",
      message: "Voice cloning is not configured on this server.",
    },
  });
}

async function getSignedAudioUrl(storagePath: string): Promise<string> {
  const bucket = admin.storage().bucket();
  const [url] = await bucket.file(storagePath).getSignedUrl({
    action: "read",
    expires: Date.now() + SIGNED_URL_TTL_MS,
  });
  return url;
}

/**
 * POST /api/caregiver/voice/clone
 * multipart: files[] (1–5 audio samples)
 */
router.post(
  "/clone",
  requireCaregiverAuth,
  upload.array("files", 5),
  async (req: Request, res: Response): Promise<void> => {
    if (!isElevenLabsConfigured()) {
      elevenLabsUnavailable(res);
      return;
    }

    try {
      const uid = req.caregiverUser!.uid;
      const files = req.files as Express.Multer.File[] | undefined;

      if (!files?.length) {
        res.status(400).json({
          success: false,
          error: { code: "MISSING_FILES", message: "Upload at least one audio sample." },
        });
        return;
      }

      const caregiverRef = db.collection(COLLECTIONS.CAREGIVERS).doc(uid);
      const caregiverSnap = await caregiverRef.get();
      const existingVoiceId = caregiverSnap.data()?.elevenLabsVoiceId as string | undefined;

      if (existingVoiceId?.trim()) {
        try {
          await deleteVoiceClone(existingVoiceId.trim());
        } catch (deleteErr) {
          console.warn(
            `[voice/clone] Best-effort delete of old voice ${existingVoiceId} failed:`,
            deleteErr,
          );
        }
      }

      const audioBuffers = files.map((file, i) => ({
        buffer: file.buffer,
        filename: file.originalname || `sample_${i}.webm`,
        mimetype: file.mimetype,
      }));

      const { voiceId, requiresVerification } = await createVoiceClone({
        name: `caregiver_${uid}`,
        audioBuffers,
      });

      await caregiverRef.set(
        {
          elevenLabsVoiceId: voiceId,
          elevenLabsVoiceStatus: "ready",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      res.status(200).json({
        success: true,
        data: { voiceId, requiresVerification },
      });
    } catch (error) {
      console.error("[voice/clone] error:", error);
      res.status(502).json({
        success: false,
        error: {
          code: "ELEVENLABS_CLONE_FAILED",
          message: error instanceof Error ? error.message : "Voice clone failed",
        },
      });
    }
  },
);

/**
 * DELETE /api/caregiver/voice
 */
router.delete(
  "/",
  requireCaregiverAuth,
  async (req: Request, res: Response): Promise<void> => {
    if (!isElevenLabsConfigured()) {
      elevenLabsUnavailable(res);
      return;
    }

    try {
      const uid = req.caregiverUser!.uid;
      const caregiverRef = db.collection(COLLECTIONS.CAREGIVERS).doc(uid);
      const caregiverSnap = await caregiverRef.get();

      if (!caregiverSnap.exists) {
        res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "Caregiver account not found." },
        });
        return;
      }

      const existingVoiceId = caregiverSnap.data()?.elevenLabsVoiceId as string | undefined;
      if (existingVoiceId?.trim()) {
        try {
          await deleteVoiceClone(existingVoiceId.trim());
        } catch (deleteErr) {
          console.warn(`[voice/delete] ElevenLabs delete failed for ${existingVoiceId}:`, deleteErr);
        }
      }

      await caregiverRef.set(
        {
          elevenLabsVoiceId: admin.firestore.FieldValue.delete(),
          elevenLabsVoiceStatus: admin.firestore.FieldValue.delete(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      res.status(200).json({ success: true, data: { deleted: true } });
    } catch (error) {
      console.error("[voice/delete] error:", error);
      res.status(502).json({
        success: false,
        error: {
          code: "VOICE_DELETE_FAILED",
          message: error instanceof Error ? error.message : "Voice delete failed",
        },
      });
    }
  },
);

/**
 * POST /api/caregiver/voice/synthesize
 * body: { storyId, pageNumber, text }
 */
router.post(
  "/synthesize",
  requireCaregiverAuth,
  async (req: Request, res: Response): Promise<void> => {
    if (!isElevenLabsConfigured()) {
      elevenLabsUnavailable(res);
      return;
    }

    try {
      const uid = req.caregiverUser!.uid;
      const { storyId, pageNumber, text } = req.body as {
        storyId?: string;
        pageNumber?: number;
        text?: string;
      };

      if (!storyId?.trim() || typeof pageNumber !== "number" || !text?.trim()) {
        res.status(400).json({
          success: false,
          error: {
            code: "INVALID_BODY",
            message: "storyId, pageNumber, and text are required.",
          },
        });
        return;
      }

      const caregiverSnap = await db.collection(COLLECTIONS.CAREGIVERS).doc(uid).get();
      const voiceId = caregiverSnap.data()?.elevenLabsVoiceId as string | undefined;

      if (!voiceId?.trim()) {
        res.status(400).json({
          success: false,
          error: {
            code: "NO_VOICE_CLONE",
            message: "No cloned voice on file. Record your voice first.",
          },
        });
        return;
      }

      const textHash = createHash("sha256").update(text.trim()).digest("hex").slice(0, 16);
      const storagePath = STORAGE_PATHS.voiceover(
        uid,
        storyId.trim(),
        pageNumber,
        voiceId.trim(),
        textHash,
      );

      const bucket = admin.storage().bucket();
      const file = bucket.file(storagePath);
      const [exists] = await file.exists();

      if (exists) {
        const audioUrl = await getSignedAudioUrl(storagePath);
        res.status(200).json({
          success: true,
          data: { audioUrl, cached: true },
        });
        return;
      }

      const audioBuffer = await synthesizeSpeech({
        voiceId: voiceId.trim(),
        text: text.trim(),
      });

      await file.save(audioBuffer, {
        contentType: "audio/mpeg",
        metadata: { cacheControl: "public, max-age=31536000" },
      });

      const audioUrl = await getSignedAudioUrl(storagePath);
      res.status(200).json({
        success: true,
        data: { audioUrl, cached: false },
      });
    } catch (error) {
      console.error("[voice/synthesize] error:", error);
      res.status(502).json({
        success: false,
        error: {
          code: "ELEVENLABS_TTS_FAILED",
          message: error instanceof Error ? error.message : "Speech synthesis failed",
        },
      });
    }
  },
);

export default router;
