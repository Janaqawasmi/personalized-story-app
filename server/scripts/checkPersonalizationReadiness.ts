/**
 * checkPersonalizationReadiness.ts
 *
 * Validates a story_templates document against every requirement for
 * "Personalize this story" to appear on the public site.
 *
 * SAFE BY DEFAULT: runs in read-only (dry-run) mode unless --apply is passed.
 * Only writes flag fields that are derivable from data that already exists and
 * has passed every check in this script.  Never touches text, images, or
 * specialist-authored content.
 *
 * Usage (from server/):
 *   # Inspect only — prints a full report, writes nothing:
 *   npx ts-node --project scripts/tsconfig.json scripts/checkPersonalizationReadiness.ts <templateId>
 *
 *   # Apply the minimal Firestore update if and only if all checks pass:
 *   npx ts-node --project scripts/tsconfig.json scripts/checkPersonalizationReadiness.ts <templateId> --apply
 *
 * The template ID can also be supplied via the TEMPLATE_ID env var.
 */

import admin from "firebase-admin";
import path from "path";
import fs from "fs";
import { ILLUSTRATION_STYLE_IDS, isValidIllustrationStyleId } from "../src/shared/types/visualStyles";

// ─── Firebase init ────────────────────────────────────────────────────────────

function initFirebase(): admin.firestore.Firestore {
  const fromEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const sa =
    fromEnv && fromEnv.trim()
      ? JSON.parse(fromEnv)
      : JSON.parse(
          fs.readFileSync(
            path.resolve(__dirname, "../config/serviceAccountKey.json"),
            "utf8",
          ),
        );
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(sa as admin.ServiceAccount) });
  }
  return admin.firestore();
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

const OK   = (msg: string) => `  ✅  ${msg}`;
const FAIL = (msg: string) => `  ❌  ${msg}`;
const WARN = (msg: string) => `  ⚠️   ${msg}`;
const INFO = (msg: string) => `       ${msg}`;

