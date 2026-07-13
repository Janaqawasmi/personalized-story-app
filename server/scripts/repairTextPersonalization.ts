/**
 * Ops tool: repair / self-recovery for text personalization.
 *
 * Finds every personalizable template whose text variants are NOT ready —
 * because auto-generation at publish failed (textVariantStatus === "failed")
 * or never completed (textPersonalizationReady !== true) — and re-runs
 * generateTextVariants() for each. Generation now retries transient failures
 * on its own and persists a durable failure record, so this script is both the
 * one-off fix for stories broken before the reliability fix landed AND the
 * recurring safety net that heals any template a publish left behind.
 *
 * SAFE BY DEFAULT: dry-run (reports only) unless --apply is passed.
 *
 * Usage (from server/):
 *   # Report which templates need repair, write nothing:
 *   npx ts-node -r tsconfig-paths/register scripts/repairTextPersonalization.ts
 *
 *   # Actually re-run generation for them:
 *   npx ts-node -r tsconfig-paths/register scripts/repairTextPersonalization.ts --apply
 *
 *   # Repair a single template:
 *   npx ts-node -r tsconfig-paths/register scripts/repairTextPersonalization.ts <templateId> --apply
 */

import "dotenv/config";
import { db } from "../src/config/firebase";
import { COLLECTIONS } from "../src/shared/firestore/paths";
import { generateTextVariants } from "../src/services/textVariants.service";
import { classifyTextVariantFailure } from "../src/services/textVariantFailure";

interface Candidate {
  templateId: string;
  title: string;
  textVariantStatus: string;
  priorFailureReason: string | null;
}

function titleOf(data: Record<string, unknown>): string {
  const t = data.title;
  if (t && typeof t === "object") {
    const loc = t as Record<string, string>;
    return loc.he ?? loc.ar ?? loc.en ?? "(untitled)";
  }
  return typeof t === "string" ? t : "(untitled)";
}

/**
 * A template needs repair when it is meant to be personalizable but its text
 * variants are not ready — whether generation failed or was never completed.
 */
function needsRepair(data: Record<string, unknown>): boolean {
  if (data.personalizationEnabled !== true) return false;
  return data.textPersonalizationReady !== true;
}

async function loadCandidates(explicitId: string | undefined): Promise<Candidate[]> {
  const col = db.collection(COLLECTIONS.STORY_TEMPLATES);

  if (explicitId) {
    const doc = await col.doc(explicitId).get();
    if (!doc.exists) {
      console.error(`Template "${explicitId}" not found.`);
      return [];
    }
    const data = doc.data() as Record<string, unknown>;
    if (!needsRepair(data)) {
      console.log(`Template "${explicitId}" does not need repair (already ready or not personalizable).`);
      return [];
    }
    return [toCandidate(doc.id, data)];
  }

  const snap = await col.where("personalizationEnabled", "==", true).get();
  return snap.docs
    .filter((d) => needsRepair(d.data() as Record<string, unknown>))
    .map((d) => toCandidate(d.id, d.data() as Record<string, unknown>));
}

function toCandidate(templateId: string, data: Record<string, unknown>): Candidate {
  const failure = data.textVariantFailure as { reason?: string } | null | undefined;
  return {
    templateId,
    title: titleOf(data),
    textVariantStatus:
      typeof data.textVariantStatus === "string" ? data.textVariantStatus : "none",
    priorFailureReason: failure?.reason ?? null,
  };
}

async function run(): Promise<void> {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const explicitId = args.find((a) => !a.startsWith("--"));

  console.log(`\n${"═".repeat(64)}`);
  console.log("  Repair text personalization");
  console.log(`  Mode : ${apply ? "APPLY (will re-run generation)" : "DRY RUN (read-only)"}`);
  if (explicitId) console.log(`  Scope: single template ${explicitId}`);
  console.log(`${"═".repeat(64)}\n`);

  const candidates = await loadCandidates(explicitId);

  if (candidates.length === 0) {
    console.log("✅  Nothing to repair — every personalizable template has text ready.\n");
    process.exit(0);
  }

  console.log(`Found ${candidates.length} template(s) needing repair:\n`);
  for (const c of candidates) {
    const reason = c.priorFailureReason ? `, prior failure: ${c.priorFailureReason}` : "";
    console.log(`  • ${c.templateId}  "${c.title}"  (status: ${c.textVariantStatus}${reason})`);
  }

  if (!apply) {
    console.log("\nDRY RUN — nothing was changed. Re-run with --apply to repair.\n");
    process.exit(0);
  }

  console.log(`\nRe-running text-variant generation for ${candidates.length} template(s)...\n`);

  let repaired = 0;
  const stillFailing: Array<{ templateId: string; reason: string }> = [];

  for (const c of candidates) {
    try {
      await generateTextVariants(c.templateId);
      repaired++;
      console.log(`  ✅  ${c.templateId} — text personalization ready`);
    } catch (err) {
      // generateTextVariants already persisted textVariantStatus:"failed" +
      // the reason on the template; here we just report it.
      const reason = classifyTextVariantFailure(err).reason;
      stillFailing.push({ templateId: c.templateId, reason });
      console.log(`  ❌  ${c.templateId} — still failing (${reason})`);
    }
  }

  console.log(`\n${"─".repeat(64)}`);
  console.log(`  Repaired: ${repaired} / ${candidates.length}`);
  if (stillFailing.length > 0) {
    console.log(`  Still failing: ${stillFailing.length}`);
    for (const f of stillFailing) {
      console.log(`     - ${f.templateId} (${f.reason})`);
    }
    console.log(
      "\n  Templates still failing keep textVariantStatus=\"failed\" and can be\n" +
        "  re-run later — transient reasons (timeout/rate_limited/provider_error)\n" +
        "  usually clear on the next run.",
    );
  }
  console.log(`${"─".repeat(64)}\n`);

  process.exit(stillFailing.length > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("\nUnhandled error in repairTextPersonalization:\n", err);
  process.exit(1);
});
