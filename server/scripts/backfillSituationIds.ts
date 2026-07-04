/**
 * Backfill: assign a structured `situationId` (referenceData/situations) to
 * every published `story_templates` doc that doesn't have one yet.
 *
 * Why: `specificSituation` is free clinical text copied from the brief's
 * trigger field, not a taxonomy id, so it can't be trusted to identify the
 * right situation for catalog/search filtering. This script proposes
 * confident matches from label containment (scoped to the same primaryTopic
 * domain) and leaves everything else for manual mapping.
 *
 * Safe by design:
 *   - Never overwrites a doc that already has `situationId` or `situationProposal`.
 *   - Dry-run by default. Pass --apply to write.
 *   - Manual overrides: create `scripts/situationBackfillMapping.json` as
 *     `{ "<templateId>": "<situationId>" }` and re-run — entries there always win
 *     over auto-matching.
 *   - Anything still unresolved after matching + manual mapping gets a
 *     placeholder `situationProposal` (status "pending") in --apply mode, so
 *     every doc ends up with one of the two fields.
 *
 * Run (dry-run): npx ts-node scripts/backfillSituationIds.ts
 * Run (apply):   npx ts-node scripts/backfillSituationIds.ts --apply
 */

import admin from "firebase-admin";
import path from "path";
import fs from "fs";

const serviceAccountPath = path.resolve(__dirname, "../config/serviceAccountKey.json");
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

const APPLY = process.argv.includes("--apply");
const MAPPING_PATH = path.resolve(__dirname, "situationBackfillMapping.json");

interface SituationItem {
  id: string;
  label_en?: string;
  label_ar?: string;
  label_he?: string;
  topicKey?: string;
}

function loadManualMapping(): Record<string, string> {
  if (!fs.existsSync(MAPPING_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(MAPPING_PATH, "utf8"));
  } catch (err) {
    console.error(`⚠️  Could not parse ${MAPPING_PATH}:`, err);
    return {};
  }
}

function normalize(s: unknown): string {
  return typeof s === "string" ? s.toLowerCase().trim() : "";
}

function localizedText(field: unknown): string[] {
  if (field == null) return [];
  if (typeof field === "string") return [field];
  if (typeof field === "object") {
    return Object.values(field as Record<string, unknown>).filter(
      (v): v is string => typeof v === "string",
    );
  }
  return [];
}

function slugify(s: unknown): string {
  return typeof s === "string" ? s.toLowerCase().trim().replace(/[\s-]+/g, "_") : "";
}

/**
 * Situations that plausibly match a template, in priority order:
 *   1. `specificSituation` literally IS a situation id already (some seed/test
 *      fixtures store the slug directly instead of clinical prose). Not
 *      domain-scoped — exact id equality is high-confidence on its own.
 *   2. A situation's label text appears in the template's own text fields,
 *      scoped to the same primaryTopic/topicKey domain.
 * Returns tier 1 alone if it found anything; otherwise falls back to tier 2.
 */
function findConfidentMatches(
  template: FirebaseFirestore.DocumentData,
  situations: SituationItem[],
): SituationItem[] {
  const directSlug = slugify(template.specificSituation);
  const directMatch = directSlug ? situations.filter((s) => s.id === directSlug) : [];
  if (directMatch.length > 0) return directMatch;

  const domain = template.primaryTopic || template.topicKey;
  const haystacks = [
    normalize(template.specificSituation),
    ...localizedText(template.shortDescription).map(normalize),
    ...localizedText(template.displayTopic).map(normalize),
    normalize(template.title),
  ].filter(Boolean);

  const candidates = situations.filter((s) => !domain || s.topicKey === domain);

  return candidates.filter((s) => {
    const labels = [s.label_en, s.label_ar, s.label_he]
      .filter((l): l is string => Boolean(l && l.trim()))
      .map(normalize);
    return labels.some((label) => haystacks.some((h) => h.includes(label)));
  });
}

async function run() {
  console.log(`🔧 Backfilling story_templates.situationId (${APPLY ? "APPLY" : "DRY-RUN"})\n`);

  const situationsSnap = await db
    .collection("referenceData")
    .doc("situations")
    .collection("items")
    .where("active", "==", true)
    .get();
  const situations: SituationItem[] = situationsSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as SituationItem,
  );
  console.log(`   Loaded ${situations.length} active situations\n`);

  const manualMapping = loadManualMapping();
  if (Object.keys(manualMapping).length > 0) {
    console.log(
      `   Loaded ${Object.keys(manualMapping).length} manual mapping entries from ${MAPPING_PATH}\n`,
    );
  }

  const templatesSnap = await db.collection("story_templates").get();
  console.log(`   Found ${templatesSnap.size} templates\n`);

  let alreadyHad = 0;
  let assigned = 0;
  let proposalCreated = 0;
  let unresolved = 0;

  for (const doc of templatesSnap.docs) {
    const data = doc.data();

    if (data.situationId || data.situationProposal) {
      alreadyHad++;
      continue;
    }

    const manualId = manualMapping[doc.id];
    if (manualId) {
      const exists = situations.some((s) => s.id === manualId);
      if (!exists) {
        console.log(
          `   ⚠️  UNRESOLVED ${doc.id} ("${data.title}") — manual mapping "${manualId}" ` +
            `is not an active situation id. Skipping.`,
        );
        unresolved++;
        continue;
      }
      console.log(
        `   ✅ ${APPLY ? "PATCHED" : "WOULD PATCH"} ${doc.id} ("${data.title}"): ` +
          `situationId → "${manualId}" (manual mapping)`,
      );
      if (APPLY) await doc.ref.update({ situationId: manualId });
      assigned++;
      continue;
    }

    const matches = findConfidentMatches(data, situations);
    if (matches.length === 1) {
      const situationId = matches[0]!.id;
      console.log(
        `   ✅ ${APPLY ? "PATCHED" : "WOULD PATCH"} ${doc.id} ("${data.title}"): ` +
          `situationId → "${situationId}" (auto-matched)`,
      );
      if (APPLY) await doc.ref.update({ situationId });
      assigned++;
      continue;
    }

    console.log(
      `   ⚠️  UNRESOLVED ${doc.id} ("${data.title}") — ` +
        `${matches.length === 0 ? "no confident match" : `ambiguous (${matches.map((m) => m.id).join(", ")})`}\n` +
        `        specificSituation: ${JSON.stringify(data.specificSituation)}\n` +
        `        shortDescription:  ${JSON.stringify(data.shortDescription)}\n` +
        `        Add an entry to ${path.basename(MAPPING_PATH)} ({ "${doc.id}": "<situationId>" }) and re-run, ` +
        `or let --apply create a pending situationProposal.`,
    );
    unresolved++;

    if (APPLY) {
      await doc.ref.update({
        situationProposal: {
          reason: "auto-backfill: no confident match, needs admin review",
          status: "pending",
          createdBy: "backfill-script",
          createdAt: admin.firestore.Timestamp.now(),
        },
      });
      proposalCreated++;
    }
  }

  console.log(
    `\n📊 ${assigned} ${APPLY ? "assigned" : "to assign"}, ${alreadyHad} already had situationId/situationProposal, ` +
      `${unresolved} unresolved` +
      `${APPLY ? ` (${proposalCreated} given a pending situationProposal placeholder)` : ""}\n`,
  );
  if (!APPLY) {
    console.log("ℹ️  Re-run with --apply to write these changes.\n");
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Backfill failed:", err);
    process.exit(1);
  });
