/**
 * Investigate + backfill missing pricing fields on `story_templates`
 * documents so every live template has explicit digital + print pricing.
 *
 * Root cause (see PricingCard.tsx, mapFirestoreToVM.ts, purchasePricing.service.ts):
 * every pricing read path already has a fallback default (priceCents ->
 * DEFAULT_DIGITAL_PRICE_CENTS=2999, currency -> "ILS"), so a template missing
 * these fields still displays and charges ₪29.99 today — nothing is broken
 * for digital. Print is different: nothing defaults `printAvailable` to
 * true, so a template missing that field never offers print at all.
 *
 * Product decision (explicit, dated): for now, print should be enabled by
 * default on every live template so the print purchase flow can be tested
 * end-to-end. `publishStory.ts` already does this for every NEW publish
 * (priceCents/printPriceCents/currency/printAvailable are set unconditionally
 * at publish time — see the DEFAULT_TEMPLATE_* constants there). This script
 * is the one-time catch-up for templates published before those fields
 * existed. A later product change can add a per-story "disable print" admin
 * toggle; until then the default is print-enabled.
 *
 * What this script does NOT do, on purpose:
 *  - It never touches `status`/`isActive` (lifecycle fields) — a draft is a
 *    draft; this script only ever writes pricing fields on templates that
 *    are already `status === "approved" && isActive !== false`.
 *  - It never overwrites an already-valid custom price. `priceCents`,
 *    `currency`, and `printPriceCents` are only filled in when missing/invalid
 *    — an intentional specialist-set price is never clobbered.
 *  - `printAvailable` is the one field this script forces to `true`
 *    unconditionally on qualifying templates, per the product decision above
 *    (not "fill if missing" — an existing `printAvailable: false` is also
 *    turned on, since the goal right now is "print works everywhere for
 *    testing," not "leave whatever was there before").
 *
 * Safety: unlike other scripts in this folder, this one defaults to
 * REPORT-ONLY. Pricing backfills touch real checkout amounts, so writes
 * require an explicit --apply flag; without it, nothing is ever written.
 *
 * Usage (from server/):
 *   npx ts-node --project scripts/tsconfig.json scripts/backfillTemplatePricing.ts            # report only
 *   npx ts-node --project scripts/tsconfig.json scripts/backfillTemplatePricing.ts --apply     # writes the fields
 */

import admin from "firebase-admin";
import path from "path";
import fs from "fs";

const DEFAULT_DIGITAL_PRICE_CENTS = 2999;
const DEFAULT_PRINT_PRICE_CENTS = 5999;
const DEFAULT_CURRENCY = "ILS";

function initFirebase() {
  const fromEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const sa = fromEnv && fromEnv.trim()
    ? JSON.parse(fromEnv)
    : JSON.parse(fs.readFileSync(path.resolve(__dirname, "../config/serviceAccountKey.json"), "utf8"));
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(sa as admin.ServiceAccount) });
  }
  return admin.firestore();
}

function toFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function titleOf(data: FirebaseFirestore.DocumentData): string {
  const t = data.title;
  if (typeof t === "string") return t;
  if (t && typeof t === "object") return t.he ?? t.en ?? t.ar ?? "(untitled)";
  return "(untitled)";
}

interface Finding {
  id: string;
  title: string;
  isApprovedAndActive: boolean;
  patch: Record<string, unknown>;
  alreadyCorrect: boolean;
}

async function run() {
  const apply = process.argv.includes("--apply");
  const db = initFirebase();

  console.log(
    apply
      ? "APPLY MODE — pricing fields will be written to approved+active templates.\n"
      : "REPORT ONLY — no writes will be made. Pass --apply to write the fields listed below.\n",
  );

  const snap = await db.collection("story_templates").get();
  console.log(`Scanning ${snap.size} story_templates...\n`);

  const findings: Finding[] = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const isApprovedAndActive = data.status === "approved" && data.isActive !== false;
    if (!isApprovedAndActive) continue; // drafts/inactive/sample templates are never touched

    const priceCents = toFiniteNumber(data.priceCents);
    const currency = typeof data.currency === "string" && data.currency.trim() ? data.currency : null;
    const printPriceCents = toFiniteNumber(data.printPriceCents);
    const printAvailable = data.printAvailable === true;

    const patch: Record<string, unknown> = {};
    if (priceCents === null) patch.priceCents = DEFAULT_DIGITAL_PRICE_CENTS;
    if (!currency) patch.currency = DEFAULT_CURRENCY;
    if (printPriceCents === null) patch.printPriceCents = DEFAULT_PRINT_PRICE_CENTS;
    if (!printAvailable) patch.printAvailable = true;

    findings.push({
      id: doc.id,
      title: titleOf(data),
      isApprovedAndActive,
      patch,
      alreadyCorrect: Object.keys(patch).length === 0,
    });
  }

  const toUpdate = findings.filter((f) => !f.alreadyCorrect);

  if (findings.length === 0) {
    console.log("No approved+active templates found.");
    process.exit(0);
  }

  console.log(`Found ${findings.length} approved+active template(s):\n`);
  for (const f of findings) {
    console.log(`---- ${f.id} (${f.title}) ----`);
    if (f.alreadyCorrect) {
      console.log("  Already has priceCents/currency/printPriceCents/printAvailable=true — nothing to do.");
    } else {
      console.log(`  ${apply ? "Writing" : "Would write"}: ${JSON.stringify(f.patch)}`);
      if (apply) {
        await db.collection("story_templates").doc(f.id).update(f.patch);
      }
    }
    console.log("");
  }

  console.log("========================================");
  console.log(`Approved+active templates scanned: ${findings.length}`);
  console.log(`${apply ? "Templates updated" : "Templates that would be updated"}: ${toUpdate.length}`);
  console.log(`Already correct: ${findings.length - toUpdate.length}`);
  console.log(
    apply
      ? "\nDone — writes applied."
      : "\nDone — report only, nothing written. Re-run with --apply to write the fields listed above.",
  );
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
