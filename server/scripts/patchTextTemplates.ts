/**
 * patchTextTemplates.ts
 *
 * Fixes old-format placeholder text in story_templates pages[].textTemplate
 * so that every page passes the personalization readiness check.
 *
 * What it changes (and ONLY what it changes):
 *   [CHILD_NAME]      → {{CHILD_NAME}}
 *   [HE/SHE/THEY]    → "he"  (masculine)  /  "she"  (feminine)
 *   [HIS/HER/THEIR]  → "his" (masculine)  /  "her"  (feminine)
 *   [HIM/HER/THEM]   → "him" (masculine)  /  "her"  (feminine)
 *   Khaled[HIS/HER/THEIR]'s  (page-7 typo) → "Khaled's"  (both variants)
 *
 * What it NEVER touches:
 *   sampleImageUrl · imagePromptTemplate · artDirectionSnapshot
 *   protagonistSlot · any other Firestore field outside pages[].textTemplate
 *
 * Usage (from server/):
 *   # Dry-run — prints full page-by-page before/after, writes nothing:
 *   npx ts-node --project scripts/tsconfig.json scripts/patchTextTemplates.ts <templateId>
 *
 *   # Apply — writes patched textTemplate to Firestore, then runs readiness check:
 *   npx ts-node --project scripts/tsconfig.json scripts/patchTextTemplates.ts <templateId> --apply
 */

import admin from "firebase-admin";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

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

// ─── Transformation logic ─────────────────────────────────────────────────────

const OLD_PLACEHOLDERS = [
  /\[CHILD_NAME\]/g,
  /\[HE\/SHE\/THEY\]/g,
  /\[HIS\/HER\/THEIR\]/g,
  /\[HIM\/HER\/THEM\]/g,
];

function hasOldPlaceholders(text: string): boolean {
  return OLD_PLACEHOLDERS.some((re) => re.test(text));
}