function header(title: string): void {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${title}`);
  console.log("─".repeat(60));
}

// ─── Validation result accumulators ──────────────────────────────────────────

interface Finding {
  passed: boolean;
  message: string;
}

class Report {
  private findings: Finding[] = [];
  private warnings: string[] = [];

  pass(msg: string)  { this.findings.push({ passed: true,  message: OK(msg) }); }
  fail(msg: string)  { this.findings.push({ passed: false, message: FAIL(msg) }); }
  warn(msg: string)  { this.warnings.push(WARN(msg)); }
  info(msg: string)  { console.log(INFO(msg)); }

  print(): void {
    for (const f of this.findings) console.log(f.message);
    for (const w of this.warnings)  console.log(w);
  }

  get allPassed(): boolean { return this.findings.every((f) => f.passed); }
  get failCount(): number  { return this.findings.filter((f) => !f.passed).length; }

  failures(): string[] {
    return this.findings.filter((f) => !f.passed).map((f) => f.message);
  }
}

// ─── Section validators ───────────────────────────────────────────────────────

function checkGeneralFlags(d: Record<string, unknown>, r: Report): void {
  header("1 · General personalization flags");

  if (d.personalizationEnabled === true) {
    r.pass("personalizationEnabled = true");
  } else {
    r.fail(`personalizationEnabled = ${JSON.stringify(d.personalizationEnabled ?? "MISSING")}`);
    r.info("  Fix: set personalizationEnabled: true  (only if the brief intended child personalization)");
  }

  if (d.visualPersonalizationEnabled === true) {
    r.pass("visualPersonalizationEnabled = true");
  } else {
    r.fail(`visualPersonalizationEnabled = ${JSON.stringify(d.visualPersonalizationEnabled ?? "MISSING")}`);
    r.info("  Fix: set visualPersonalizationEnabled: true  (only if the brief intended photo-based personalization)");
  }

  if (d.visualPersonalizationReady === true) {
    r.pass("visualPersonalizationReady = true");
  } else {
    r.fail(`visualPersonalizationReady = ${JSON.stringify(d.visualPersonalizationReady ?? "MISSING")}`);
    r.info("  Fix: set visualPersonalizationReady: true  ONLY after confirming art-direction snapshot is complete (section 4)");
  }

  // textPersonalizationReady is deprecated — show its current value for reference only.
  const tpr = d.textPersonalizationReady;
  if (tpr === true) {
    r.pass("textPersonalizationReady = true  (legacy flag — now derived from page data, but set for compatibility)");
  } else {
    r.warn(
      `textPersonalizationReady = ${JSON.stringify(tpr ?? "MISSING")} — deprecated flag. ` +
      "The public CTA now derives text readiness from page data. This script will set it to true " +
      "if and only if all page text templates are valid.",
    );
  }

  r.print();
}

// ─────────────────────────────────────────────────────────────────────────────

interface PageRecord {
  pageNumber?: unknown;
  textTemplate?: { masculine?: string; feminine?: string } | null;
  imagePromptTemplate?: unknown;
  sampleImageUrl?: unknown;
}

function checkTextTemplates(pages: PageRecord[], r: Report): void {
  header("2 · Text personalization — page templates");

  if (pages.length === 0) {
    r.fail("pages[] is empty — no text templates to validate");
    r.print();
    return;
  }
  console.log(INFO(`Total pages: ${pages.length}`));

  const pagesWithoutPlaceholder: number[] = [];
  const pagesWithEmptyVariant:   number[] = [];
  const pagesWithMissingTemplate: number[] = [];

  for (let i = 0; i < pages.length; i++) {
    const pg = pages[i] as PageRecord;    // noUncheckedIndexedAccess: array is non-sparse, cast is safe
    const pgNum = typeof pg.pageNumber === "number" ? pg.pageNumber : i + 1;
    const tt = pg.textTemplate;

    if (!tt || typeof tt !== "object") {
      pagesWithMissingTemplate.push(pgNum);
      continue;
    }

    const masc = tt.masculine ?? "";
    const fem  = tt.feminine  ?? "";

    const mascEmpty = typeof masc !== "string" || masc.trim().length === 0;
    const femEmpty  = typeof fem  !== "string" || fem.trim().length  === 0;

    if (mascEmpty || femEmpty) {
      pagesWithEmptyVariant.push(pgNum);
      continue;
    }

    const mascMissing = !masc.includes("{{CHILD_NAME}}");
    const femMissing  = !fem.includes("{{CHILD_NAME}}");

    if (mascMissing || femMissing) {
      pagesWithoutPlaceholder.push(pgNum);
      if (mascMissing) console.log(INFO(`    page ${pgNum} masculine missing {{CHILD_NAME}}: "${masc.slice(0, 80)}..."`));
      if (femMissing)  console.log(INFO(`    page ${pgNum} feminine  missing {{CHILD_NAME}}: "${fem.slice(0, 80)}..."`));
    }
  }

  if (pagesWithMissingTemplate.length > 0) {
    r.fail(`Pages with missing textTemplate entirely: [${pagesWithMissingTemplate.join(", ")}]`);
  }
  if (pagesWithEmptyVariant.length > 0) {
    r.fail(`Pages with empty masculine or feminine: [${pagesWithEmptyVariant.join(", ")}]`);
  }
  if (pagesWithoutPlaceholder.length > 0) {
    r.fail(`Pages where {{CHILD_NAME}} is missing from one or both variants: [${pagesWithoutPlaceholder.join(", ")}]`);
  }

  const totalBad = pagesWithMissingTemplate.length + pagesWithEmptyVariant.length + pagesWithoutPlaceholder.length;
  if (totalBad === 0) {
    r.pass(`All ${pages.length} pages have valid textTemplate.masculine + feminine with {{CHILD_NAME}}`);
  } else {
    r.info("  Fix: run the Phase 3 text-variant generation pipeline for the source story, then re-publish.");
  }

  r.print();
}

// ─────────────────────────────────────────────────────────────────────────────

function checkStyleConfig(d: Record<string, unknown>, r: Report): void {
  header("3 · Visual personalization — style configuration");

  // allowedIllustrationStyles
  const styles = d.allowedIllustrationStyles;
  if (!Array.isArray(styles) || styles.length === 0) {
    r.fail(`allowedIllustrationStyles = ${JSON.stringify(styles ?? "MISSING")} — must be a non-empty array`);
    r.info(`  Valid values: [${ILLUSTRATION_STYLE_IDS.join(", ")}]`);
    r.info("  Fix: set allowedIllustrationStyles to one or more valid style IDs");
  } else {
    const invalid = styles.filter((s) => !isValidIllustrationStyleId(s));
    if (invalid.length > 0) {
      r.fail(`allowedIllustrationStyles contains unknown IDs: [${invalid.join(", ")}]`);
      r.info(`  Valid values: [${ILLUSTRATION_STYLE_IDS.join(", ")}]`);
    } else {
      r.pass(`allowedIllustrationStyles = [${styles.join(", ")}]`);
    }
  }

  // defaultIllustrationStyle
  const defStyle = d.defaultIllustrationStyle;
  if (!isValidIllustrationStyleId(defStyle)) {
    r.fail(`defaultIllustrationStyle = ${JSON.stringify(defStyle ?? "MISSING")} — must be a valid IllustrationStyleId`);
    r.info(`  Valid values: [${ILLUSTRATION_STYLE_IDS.join(", ")}]`);
  } else if (
    Array.isArray(styles) &&
    styles.length > 0 &&
    !styles.includes(defStyle)
  ) {
    r.fail(`defaultIllustrationStyle "${defStyle}" is not in allowedIllustrationStyles [${styles.join(", ")}]`);
  } else {
    r.pass(`defaultIllustrationStyle = "${defStyle}"`);
  }

  // protagonistSlot
  const ps = d.protagonistSlot as Record<string, unknown> | undefined;
  if (!ps || typeof ps !== "object") {
    r.fail("protagonistSlot = MISSING — required for personalized image prompt assembly");
    r.info("  Fix: re-publish the story after ensuring the Visual Bible was captured");
  } else {
    const hasSampleDesc  = typeof ps.sampleCharacterDescription === "string" && (ps.sampleCharacterDescription as string).trim().length > 0;
    const hasSampleSheet = typeof ps.sampleCharacterSheet        === "string" && (ps.sampleCharacterSheet as string).trim().length > 0;
    const hasRole        = ps.role === "main_child_character";
    const isReplaceable  = ps.replaceable === true;

    if (!hasRole)        r.fail("protagonistSlot.role ≠ \"main_child_character\"");
    if (!isReplaceable)  r.fail("protagonistSlot.replaceable ≠ true");
    if (!hasSampleDesc)  r.fail("protagonistSlot.sampleCharacterDescription is missing or empty");
    if (!hasSampleSheet) r.fail("protagonistSlot.sampleCharacterSheet is missing or empty");

    if (hasRole && isReplaceable && hasSampleDesc && hasSampleSheet) {
      r.pass(`protagonistSlot — role=${ps.role}, replaceable=true, characterAnchor ✅, characterSheet ✅`);
    }
  }

  // personalizedCharacterPolicy
  if (d.personalizedCharacterPolicy === "replace_with_child_photo") {
    r.pass('personalizedCharacterPolicy = "replace_with_child_photo"');
  } else {
    r.fail(
      `personalizedCharacterPolicy = ${JSON.stringify(d.personalizedCharacterPolicy ?? "MISSING")} — must be "replace_with_child_photo"`,
    );
  }

  r.print();
}

// ─────────────────────────────────────────────────────────────────────────────

interface SnapshotLike {
  styleGuide?: unknown;
  consistencyAnchors?: unknown;
  environmentRegistry?: unknown;
  palette?: unknown;
  avoidList?: unknown;
  pages?: unknown;
}

function checkArtDirectionSnapshot(
  snapshot: SnapshotLike,
  templatePageCount: number,
  r: Report,
  location: string,
): void {
  // Top-level fields
  const sgOk = typeof snapshot.styleGuide === "string" && (snapshot.styleGuide as string).trim().length > 0;
  if (sgOk) {
    r.pass(`snapshot.styleGuide — non-empty string`);
  } else {
    r.fail(`snapshot.styleGuide = ${JSON.stringify(snapshot.styleGuide ?? "MISSING")} (${location})`);
  }

  const anchors = snapshot.consistencyAnchors;
  if (Array.isArray(anchors) && anchors.length > 0) {
    r.pass(`snapshot.consistencyAnchors — ${anchors.length} entries`);
  } else {
    r.fail(`snapshot.consistencyAnchors = ${JSON.stringify(anchors ?? "MISSING")} — must be a non-empty array (${location})`);
  }

  const envReg = snapshot.environmentRegistry;
  if (envReg && typeof envReg === "object" && !Array.isArray(envReg) && Object.keys(envReg).length > 0) {
    r.pass(`snapshot.environmentRegistry — ${Object.keys(envReg).length} environment(s)`);
  } else {
    r.fail(`snapshot.environmentRegistry = ${JSON.stringify(envReg ?? "MISSING")} — must be a non-empty object (${location})`);
  }

  const paletteOk = typeof snapshot.palette === "string" && (snapshot.palette as string).trim().length > 0;
  if (paletteOk) {
    r.pass("snapshot.palette — non-empty string");
  } else {
    r.fail(`snapshot.palette = ${JSON.stringify(snapshot.palette ?? "MISSING")} (${location})`);
  }

  const avoidOk = Array.isArray(snapshot.avoidList);
  if (avoidOk) {
    r.pass(`snapshot.avoidList — ${(snapshot.avoidList as unknown[]).length} entries`);
  } else {
    r.fail(`snapshot.avoidList = ${JSON.stringify(snapshot.avoidList ?? "MISSING")} — must be an array (${location})`);
  }

  // Per-page structured prompts
  const snapPages = Array.isArray(snapshot.pages) ? snapshot.pages as Record<string, unknown>[] : [];

  if (snapPages.length === 0) {
    r.fail(`snapshot.pages is empty (${location})`);
    return;
  }

  if (snapPages.length !== templatePageCount) {
    r.fail(
      `snapshot.pages count (${snapPages.length}) ≠ template pages count (${templatePageCount}) (${location})`,
    );
    r.info("  Fix: re-capture the art-direction snapshot to include all pages");
  } else {
    r.pass(`snapshot.pages count matches template (${snapPages.length} pages)`);
  }

  const pagesWithNullPrompt:    number[] = [];
  const pagesWithIncomplete:    number[] = [];
  const STRUCTURED_FIELDS = ["setting", "character", "focalPoint", "composition", "lighting"] as const;

  for (const sp of snapPages) {
    const pgNum = typeof sp.pageNumber === "number" ? sp.pageNumber : "?";
    const ei = sp.emotionalIntent;
    if (typeof ei !== "string" || (ei as string).trim().length === 0) {
      r.fail(`snapshot page ${pgNum}: emotionalIntent is missing or empty`);
    }

    const structuredPrompt = sp.structuredPrompt;
    if (structuredPrompt === null || structuredPrompt === undefined) {
      pagesWithNullPrompt.push(pgNum as number);
      continue;
    }
    if (typeof structuredPrompt !== "object") {
      r.fail(`snapshot page ${pgNum}: structuredPrompt is not an object`);
      continue;
    }
    const spObj = structuredPrompt as Record<string, unknown>;
    const missingFields = STRUCTURED_FIELDS.filter(
      (f) => typeof spObj[f] !== "string" || (spObj[f] as string).trim().length === 0,
    );
    if (missingFields.length > 0) {
      pagesWithIncomplete.push(pgNum as number);
      r.info(`    snapshot page ${pgNum}: structuredPrompt missing fields: [${missingFields.join(", ")}]`);
    }
  }

  if (pagesWithNullPrompt.length > 0) {
    r.fail(
      `snapshot pages with null structuredPrompt (will throw MissingStructuredPromptError at generation): [${pagesWithNullPrompt.join(", ")}]`,
    );
    r.info("  Fix: re-run the illustration pipeline for these pages and re-capture the snapshot");
  }
  if (pagesWithIncomplete.length > 0) {
    r.fail(`snapshot pages with incomplete structuredPrompt fields: [${pagesWithIncomplete.join(", ")}]`);
  }
  if (pagesWithNullPrompt.length === 0 && pagesWithIncomplete.length === 0) {
    r.pass(`All ${snapPages.length} snapshot pages have complete structuredPrompt`);
  }
}

async function checkArtDirection(
  d: Record<string, unknown>,
  db: admin.firestore.Firestore,
  templateId: string,
  templatePageCount: number,
  r: Report,
): Promise<void> {
  header("4 · Art-direction snapshot");

  if (d.artDirectionSnapshot && typeof d.artDirectionSnapshot === "object") {
    r.pass("artDirectionSnapshot is stored inline");
    checkArtDirectionSnapshot(
      d.artDirectionSnapshot as SnapshotLike,
      templatePageCount,
      r,
      "inline",
    );
  } else if (d.artDirectionStoredInline === false) {
    console.log(INFO("artDirectionSnapshot not inline — checking personalizationArtefacts/snapshot subcollection..."));
    const subRef = db
      .collection("story_templates")
      .doc(templateId)
      .collection("personalizationArtefacts")
      .doc("snapshot");
    const subDoc = await subRef.get();
    if (!subDoc.exists) {
      r.fail("personalizationArtefacts/snapshot subcollection document does not exist");
      r.info("  Fix: re-capture the art-direction snapshot from the source story");
    } else {
      r.pass("personalizationArtefacts/snapshot subcollection document found");
      checkArtDirectionSnapshot(
        subDoc.data() as SnapshotLike,
        templatePageCount,
        r,
        "personalizationArtefacts/snapshot",
      );
    }
  } else {
    r.fail(
      `artDirectionSnapshot not found. artDirectionStoredInline = ${JSON.stringify(d.artDirectionStoredInline ?? "MISSING")}`,
    );
    r.info("  Fix: re-publish the story after ensuring the Visual Bible was captured at publish time");
  }

  r.print();
}

// ─────────────────────────────────────────────────────────────────────────────

function checkSampleImages(pages: PageRecord[], r: Report): void {
  header("5 · Sample image safety check");

  const pagesWithImage    = pages.filter((p) => typeof p.sampleImageUrl === "string" && (p.sampleImageUrl as string).length > 0);
  const pagesWithoutImage = pages.filter((p) => !p.sampleImageUrl);

  console.log(INFO(`Pages with sampleImageUrl:    ${pagesWithImage.length} / ${pages.length}`));
  if (pagesWithoutImage.length > 0) {
    const nums = pagesWithoutImage.map((p, i) => p.pageNumber ?? i + 1).join(", ");
    r.warn(`${pagesWithoutImage.length} page(s) have no sampleImageUrl yet: [${nums}]`);
    r.info("  These pages will use personalized-only image generation. That's fine if intended.");
  } else {
    r.pass("All pages have sampleImageUrl — sample reader will not be broken by this update");
  }

  console.log(INFO("This script will NOT modify any sampleImageUrl or imagePromptTemplate fields."));
  r.print();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  const args = process.argv.slice(2);
  const templateId: string = args.find((a) => !a.startsWith("--")) ?? process.env.TEMPLATE_ID ?? "";
  const applyMode = args.includes("--apply");

  if (!templateId) {
    console.error(
      "\nUsage:\n" +
      "  npx ts-node --project scripts/tsconfig.json scripts/checkPersonalizationReadiness.ts <templateId> [--apply]\n\n" +
      "  --apply   Write the minimal Firestore update if and only if all checks pass.\n" +
      "            Omit to run in read-only (dry-run) mode.\n",
    );
    process.exit(1);
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log(`  Personalization Readiness Check`);
  console.log(`  Template ID : ${templateId}`);
  console.log(`  Mode        : ${applyMode ? "APPLY (will write to Firestore if all checks pass)" : "DRY RUN (read-only)"}`);
  console.log(`${"═".repeat(60)}`);

  const db = initFirebase();
  const docRef = db.collection("story_templates").doc(templateId);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    console.error(`\n❌  Template "${templateId}" not found in story_templates.\n`);
    process.exit(1);
  }

  const d = docSnap.data() as Record<string, unknown>;
  const rawTitle = d.title;
  const title =
    rawTitle && typeof rawTitle === "object"
      ? ((rawTitle as Record<string, string>).he ?? (rawTitle as Record<string, string>).ar ?? JSON.stringify(rawTitle))
      : String(rawTitle ?? "(no title)");

  console.log(`\n  Title       : ${title}`);
  console.log(`  Status      : ${d.status ?? "MISSING"}`);
  console.log(`  isActive    : ${d.isActive ?? "MISSING"}`);
  console.log(`  sourceStory : ${d.sourceStoryId ?? "(not set)"}`);

  if (d.status !== "approved" || d.isActive === false) {
    console.error(
      "\n❌  Story is not active/approved — fix status/isActive first before enabling personalization.\n",
    );
    process.exit(1);
  }

  const pages: PageRecord[] = Array.isArray(d.pages) ? (d.pages as PageRecord[]) : [];

  // Run all sections ──────────────────────────────────────────────────────────

  const r1 = new Report();
  const r2 = new Report();
  const r3 = new Report();
  const r4 = new Report();
  const r5 = new Report();

  checkGeneralFlags(d, r1);
  checkTextTemplates(pages, r2);
  checkStyleConfig(d, r3);
  await checkArtDirection(d, db, templateId, pages.length, r4);
  checkSampleImages(pages, r5);

  // ─── Summary ────────────────────────────────────────────────────────────────

  const allReports = [r1, r2, r3, r4, r5];
  const totalFails = allReports.reduce((n, r) => n + r.failCount, 0);
  const allPassed  = totalFails === 0;

  header("SUMMARY");

  if (!allPassed) {
    console.log(`\n  ❌  ${totalFails} check(s) FAILED — personalization CANNOT be safely enabled.\n`);
    console.log("  Failures to fix before re-running this script:");
    for (const r of allReports) {
      for (const f of r.failures()) {
        console.log(`    ${f}`);
      }
    }
    console.log(
      "\n  After fixing the above, re-run without --apply to verify, then re-run with --apply.\n",
    );
    process.exit(1);
  }

  console.log("\n  ✅  All checks PASSED.\n");

  // Compute the minimal Firestore update ─────────────────────────────────────

  const update: Record<string, unknown> = {};
  const updateReasons: string[] = [];

  if (d.textPersonalizationReady !== true) {
    update.textPersonalizationReady = true;
    updateReasons.push(
      "textPersonalizationReady: false → true  (legacy compatibility — all page text templates verified above)",
    );
  }
  if (d.personalizationEnabled !== true) {
    update.personalizationEnabled = true;
    updateReasons.push("personalizationEnabled: missing/false → true  (verified above)");
  }
  if (d.visualPersonalizationEnabled !== true) {
    update.visualPersonalizationEnabled = true;
    updateReasons.push("visualPersonalizationEnabled: missing/false → true  (verified above)");
  }
  if (d.visualPersonalizationReady !== true) {
    update.visualPersonalizationReady = true;
    updateReasons.push("visualPersonalizationReady: missing/false → true  (art-direction snapshot verified above)");
  }

  if (updateReasons.length === 0) {
    console.log("  All required flags are already set correctly in Firestore.");
    console.log("  No Firestore write is needed.");
    console.log(
      '\n  The "Personalize this story" button should already appear on the public site.\n' +
      "  If it is still not showing, check that the page has refreshed its Firestore cache.\n",
    );
    process.exit(0);
  }

  console.log("  Minimal Firestore update required:\n");
  for (const reason of updateReasons) {
    console.log(`    • ${reason}`);
  }

  console.log("\n  Fields this script will NOT touch:");
  console.log("    • pages[].textTemplate.masculine / feminine  (specialist-authored text)");
  console.log("    • pages[].imagePromptTemplate                (specialist-approved prompts)");
  console.log("    • pages[].sampleImageUrl                     (specialist-approved images)");
  console.log("    • artDirectionSnapshot / protagonistSlot     (already validated, not modified)");
  console.log("    • allowedIllustrationStyles / defaultIllustrationStyle  (already validated, not modified)");
  console.log("    • previewSpreads / coverImage                (not touched)");

  console.log(
    '\n  After this update "Personalize this story" will appear on the public site because:\n' +
    "    canStartPersonalization = personalizationEnabled (✅)\n" +
    "                           && hasValidTextTemplates from page data (✅)\n" +
    "                           && visualPersonalizationEnabled (✅)\n" +
    "                           && visualPersonalizationReady (✅)\n",
  );

  if (!applyMode) {
    console.log("  ─────────────────────────────────────────────────────────");
    console.log("  DRY RUN — no changes written.");
    console.log("  Re-run with --apply to perform the Firestore update:\n");
    console.log(
      `    npx ts-node --project scripts/tsconfig.json scripts/checkPersonalizationReadiness.ts ${templateId} --apply\n`,
    );
    process.exit(0);
  }

  // Apply the update ──────────────────────────────────────────────────────────

  console.log("  Applying Firestore update...");
  await docRef.update(update);
  console.log("  ✅  Firestore update applied successfully.\n");

  // Re-read and verify ────────────────────────────────────────────────────────

  const verify = (await docRef.get()).data() as Record<string, unknown>;
  const verifyPassed =
    verify.personalizationEnabled === true &&
    verify.visualPersonalizationEnabled === true &&
    verify.visualPersonalizationReady === true;

  if (verifyPassed) {
    console.log("  ✅  Post-write verification passed.");
    console.log('\n  "Personalize this story" button will now appear on the public site.\n');
  } else {
    console.error("  ❌  Post-write verification FAILED — document does not reflect the expected values.");
    console.error("      Current values:", JSON.stringify({
      personalizationEnabled:       verify.personalizationEnabled,
      visualPersonalizationEnabled: verify.visualPersonalizationEnabled,
      visualPersonalizationReady:   verify.visualPersonalizationReady,
      textPersonalizationReady:     verify.textPersonalizationReady,
    }, null, 4));
    process.exit(1);
  }

  process.exit(0);
}

run().catch((err) => {
  console.error("\nUnhandled error:\n", err);
  process.exit(1);
});
