import { randomUUID } from "crypto";
import { admin, firestore } from "@/config/firebase";
import { MANDATED_VISUAL_BIBLE_NO_TEXT_AVOID } from "@/illustration/constants";
import type { EnvironmentEntry, VisualBibleArtefact } from "@/illustration/types";
import { fillIllustrationV2DocDefaults, STORIES_COLLECTION, type Story } from "@/models/story.model";
import { COLLECTIONS } from "@/shared/firestore/paths";

export class PatchVisualBibleValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PatchVisualBibleValidationError";
  }
}

export interface VisualBiblePatchBody {
  characterAnchor?: string;
  characterSheet?: string;
  styleGuide?: string;
  palette?: string;
  consistencyAnchors?: string[];
  avoidList?: string[];
  environmentRegistry?: Record<string, EnvironmentEntry>;
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function sanitizeAvoidList(userList: string[]): { list: string[]; prepended: boolean } {
  if (userList.length === 0) {
    return { list: [MANDATED_VISUAL_BIBLE_NO_TEXT_AVOID], prepended: true };
  }
  const first = userList[0]!.toLowerCase();
  const satisfies =
    (first.includes("no") && first.includes("text")) ||
    first.includes("letters") ||
    first.includes("wordless");
  if (satisfies) {
    return { list: userList, prepended: false };
  }
  return { list: [MANDATED_VISUAL_BIBLE_NO_TEXT_AVOID, ...userList], prepended: true };
}

function validateMergedContent(v: {
  characterAnchor: string;
  styleGuide: string;
  palette: string;
  consistencyAnchors: string[];
  avoidList: string[];
  environmentRegistry: Record<string, EnvironmentEntry>;
}): void {
  const anchor = v.characterAnchor.trim();
  if (!anchor || anchor.length > 240) {
    throw new PatchVisualBibleValidationError(
      "characterAnchor must be non-empty and at most 240 characters.",
    );
  }
  if (!v.styleGuide.trim()) {
    throw new PatchVisualBibleValidationError("styleGuide must be non-empty.");
  }
  const paletteTokens = v.palette
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (paletteTokens.length < 3) {
    throw new PatchVisualBibleValidationError(
      "palette must list at least 3 comma-separated colour entries.",
    );
  }
  if (v.avoidList.length < 1) {
    throw new PatchVisualBibleValidationError("avoidList must have at least one entry.");
  }
  for (const [key, ent] of Object.entries(v.environmentRegistry)) {
    if (!key.trim()) {
      throw new PatchVisualBibleValidationError("environmentRegistry keys must be non-empty.");
    }
    if (!ent.atmosphere?.trim() || !ent.spatialLayout?.trim()) {
      throw new PatchVisualBibleValidationError(
        `environmentRegistry entry "${key}" requires non-empty atmosphere and spatialLayout.`,
      );
    }
  }
  for (const anchorPhrase of v.consistencyAnchors) {
    const wc = wordCount(anchorPhrase);
    if (wc < 4 || wc > 6) {
      console.warn(
        `[patchVisualBible] consistencyAnchors guideline: 4–6 words each (got ${wc} in "${anchorPhrase.slice(0, 48)}")`,
      );
    }
  }
}

function mergeFields(
  current: VisualBibleArtefact,
  body: VisualBiblePatchBody,
): { merged: Omit<VisualBibleArtefact, "id" | "version" | "createdAt" | "createdBy" | "parentVersion" | "source" | "llmCall" | "storyId">; fields: string[] } {
  const fields: string[] = [];
  let characterAnchor = current.characterAnchor;
  let characterSheet = current.characterSheet;
  let styleGuide = current.styleGuide;
  let palette = current.palette;
  let consistencyAnchors = [...current.consistencyAnchors];
  let avoidList = [...current.avoidList];
  let environmentRegistry = { ...current.environmentRegistry };

  if (body.characterAnchor !== undefined) {
    fields.push("characterAnchor");
    characterAnchor = body.characterAnchor;
  }
  if (body.characterSheet !== undefined) {
    fields.push("characterSheet");
    characterSheet = body.characterSheet;
  }
  if (body.styleGuide !== undefined) {
    fields.push("styleGuide");
    styleGuide = body.styleGuide;
  }
  if (body.palette !== undefined) {
    fields.push("palette");
    palette = body.palette;
  }
  if (body.consistencyAnchors !== undefined) {
    fields.push("consistencyAnchors");
    consistencyAnchors = body.consistencyAnchors;
  }
  if (body.avoidList !== undefined) {
    fields.push("avoidList");
    avoidList = body.avoidList;
  }
  if (body.environmentRegistry !== undefined) {
    fields.push("environmentRegistry");
    environmentRegistry = body.environmentRegistry;
  }

  const { list: sanitizedAvoid, prepended } = sanitizeAvoidList(avoidList);
  if (prepended) {
    console.warn("[patchVisualBible] Prepending mandated no-text avoid entry to avoidList.");
  }

  validateMergedContent({
    characterAnchor,
    styleGuide,
    palette,
    consistencyAnchors,
    avoidList: sanitizedAvoid,
    environmentRegistry,
  });

  return {
    merged: {
      characterAnchor,
      characterSheet,
      styleGuide,
      palette,
      consistencyAnchors,
      avoidList: sanitizedAvoid,
      environmentRegistry,
    },
    fields,
  };
}

function hydrateStory(storyId: string, data: Record<string, unknown> | undefined): Story {
  const story = { id: storyId, ...data } as Story;
  fillIllustrationV2DocDefaults(story);
  return story;
}

export async function patchVisualBible(params: {
  storyId: string;
  uid: string;
  body: VisualBiblePatchBody;
}): Promise<{ artefact: VisualBibleArtefact; version: number }> {
  const { storyId, uid, body } = params;
  const keys = Object.keys(body).filter(
    (k) => body[k as keyof VisualBiblePatchBody] !== undefined,
  );
  if (keys.length === 0) {
    throw new PatchVisualBibleValidationError(
      "Request body must include at least one field to update.",
    );
  }

  const storyRef = firestore.collection(STORIES_COLLECTION).doc(storyId);

  const { artefact, version } = await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(storyRef);
    if (!snap.exists) {
      throw new PatchVisualBibleValidationError("Story not found.");
    }
    const story = hydrateStory(storyId, snap.data() as Record<string, unknown>);
    if (story.ownerUid !== uid) {
      throw new PatchVisualBibleValidationError("Story not found.");
    }
    if (story.status !== "illustration_workspace") {
      throw new PatchVisualBibleValidationError(
        "Visual Bible can only be edited in illustration_workspace state.",
      );
    }
    const curV = story.currentVisualBibleVersion;
    if (curV === null) {
      throw new PatchVisualBibleValidationError("Story has no current Visual Bible version.");
    }
    const vbRef = storyRef.collection(COLLECTIONS.STORY_VISUAL_BIBLES).doc(String(curV));
    const vbSnap = await tx.get(vbRef);
    if (!vbSnap.exists) {
      throw new PatchVisualBibleValidationError("Current Visual Bible artefact is missing.");
    }
    const current = vbSnap.data() as VisualBibleArtefact;
    const { merged: content, fields } = mergeFields(current, body);
    const newVersion = curV + 1;
    const now = Date.now();
    const artefact: VisualBibleArtefact = {
      ...content,
      id: randomUUID(),
      storyId,
      version: newVersion,
      createdAt: now,
      createdBy: { kind: "specialist", uid },
      parentVersion: curV,
      source: "specialist_edited",
      llmCall: null,
    };
    const newRef = storyRef.collection(COLLECTIONS.STORY_VISUAL_BIBLES).doc(String(newVersion));
    tx.set(newRef, { ...artefact, storyId });
    const historyEntry = {
      id: randomUUID(),
      at: now,
      byUid: uid,
      event: { kind: "visual_bible_edited" as const, version: newVersion, fields },
    };
    tx.update(storyRef, {
      currentVisualBibleVersion: newVersion,
      updatedAt: now,
      editHistory: admin.firestore.FieldValue.arrayUnion(historyEntry),
    });
    return { artefact, version: newVersion };
  });

  return { artefact, version };
}

/** Test / diagnostics: avoid list after mandated no-text enforcement. */
export function applyAvoidListNoTextRule(userList: string[]): string[] {
  return sanitizeAvoidList(userList).list;
}
