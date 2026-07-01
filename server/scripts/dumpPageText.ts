/**
 * Dumps full textTemplate content for all pages of one story_templates document.
 * Usage (from server/):
 *   npx ts-node --project scripts/tsconfig.json scripts/dumpPageText.ts <templateId>
 */
import admin from "firebase-admin";
import path from "path";
import fs from "fs";

function initFirebase(): admin.firestore.Firestore {
  const fromEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const sa =
    fromEnv && fromEnv.trim()
      ? JSON.parse(fromEnv)
      : JSON.parse(
          fs.readFileSync(path.resolve(__dirname, "../config/serviceAccountKey.json"), "utf8"),
        );
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(sa as admin.ServiceAccount) });
  }
  return admin.firestore();
}

async function run(): Promise<void> {
  const templateId = process.argv[2] ?? process.env.TEMPLATE_ID ?? "";
  if (!templateId) {
    console.error("Usage: npx ts-node --project scripts/tsconfig.json scripts/dumpPageText.ts <templateId>");
    process.exit(1);
  }
  const db = initFirebase();
  const snap = await db.collection("story_templates").doc(templateId).get();
  if (!snap.exists) { console.error(`Template ${templateId} not found`); process.exit(1); }
  const d = snap.data() as Record<string, unknown>;
  const pages = Array.isArray(d.pages) ? d.pages as Record<string, unknown>[] : [];
  console.log(`\nTemplate: ${templateId}  (${pages.length} pages)\n`);
  for (let i = 0; i < pages.length; i++) {
    const pg = pages[i] as Record<string, unknown>;
    const tt = pg.textTemplate as Record<string, string> | undefined;
    console.log(`===== PAGE ${i + 1} (pageNumber=${pg.pageNumber ?? "?"}) =====`);
    console.log(`--- masculine ---\n${tt?.masculine ?? "(MISSING)"}`);
    console.log(`--- feminine ---\n${tt?.feminine ?? "(MISSING)"}\n`);
  }
  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
