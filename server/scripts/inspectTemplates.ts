/**
 * Inspect story_templates for personalization readiness.
 * Usage (from server/):
 *   npx ts-node --project scripts/tsconfig.json scripts/inspectTemplates.ts
 */

import admin from "firebase-admin";
import path from "path";
import fs from "fs";

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

function gate(val: unknown, name: string): string {
  return val === true
    ? `  ✅ ${name}: true`
    : `  ❌ ${name}: ${JSON.stringify(val ?? "MISSING")}`;
}

async function run() {
  const db = initFirebase();
  const snap = await db.collection("story_templates").get();

  if (snap.empty) {
    console.log("No story_templates documents found.");
    return;
  }

  let found = 0;

  for (const doc of snap.docs) {
    const d = doc.data();

    // Only inspect templates that have any personalization intent
    if (!d.personalizationEnabled && !d.textPersonalizationReady && !d.visualPersonalizationEnabled) {
      continue;
    }

    found++;
    console.log("\n========================================");
    console.log(`Template ID : ${doc.id}`);
    const title = typeof d.title === "object" ? (d.title.he ?? d.title.ar ?? JSON.stringify(d.title)) : (d.title ?? "(no title)");
    console.log(`Title       : ${title}`);
    console.log(`Status      : ${d.status ?? "(missing)"}`);

    console.log("\n--- Readiness gates ---");
    console.log(gate(d.personalizationEnabled,       "personalizationEnabled"));
    console.log(gate(d.textPersonalizationReady,     "textPersonalizationReady"));
    console.log(gate(d.visualPersonalizationEnabled, "visualPersonalizationEnabled"));
    console.log(gate(d.visualPersonalizationReady,   "visualPersonalizationReady"));

    const canStart =
      d.personalizationEnabled === true &&
      d.textPersonalizationReady === true &&
      d.visualPersonalizationEnabled === true &&
      d.visualPersonalizationReady === true;
    console.log(
      `\n  → canStartPersonalization: ${canStart
        ? "✅ TRUE — wizard opens"
        : "❌ FALSE — shows 'Personalization coming soon'"}`
    );

    console.log("\n--- Visual personalization config ---");
    console.log(`  allowedIllustrationStyles  : ${JSON.stringify(d.allowedIllustrationStyles ?? "MISSING")}`);
    console.log(`  defaultIllustrationStyle   : ${JSON.stringify(d.defaultIllustrationStyle ?? "MISSING")}`);
    console.log(`  protagonistSlot            : ${JSON.stringify(d.protagonistSlot ?? "MISSING")}`);
    console.log(`  personalizedCharacterPolicy: ${JSON.stringify(d.personalizedCharacterPolicy ?? "MISSING")}`);
    console.log(`  artDirectionStoredInline   : ${JSON.stringify(d.artDirectionStoredInline ?? "MISSING")}`);

    if (d.artDirectionSnapshot) {
      console.log(`  artDirectionSnapshot (inline): ✅ present (keys: ${Object.keys(d.artDirectionSnapshot as object).join(", ")})`);
    } else if (d.artDirectionStoredInline === false) {
      const subDoc = await db
        .collection("story_templates").doc(doc.id)
        .collection("personalizationArtefacts").doc("snapshot")
        .get();
      if (subDoc.exists) {
        console.log(`  personalizationArtefacts/snapshot: ✅ present (keys: ${Object.keys(subDoc.data()!).join(", ")})`);
      } else {
        console.log(`  personalizationArtefacts/snapshot: ❌ MISSING`);
      }
    } else {
      console.log(`  artDirectionSnapshot: ❌ not set (artDirectionStoredInline=${d.artDirectionStoredInline ?? "MISSING"})`);
    }

    console.log("\n--- Text variants on pages[] ---");
    const pages: Record<string, unknown>[] = Array.isArray(d.pages) ? d.pages as Record<string, unknown>[] : [];
    console.log(`  Total pages in template: ${pages.length}`);

    const missingText: number[] = [];
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i] as Record<string, unknown> | undefined;
      const tt = (p?.textTemplate) as Record<string, string> | undefined;
      const hasMasc = typeof tt?.masculine === "string" && tt.masculine.trim().length > 0;
      const hasFem  = typeof tt?.feminine  === "string" && tt.feminine.trim().length > 0;
      if (!hasMasc || !hasFem) missingText.push(i + 1);
    }

    if (missingText.length === 0) {
      console.log(`  ✅ All ${pages.length} pages have textTemplate.masculine + feminine`);
    } else {
      console.log(`  ❌ Pages missing textTemplate variants (page numbers): [${missingText.join(", ")}]`);
      const firstIdx = (missingText[0] ?? 1) - 1;
      const firstPage = pages[firstIdx] as Record<string, unknown> | undefined;
      console.log(`     Page ${missingText[0]} textTemplate:`, JSON.stringify((firstPage?.textTemplate) ?? null, null, 4));
      const firstImagePromptTemplate = firstPage?.imagePromptTemplate;
      if (firstImagePromptTemplate) {
        console.log(`     Page ${missingText[0]} imagePromptTemplate: "${String(firstImagePromptTemplate).slice(0, 80)}..."`);
      }
    }

    console.log("\n--- textVariants subcollection ---");
    const tvSnap = await db
      .collection("story_templates").doc(doc.id)
      .collection("textVariants")
      .get();
    if (tvSnap.empty) {
      console.log("  (empty — no textVariants documents)");
    } else {
      for (const tv of tvSnap.docs) {
        const tvd = tv.data();
        console.log(`  [${tv.id}] status=${tvd.status ?? "?"} approved=${tvd.approved ?? "?"} reviewedBy=${tvd.reviewedBy ?? "?"}`);
      }
    }
  }

  if (found === 0) {
    console.log("\nNo templates with personalization intent found — all templates have personalizationEnabled=false/missing.");
  }

  console.log("\n========================================\nDone.\n");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
