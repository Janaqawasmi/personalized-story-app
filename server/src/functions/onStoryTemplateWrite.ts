import * as functions from "firebase-functions/v1";
import type { DocumentSnapshot } from "firebase-admin/firestore";
import { resolvePreviewSentenceForTemplate } from "../shared/utils/resolvePreviewSentence";

/**
 * Fires on every create OR update of a story_templates document.
 * Writes previewSentence automatically if:
 *   - the field is missing entirely, OR
 *   - the field is an empty string
 *
 * Does NOT overwrite an existing non-empty previewSentence —
 * so manually authored sentences are always preserved.
 */
export const autoFillPreviewSentence = functions.firestore
  .document("story_templates/{docId}")
  .onWrite(async (change: functions.Change<DocumentSnapshot>, _context: functions.EventContext) => {
    if (!change.after.exists) return null;

    const data = change.after.data();
    if (!data) return null;

    if (data.previewSentence && String(data.previewSentence).trim() !== "") {
      return null;
    }

    const sentence = resolvePreviewSentenceForTemplate(data as Record<string, unknown>);

    await change.after.ref.update({ previewSentence: sentence });

    functions.logger.info(
      `[autoFillPreviewSentence] ${change.after.id} → wrote previewSentence (${sentence.slice(0, 48)}…)`
    );

    return null;
  });
