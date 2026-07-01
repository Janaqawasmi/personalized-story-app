import { db } from "../config/firebase";
import { COLLECTIONS } from "../shared/firestore/paths";
import type { ArtDirectionSnapshot, StoryTemplate } from "../shared/types/storyTemplate";

export type PersonalizedArtDirectionNotReadyReason =
  | "SNAPSHOT_NOT_CAPTURED" // template predates Phase 1; artDirectionStoredInline is undefined
  | "SNAPSHOT_INLINE_NULL" // artDirectionStoredInline=true but artDirectionSnapshot is null
  | "SNAPSHOT_SUBCOLLECTION_MISSING"; // artDirectionStoredInline=false but subcollection doc absent

export type PersonalizedImageConfigNotReadyReason =
  | "MISSING_PROTAGONIST_SLOT"
  | "MISSING_CHARACTER_POLICY"
  | "INVALID_STYLE"
  | "MISSING_PAGE_STRUCTURED_PROMPT";

/**
 * Thrown when personalized image generation cannot proceed because required
 * art-direction configuration is missing on the template. This is a
 * configuration/publishing error, not a user error — the upstream eligibility
 * guard (`visualPersonalizationReady`) should prevent this in practice.
 */
export class PersonalizedArtDirectionNotReadyError extends Error {
  constructor(
    public readonly reason: PersonalizedImageConfigNotReadyReason,
    message: string,
  ) {
    super(message);
    this.name = "PersonalizedArtDirectionNotReadyError";
  }
}

/**
 * Thrown when personalized image generation is requested but the art-direction
 * snapshot data required to build personalized prompts is unavailable.
 *
 * A preview marked as failed with this error indicates a publishing-side data
 * problem. It is NOT a user error — the upstream eligibility checks
 * (visualPersonalizationReady) should prevent this from happening in practice.
 */
export class ArtDirectionSnapshotNotReadyError extends Error {
  constructor(
    public readonly reason: PersonalizedArtDirectionNotReadyReason,
    message: string,
  ) {
    super(message);
    this.name = "ArtDirectionSnapshotNotReadyError";
  }
}

/**
 * Loads the art-direction snapshot for a personalizable template.
 *
 * Phase 1 stores the snapshot in one of two places, indicated by
 * `artDirectionStoredInline`:
 *   - `true`  → embedded in `template.artDirectionSnapshot` (inline)
 *   - `false` → stored in the `personalizationArtefacts/snapshot` subcollection
 *   - `undefined` → template predates Phase 1; no snapshot exists
 *
 * Throws `ArtDirectionSnapshotNotReadyError` if the snapshot cannot be loaded.
 * Never returns null.
 */
export async function loadArtDirectionSnapshot(
  template: StoryTemplate,
  templateId: string,
): Promise<ArtDirectionSnapshot> {
  if (template.artDirectionStoredInline === true) {
    if (!template.artDirectionSnapshot) {
      throw new ArtDirectionSnapshotNotReadyError(
        "SNAPSHOT_INLINE_NULL",
        `Template ${templateId}: artDirectionStoredInline=true but artDirectionSnapshot is null.`,
      );
    }
    return template.artDirectionSnapshot;
  }

  if (template.artDirectionStoredInline === false) {
    const snap = await db
      .collection(COLLECTIONS.STORY_TEMPLATES)
      .doc(templateId)
      .collection(COLLECTIONS.TEMPLATE_PERSONALIZATION_ARTEFACTS)
      .doc("snapshot")
      .get();

    if (!snap.exists) {
      throw new ArtDirectionSnapshotNotReadyError(
        "SNAPSHOT_SUBCOLLECTION_MISSING",
        `Template ${templateId}: art-direction snapshot not found in personalizationArtefacts subcollection.`,
      );
    }
    return snap.data() as ArtDirectionSnapshot;
  }

  // artDirectionStoredInline === undefined → pre-Phase-1 template
  throw new ArtDirectionSnapshotNotReadyError(
    "SNAPSHOT_NOT_CAPTURED",
    `Template ${templateId} predates Phase 1; no art-direction snapshot was captured at publish time.`,
  );
}
