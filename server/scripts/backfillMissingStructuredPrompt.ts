/**
 * backfillMissingStructuredPrompt.ts
 *
 * Narrow, targeted repair for a published story_templates document whose
 * art-direction snapshot has one or more pages with `structuredPrompt: null`
 * (which blocks `visualPersonalizationReady` — see publishStory.ts's
 * `allPagesHaveStructuredPrompt` gate). This happens when a page's Stage 1
 * scene plan was captured before Stage 2 (the Prompt Engineer) ever ran for
 * it, so it never got a structured prompt.
 *
 * What it does, per affected page:
 *   1. Reads that page's current scene plan from the SOURCE story
 *      (stories/{sourceStoryId}/scenePlans/{pageNumber}-{version}).
 *   2. If the scene plan itself already has a structuredPrompt (just never
 *      made it into the template snapshot), reuses it directly — no LLM call.
 *   3. Otherwise calls the exact same Stage 2 Prompt Engineer function used
 *      by the live pipeline (`runPromptEngineer` from
 *      @/illustration/stage2-prompt-engineer, the same one
 *      orchestrator/generateImage.ts calls) so the output is in the same
 *      format as every other page — never hand-written.
 *   4. Writes the result back via `updateScenePlanStructuredPrompt`, the
 *      SAME function the live pipeline uses to patch a scene plan in place
 *      (no new scene plan version — matches how every other page in this
 *      story already got its structuredPrompt).
 *   5. Patches ONLY `artDirectionSnapshot.pages[i].structuredPrompt` (or the
 *      personalizationArtefacts/snapshot subcollection doc, if the snapshot
 *      isn't stored inline) on the template — nothing else on the template.
 *   6. Only if EVERY page in the snapshot now has a structuredPrompt does it
 *      also set `visualPersonalizationReady: true` on the template — the
 *      exact condition publishStory.ts itself uses
 *      (`isPersonalizable && visualBible !== null && allPagesHaveStructuredPrompt`).
 *
 * This script NEVER touches: story slug/status/title/prices, pages[].textTemplate,
 * pages[].sampleImageUrl / imagePromptTemplate, textPersonalizationReady /
 * textVariantStatus, purchases, allowedIllustrationStyles, protagonistSlot,
 * personalizedCharacterPolicy, or previewSpreads/coverImage. It never creates
 * a new story_templates document and never re-publishes.
 *
 * SAFE BY DEFAULT: dry-run unless --apply is passed. Prints the exact
 * Firestore writes before making them, and re-runs
 * checkPersonalizationReadiness.ts afterward to confirm the result.
 *
 * Usage (from server/):
 *   npx ts-node -r tsconfig-paths/register scripts/backfillMissingStructuredPrompt.ts <templateId>
 *   npx ts-node -r tsconfig-paths/register scripts/backfillMissingStructuredPrompt.ts <templateId> --apply
 */

import "dotenv/config";
import { execSync } from "child_process";
import path from "path";
import { db } from "@/config/firebase";
import { COLLECTIONS } from "@/shared/firestore/paths";
import {
  readLatestScenePlan,
  readVisualBible,
  readLatestVisualBible,
  updateScenePlanStructuredPrompt,
} from "@/illustration/shared/artefact-store";
import { runPromptEngineer } from "@/illustration/stage2-prompt-engineer";
import type { LLMCallRecord, StructuredPrompt } from "@/illustration/types";

interface TemplatePageArtDirectionLike {
  pageNumber: number;
  emotionalIntent: string;
  structuredPrompt: StructuredPrompt | null;
}

interface ArtDirectionSnapshotLike {
  styleGuide?: unknown;
  consistencyAnchors?: unknown;
  environmentRegistry?: unknown;
  palette?: unknown;
  avoidList?: unknown;
  pages?: TemplatePageArtDirectionLike[];
}