function fixTypo(text: string): string {
  // Page 7: "Khaled[HIS/HER/THEIR]'s hands" → "Khaled's hands"
  // Must run BEFORE pronoun substitution so the fused form is never seen.
  return text.replace(/Khaled\[HIS\/HER\/THEIR\]'s/g, "Khaled's");
}

function applyMasculine(raw: string): string {
  let t = fixTypo(raw);
  t = t.replace(/\[CHILD_NAME\]/g,     "{{CHILD_NAME}}");
  t = t.replace(/\[HE\/SHE\/THEY\]/g,   "he");
  t = t.replace(/\[HIS\/HER\/THEIR\]/g, "his");
  t = t.replace(/\[HIM\/HER\/THEM\]/g,  "him");
  return t;
}

function applyFeminine(raw: string): string {
  let t = fixTypo(raw);
  t = t.replace(/\[CHILD_NAME\]/g,     "{{CHILD_NAME}}");
  t = t.replace(/\[HE\/SHE\/THEY\]/g,   "she");
  t = t.replace(/\[HIS\/HER\/THEIR\]/g, "her");
  t = t.replace(/\[HIM\/HER\/THEM\]/g,  "her");
  return t;
}

// ─── Validation ───────────────────────────────────────────────────────────────

interface ValidationResult {
  ok: boolean;
  reasons: string[];
}

function validateVariant(text: string, variant: "masculine" | "feminine", pageNum: number): ValidationResult {
  const reasons: string[] = [];

  if (!text || text.trim().length === 0) {
    reasons.push(`page ${pageNum} ${variant}: is empty`);
  }
  if (!text.includes("{{CHILD_NAME}}")) {
    reasons.push(`page ${pageNum} ${variant}: missing {{CHILD_NAME}}`);
  }

  const stalePatterns: [RegExp, string][] = [
    [/\[CHILD_NAME\]/,     "[CHILD_NAME]"],
    [/\[HE\/SHE\/THEY\]/,   "[HE/SHE/THEY]"],
    [/\[HIS\/HER\/THEIR\]/,  "[HIS/HER/THEIR]"],
    [/\[HIM\/HER\/THEM\]/,   "[HIM/HER/THEM]"],
  ];
  for (const [re, label] of stalePatterns) {
    if (re.test(text)) {
      reasons.push(`page ${pageNum} ${variant}: still contains ${label}`);
    }
  }

  // Sanity: no fused Khaled typo
  if (/Khaled\[/.test(text)) {
    reasons.push(`page ${pageNum} ${variant}: Khaled+placeholder typo not resolved`);
  }

  return { ok: reasons.length === 0, reasons };
}

// ─── Diff helpers ─────────────────────────────────────────────────────────────

/** Inline-highlight the old placeholder tokens in a before-string for readability. */
function markOld(text: string): string {
  return text
    .replace(/\[CHILD_NAME\]/g,     "【CHILD_NAME】")
    .replace(/\[HE\/SHE\/THEY\]/g,   "【HE/SHE/THEY】")
    .replace(/\[HIS\/HER\/THEIR\]/g, "【HIS/HER/THEIR】")
    .replace(/\[HIM\/HER\/THEM\]/g,  "【HIM/HER/THEM】");
}

/** Inline-highlight the new placeholder in an after-string. */
function markNew(text: string): string {
  return text.replace(/\{\{CHILD_NAME\}\}/g, "❬CHILD_NAME❭");
}

function indent(text: string, spaces = 6): string {
  return text
    .split("\n")
    .map((l) => " ".repeat(spaces) + l)
    .join("\n");
}

// ─── Report ───────────────────────────────────────────────────────────────────

interface PagePatch {
  pageNumber: number;
  rawMasc: string;
  rawFem:  string;
  newMasc: string;
  newFem:  string;
  mascChanged: boolean;
  femChanged:  boolean;
  valid: ValidationResult;
}

function buildPatches(pages: Record<string, unknown>[]): PagePatch[] {
  return pages.map((pg, i) => {
    const pgNum    = typeof pg.pageNumber === "number" ? pg.pageNumber : i + 1;
    const tt       = pg.textTemplate as Record<string, string> | undefined;
    const rawMasc  = typeof tt?.masculine === "string" ? tt.masculine : "";
    const rawFem   = typeof tt?.feminine  === "string" ? tt.feminine  : "";

    // Source for transformation: prefer the masculine field as the source of truth
    // (they are currently identical for all pages in this story).
    // If they somehow differ already, transform each independently.
    const newMasc  = applyMasculine(rawMasc || rawFem);
    const newFem   = applyFeminine(rawMasc  || rawFem);

    const mascChanged = newMasc !== rawMasc;
    const femChanged  = newFem  !== rawFem;

    const mascResult = validateVariant(newMasc, "masculine", pgNum);
    const femResult  = validateVariant(newFem,  "feminine",  pgNum);
    const valid: ValidationResult = {
      ok:      mascResult.ok && femResult.ok,
      reasons: [...mascResult.reasons, ...femResult.reasons],
    };

    return { pageNumber: pgNum, rawMasc, rawFem, newMasc, newFem, mascChanged, femChanged, valid };
  });
}

function printReport(patches: PagePatch[]): void {
  const DIVIDER = "─".repeat(64);
  let totalChanged = 0;
  let totalFailed  = 0;

  for (const p of patches) {
    console.log(`\n${DIVIDER}`);
    console.log(`  PAGE ${p.pageNumber}`);
    console.log(DIVIDER);

    if (!p.mascChanged && !p.femChanged) {
      console.log("  (no changes needed — already uses correct placeholders)");
    } else {
      totalChanged++;

      // Show before only once (they're identical) unless they differ
      if (p.rawMasc === p.rawFem) {
        console.log("\n  CURRENT (masculine = feminine):");
        console.log(indent(markOld(p.rawMasc)));
      } else {
        console.log("\n  CURRENT masculine:");
        console.log(indent(markOld(p.rawMasc)));
        console.log("\n  CURRENT feminine:");
        console.log(indent(markOld(p.rawFem)));
      }

      console.log("\n  MASCULINE AFTER:");
      console.log(indent(markNew(p.newMasc)));

      console.log("\n  FEMININE AFTER:");
      console.log(indent(markNew(p.newFem)));
    }

    if (p.valid.ok) {
      console.log("\n  Validation: ✅  {{CHILD_NAME}} present, no stale placeholders");
    } else {
      totalFailed++;
      console.log("\n  Validation: ❌");
      for (const r of p.valid.reasons) {
        console.log(`    • ${r}`);
      }
    }
  }

  console.log(`\n${"═".repeat(64)}`);
  console.log("  PATCH SUMMARY");
  console.log("═".repeat(64));
  console.log(`  Pages with changes    : ${totalChanged} / ${patches.length}`);
  console.log(`  Post-patch failures   : ${totalFailed}`);

  if (totalFailed > 0) {
    console.log("\n  ❌  Some pages still fail validation after patching.");
    console.log("      This should not happen — please report a bug in this script.");
  } else {
    console.log("\n  ✅  All pages will pass validation after patching.");
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  const args = process.argv.slice(2);
  const templateId = args.find((a) => !a.startsWith("--")) ?? process.env.TEMPLATE_ID ?? "";
  const applyMode  = args.includes("--apply");

  if (!templateId) {
    console.error(
      "\nUsage:\n" +
      "  npx ts-node --project scripts/tsconfig.json scripts/patchTextTemplates.ts <templateId> [--apply]\n\n" +
      "  --apply   Write patched textTemplate to Firestore if all validation checks pass.\n" +
      "            Omit to run in read-only (dry-run) mode.\n",
    );
    process.exit(1);
  }

  console.log(`\n${"═".repeat(64)}`);
  console.log("  Text Template Patch Script");
  console.log(`  Template ID : ${templateId}`);
  console.log(`  Mode        : ${applyMode ? "APPLY (will write to Firestore)" : "DRY RUN (read-only)"}`);
  console.log("═".repeat(64));

  const db      = initFirebase();
  const docRef  = db.collection("story_templates").doc(templateId);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    console.error(`\n❌  Template "${templateId}" not found in story_templates.\n`);
    process.exit(1);
  }

  const d     = docSnap.data() as Record<string, unknown>;
  const pages = Array.isArray(d.pages) ? (d.pages as Record<string, unknown>[]) : [];

  if (pages.length === 0) {
    console.error("\n❌  Template has no pages.\n");
    process.exit(1);
  }

  console.log(`\n  ${pages.length} pages found.`);
  console.log("  Legend:  【...】 = old placeholder   ❬CHILD_NAME❭ = new placeholder\n");

  // ── Build patches and print report ─────────────────────────────────────────

  const patches = buildPatches(pages);
  printReport(patches);

  const allValid = patches.every((p) => p.valid.ok);
  if (!allValid) {
    console.error("\n❌  Aborting — patch produced invalid output. No changes written.\n");
    process.exit(1);
  }

  if (!applyMode) {
    console.log("\n  DRY RUN — no changes written to Firestore.");
    console.log("  Re-run with --apply to apply the patch:\n");
    console.log(`    npx ts-node --project scripts/tsconfig.json scripts/patchTextTemplates.ts ${templateId} --apply\n`);
    process.exit(0);
  }

  // ── Apply ────────────────────────────────────────────────────────────────

  console.log("\n  Applying patch to Firestore...");

  // Build the updated pages array — change ONLY textTemplate, preserve everything else.
  const updatedPages = pages.map((pg, i) => {
    const patch = patches[i] as PagePatch;
    return {
      ...pg,
      textTemplate: {
        masculine: patch.newMasc,
        feminine:  patch.newFem,
      },
    };
  });

  await docRef.update({ pages: updatedPages });
  console.log("  ✅  Firestore pages[] updated.\n");

  // ── Post-write verification ──────────────────────────────────────────────

  console.log("  Verifying written data...");
  const verifySnap  = await docRef.get();
  const verifyData  = verifySnap.data() as Record<string, unknown>;
  const verifyPages = Array.isArray(verifyData.pages)
    ? (verifyData.pages as Record<string, unknown>[])
    : [];

  let verifyFailed = false;
  for (let i = 0; i < verifyPages.length; i++) {
    const pg   = verifyPages[i] as Record<string, unknown>;
    const tt   = pg.textTemplate as Record<string, string> | undefined;
    const pgNum = typeof pg.pageNumber === "number" ? pg.pageNumber : i + 1;
    const mr   = validateVariant(tt?.masculine ?? "", "masculine", pgNum);
    const fr   = validateVariant(tt?.feminine  ?? "", "feminine",  pgNum);
    if (!mr.ok || !fr.ok) {
      verifyFailed = true;
      for (const r of [...mr.reasons, ...fr.reasons]) {
        console.log(`    ❌  ${r}`);
      }
    }
  }

  if (verifyFailed) {
    console.error("\n  ❌  Post-write verification FAILED — data in Firestore does not match expected output.");
    process.exit(1);
  }

  console.log("  ✅  Post-write verification passed — all pages have valid templates.\n");

  // ── Run readiness check ──────────────────────────────────────────────────

  console.log("═".repeat(64));
  console.log("  Running personalization readiness check...");
  console.log("═".repeat(64));

  const checkScript = path.resolve(__dirname, "checkPersonalizationReadiness.ts");
  const tsNode      = path.resolve(__dirname, "../node_modules/.bin/ts-node");
  const tsCfg       = path.resolve(__dirname, "tsconfig.json");
  const cmd         = `"${tsNode}" --project "${tsCfg}" "${checkScript}" ${templateId}`;

  try {
    const output = execSync(cmd, { encoding: "utf8", stdio: "pipe" });
    console.log(output);
  } catch (err: unknown) {
    // execSync throws when exit code != 0 — readiness check prints its own report
    const e = err as { stdout?: string; stderr?: string };
    if (e.stdout) console.log(e.stdout);
    if (e.stderr) console.error(e.stderr);
    console.error(
      "\n  ❌  Readiness check failed after patching — see failures above.\n" +
      "      The text templates have been updated; re-run checkPersonalizationReadiness.ts\n" +
      "      with --apply once the remaining issues are fixed.\n",
    );
    process.exit(1);
  }

  process.exit(0);
}

run().catch((err) => {
  console.error("\nUnhandled error:\n", err);
  process.exit(1);
});