function fmtStructuredPrompt(sp: StructuredPrompt): string {
  return (
    `      setting     : ${sp.setting}\n` +
    `      character   : ${sp.character}\n` +
    `      focalPoint  : ${sp.focalPoint}\n` +
    `      composition : ${sp.composition}\n` +
    `      lighting    : ${sp.lighting}`
  );
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const templateId = args.find((a) => !a.startsWith("--")) ?? "";
  const applyMode = args.includes("--apply");

  if (!templateId) {
    console.error(
      "\nUsage:\n" +
        "  npx ts-node -r tsconfig-paths/register scripts/backfillMissingStructuredPrompt.ts <templateId> [--apply]\n",
    );
    process.exit(1);
  }

  console.log(`\n${"═".repeat(64)}`);
  console.log("  Backfill Missing structuredPrompt");
  console.log(`  Template ID : ${templateId}`);
  console.log(`  Mode        : ${applyMode ? "APPLY (will write to Firestore)" : "DRY RUN (read-only)"}`);
  console.log("═".repeat(64));

  const templateRef = db.collection(COLLECTIONS.STORY_TEMPLATES).doc(templateId);
  const templateSnap = await templateRef.get();
  if (!templateSnap.exists) {
    console.error(`\n❌  Template "${templateId}" not found in story_templates.\n`);
    process.exit(1);
  }
  const d = templateSnap.data() as Record<string, unknown>;

  const sourceStoryId = typeof d.sourceStoryId === "string" ? d.sourceStoryId : "";
  if (!sourceStoryId) {
    console.error("\n❌  Template has no sourceStoryId — cannot locate scene plans.\n");
    process.exit(1);
  }
  console.log(`\n  sourceStoryId : ${sourceStoryId}`);
  console.log(`  status        : ${d.status ?? "MISSING"}`);
  console.log(`  isActive      : ${d.isActive ?? "MISSING"}`);

  // ── Locate the art-direction snapshot (inline or subcollection) ───────────

  const artDirectionStoredInline = d.artDirectionStoredInline !== false;
  let snapshot: ArtDirectionSnapshotLike | null = null;
  let snapshotRef: FirebaseFirestore.DocumentReference = templateRef;
  let snapshotFieldPrefix = "artDirectionSnapshot";

  if (d.artDirectionSnapshot && typeof d.artDirectionSnapshot === "object") {
    snapshot = d.artDirectionSnapshot as ArtDirectionSnapshotLike;
  } else if (artDirectionStoredInline === false) {
    snapshotRef = templateRef.collection(COLLECTIONS.TEMPLATE_PERSONALIZATION_ARTEFACTS).doc("snapshot");
    const subSnap = await snapshotRef.get();
    if (!subSnap.exists) {
      console.error("\n❌  personalizationArtefacts/snapshot document does not exist — nothing to backfill.\n");
      process.exit(1);
    }
    snapshot = subSnap.data() as ArtDirectionSnapshotLike;
    snapshotFieldPrefix = ""; // top-level fields on the subcollection doc, not nested
  }

  if (!snapshot || !Array.isArray(snapshot.pages)) {
    console.error("\n❌  No art-direction snapshot found on this template — nothing to backfill.\n");
    process.exit(1);
  }

  const pages = [...snapshot.pages].sort((a, b) => a.pageNumber - b.pageNumber);
  const missing = pages.filter((p) => p.structuredPrompt === null || p.structuredPrompt === undefined);

  console.log(`\n  Snapshot pages       : ${pages.length}`);
  console.log(`  Pages missing structuredPrompt : ${missing.length > 0 ? `[${missing.map((p) => p.pageNumber).join(", ")}]` : "(none)"}`);

  if (missing.length === 0) {
    console.log("\n  ✅  Nothing to backfill — every snapshot page already has a structuredPrompt.\n");
    process.exit(0);
  }

  // ── Resolve a structuredPrompt for each missing page ───────────────────────

  const resolved: Array<{
    pageNumber: number;
    structuredPrompt: StructuredPrompt;
    fromLLM: boolean;
    scenePlanVersion: number;
    stage2LLMCall: LLMCallRecord | null;
  }> = [];

  for (const page of missing) {
    const pageNumber = page.pageNumber;
    console.log(`\n${"─".repeat(60)}`);
    console.log(`  Page ${pageNumber}`);
    console.log("─".repeat(60));

    const scenePlan = await readLatestScenePlan(sourceStoryId, pageNumber);
    if (!scenePlan) {
      console.error(`  ❌  No scene plan found at stories/${sourceStoryId}/scenePlans for page ${pageNumber} — skipping.`);
      continue;
    }
    console.log(`  Scene plan: version=${scenePlan.version}, structuredPrompt=${scenePlan.structuredPrompt ? "present" : "null"}`);

    if (scenePlan.structuredPrompt) {
      // Scene plan already has it — the snapshot just never picked it up. No LLM call needed.
      console.log("  → Reusing structuredPrompt already present on the scene plan (no LLM call).");
      resolved.push({
        pageNumber,
        structuredPrompt: scenePlan.structuredPrompt,
        fromLLM: false,
        scenePlanVersion: scenePlan.version,
        stage2LLMCall: null,
      });
      continue;
    }

    const visualBible =
      (await readVisualBible(sourceStoryId, scenePlan.visualBibleVersion)) ??
      (await readLatestVisualBible(sourceStoryId));
    if (!visualBible) {
      console.error(`  ❌  No Visual Bible found for story ${sourceStoryId} — skipping page ${pageNumber}.`);
      continue;
    }

    console.log("  → Calling Stage 2 Prompt Engineer (runPromptEngineer) — same function the live pipeline uses...");
    const { structuredPrompt, stage2LLMCall } = await runPromptEngineer({ scenePlan, visualBible });
    console.log("  Generated structuredPrompt:");
    console.log(fmtStructuredPrompt(structuredPrompt));

    resolved.push({
      pageNumber,
      structuredPrompt,
      fromLLM: true,
      scenePlanVersion: scenePlan.version,
      stage2LLMCall,
    });
  }

  if (resolved.length === 0) {
    console.error("\n❌  Could not resolve a structuredPrompt for any missing page — nothing to write.\n");
    process.exit(1);
  }

  // ── Print exact planned writes ─────────────────────────────────────────────

  console.log(`\n${"═".repeat(64)}`);
  console.log("  Planned writes");
  console.log("═".repeat(64));
  for (const r of resolved) {
    if (r.fromLLM) {
      console.log(
        `  • stories/${sourceStoryId}/scenePlans/${r.pageNumber}-${r.scenePlanVersion} ` +
          `→ update structuredPrompt + stage2LLMCall`,
      );
    } else {
      console.log(`  • (no scene plan write — structuredPrompt already existed for page ${r.pageNumber})`);
    }
  }
  const snapshotTarget =
    snapshotFieldPrefix === ""
      ? `story_templates/${templateId}/personalizationArtefacts/snapshot.pages[]`
      : `story_templates/${templateId}.${snapshotFieldPrefix}.pages[]`;
  console.log(`  • ${snapshotTarget} → set structuredPrompt for page(s) [${resolved.map((r) => r.pageNumber).join(", ")}]`);

  const updatedPages = pages.map((p) => {
    const r = resolved.find((x) => x.pageNumber === p.pageNumber);
    return r ? { ...p, structuredPrompt: r.structuredPrompt } : p;
  });
  const allPagesHaveStructuredPrompt = updatedPages.every((p) => p.structuredPrompt !== null && p.structuredPrompt !== undefined);

  console.log(
    `\n  After this write, allPagesHaveStructuredPrompt = ${allPagesHaveStructuredPrompt} ` +
      `→ visualPersonalizationReady will be set to ${allPagesHaveStructuredPrompt ? "true" : "false (still incomplete — will NOT be changed)"}`,
  );

  console.log("\n  Fields this script will NOT touch:");
  console.log("    • slug / status / isActive / isPublished / title / priceCents / printPriceCents");
  console.log("    • pages[].textTemplate.masculine / feminine  (specialist-authored text)");
  console.log("    • pages[].imagePromptTemplate / sampleImageUrl  (specialist-approved images)");
  console.log("    • textPersonalizationReady / textVariantStatus  (owned by the Text Variants Review flow)");
  console.log("    • allowedIllustrationStyles / defaultIllustrationStyle / protagonistSlot / personalizedCharacterPolicy");
  console.log("    • previewSpreads / coverImage / purchases");
  console.log("    • other snapshot fields (styleGuide, consistencyAnchors, environmentRegistry, palette, avoidList) and other pages' structuredPrompt");

  if (!applyMode) {
    console.log("\n  ─────────────────────────────────────────────────────────");
    console.log("  DRY RUN — no changes written.");
    console.log("  Re-run with --apply to perform the writes:\n");
    console.log(`    npx ts-node -r tsconfig-paths/register scripts/backfillMissingStructuredPrompt.ts ${templateId} --apply\n`);
    process.exit(0);
  }

  // ── Apply ────────────────────────────────────────────────────────────────

  console.log("\n  Applying writes...");

  for (const r of resolved) {
    if (r.fromLLM && r.stage2LLMCall) {
      await updateScenePlanStructuredPrompt(
        sourceStoryId,
        r.pageNumber,
        r.scenePlanVersion,
        r.structuredPrompt,
        r.stage2LLMCall,
      );
    }
  }

  if (snapshotFieldPrefix === "") {
    await snapshotRef.update({ pages: updatedPages });
  } else {
    await templateRef.update({ [`${snapshotFieldPrefix}.pages`]: updatedPages });
  }
  console.log(`  ✅  ${snapshotTarget} updated.`);

  if (allPagesHaveStructuredPrompt) {
    await templateRef.update({ visualPersonalizationReady: true, updatedAt: Date.now() });
    console.log("  ✅  visualPersonalizationReady: false → true");
  } else {
    console.log("  ⚠️   visualPersonalizationReady left unchanged — snapshot still has pages without a structuredPrompt.");
  }

  // ── Re-verify via the existing readiness script ───────────────────────────

  console.log(`\n${"═".repeat(64)}`);
  console.log("  Re-running checkPersonalizationReadiness.ts to confirm...");
  console.log("  (Text personalization is expected to still fail — this script does not touch it.)");
  console.log("═".repeat(64));

  const checkScript = path.resolve(__dirname, "checkPersonalizationReadiness.ts");
  const tsNode = path.resolve(__dirname, "../node_modules/.bin/ts-node");
  const tsCfg = path.resolve(__dirname, "tsconfig.json");
  const cmd = `"${tsNode}" --project "${tsCfg}" "${checkScript}" ${templateId}`;

  try {
    const output = execSync(cmd, { encoding: "utf8", stdio: "pipe" });
    console.log(output);
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string };
    if (e.stdout) console.log(e.stdout);
    if (e.stderr) console.error(e.stderr);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("\nUnhandled error:\n", err);
  process.exit(1);
});
