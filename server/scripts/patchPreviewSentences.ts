/**
 * One-time migration: set `previewSentence` on each `story_templates` doc
 * from topic → sentence table. Skips docs that already define `previewSentence`.
 *
 * Run: npx ts-node scripts/patchPreviewSentences.ts
 * (from server/)
 */

import admin from "firebase-admin";
import path from "path";
import fs from "fs";

const serviceAccountPath = path.resolve(__dirname, "../config/serviceAccountKey.json");

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

const UNIVERSAL_FALLBACK =
  "{{CHILD_NAME}} looked up and smiled — this story had been waiting just for her.";

const TOPIC_ROWS: { aliases: Set<string>; sentence: string }[] = [
  {
    aliases: new Set(["anxiety", "calm", "anxiety_calm"]),
    sentence:
      "{{CHILD_NAME}} took a deep breath, and slowly, the worry began to lift.",
  },
  {
    aliases: new Set(["fear"]),
    sentence:
      "{{CHILD_NAME}} looked into the dark and decided — tonight, she wasn't afraid.",
  },
  {
    aliases: new Set(["confidence", "self_confidence", "self-esteem", "self_esteem"]),
    sentence:
      "Everyone in the village knew that {{CHILD_NAME}} could do anything she tried.",
  },
  {
    aliases: new Set(["grief", "loss", "sadness"]),
    sentence:
      "{{CHILD_NAME}} sat quietly and remembered, and that felt like enough for now.",
  },
  {
    aliases: new Set(["change", "transitions", "new_beginnings", "new beginnings"]),
    sentence:
      "{{CHILD_NAME}} had never been somewhere new before — but here she was, and it was okay.",
  },
  {
    aliases: new Set(["anger", "emotions"]),
    sentence:
      "When {{CHILD_NAME}} felt the heat rise inside, she found a way to let it go.",
  },
  {
    aliases: new Set(["friendship", "social"]),
    sentence:
      "{{CHILD_NAME}} wasn't sure anyone would notice her — until someone finally did.",
  },
  {
    aliases: new Set(["family", "siblings"]),
    sentence:
      "{{CHILD_NAME}} looked around the table and thought — this, right here, is everything.",
  },
  {
    aliases: new Set(["bedtime", "sleep", "night"]),
    sentence:
      "As {{CHILD_NAME}} closed her eyes, the whole world became soft and still.",
  },
];

function normalizeTopicToken(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/\./g, "_");
}

function topicCandidates(data: FirebaseFirestore.DocumentData): string[] {
  const out: string[] = [];
  const push = (v: unknown) => {
    if (typeof v === "string" && v.trim()) out.push(v.trim());
  };
  push(data.topic);
  push(data.primaryTopic);
  push(data.specificSituation);
  if (data.topicKey && typeof data.topicKey === "string") push(data.topicKey);
  return out;
}

/** Normalize a raw topic string to tokens (full value + underscore segments). */
function topicTokensFromString(raw: string): string[] {
  const norm = normalizeTopicToken(raw);
  const parts = norm.split("_").filter(Boolean);
  const tokens = [norm, ...parts];
  return [...new Set(tokens)];
}

function resolveSentence(candidates: string[]): string {
  const seen = new Set<string>();
  const orderedTokens: string[] = [];
  for (const c of candidates) {
    for (const t of topicTokensFromString(c)) {
      if (!seen.has(t)) {
        seen.add(t);
        orderedTokens.push(t);
      }
    }
  }
  for (const token of orderedTokens) {
    for (const row of TOPIC_ROWS) {
      if (row.aliases.has(token)) return row.sentence;
    }
  }
  return UNIVERSAL_FALLBACK;
}

function hasPreviewSentenceField(data: FirebaseFirestore.DocumentData): boolean {
  return (
    Object.prototype.hasOwnProperty.call(data, "previewSentence") &&
    data.previewSentence !== undefined &&
    data.previewSentence !== null
  );
}

type SummaryRow = {
  id: string;
  topicRaw: string;
  sentence: string;
  skipped: boolean;
};

const repairUniversal =
  process.argv.includes("--repair-universal-only") ||
  process.env.REPAIR_PREVIEW_UNIVERSAL === "1";

async function main() {
  console.log(
    `Patching previewSentence on story_templates${repairUniversal ? " (repair universal fallback only)" : ""}…\n`
  );

  const snapshot = await db.collection("story_templates").get();
  const summary: SummaryRow[] = [];

  let written = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const id = doc.id;

    const candidates = topicCandidates(data);
    const sentence = resolveSentence(candidates);
    const topicRaw =
      [data.topic, data.primaryTopic, data.specificSituation, data.topicKey]
        .filter((x) => typeof x === "string")
        .join(" | ") || "(none)";

    const existing = data.previewSentence;
    const hasField = hasPreviewSentenceField(data);
    const isUniversal =
      typeof existing === "string" && existing.trim() === UNIVERSAL_FALLBACK;

    if (hasField && !repairUniversal) {
      skipped++;
      summary.push({
        id,
        topicRaw,
        sentence: String(existing),
        skipped: true,
      });
      continue;
    }

    if (repairUniversal && hasField && !isUniversal) {
      skipped++;
      summary.push({
        id,
        topicRaw,
        sentence: String(existing),
        skipped: true,
      });
      continue;
    }

    if (repairUniversal && hasField && isUniversal && sentence === UNIVERSAL_FALLBACK) {
      skipped++;
      summary.push({
        id,
        topicRaw,
        sentence: String(existing),
        skipped: true,
      });
      continue;
    }

    if (
      repairUniversal &&
      hasField &&
      isUniversal &&
      sentence !== UNIVERSAL_FALLBACK
    ) {
      await doc.ref.update({ previewSentence: sentence });
      written++;
      summary.push({ id, topicRaw, sentence, skipped: false });
      continue;
    }

    if (!repairUniversal && !hasField) {
      await doc.ref.update({ previewSentence: sentence });
      written++;
      summary.push({ id, topicRaw, sentence, skipped: false });
      continue;
    }

    if (repairUniversal && !hasField) {
      await doc.ref.update({ previewSentence: sentence });
      written++;
      summary.push({ id, topicRaw, sentence, skipped: false });
      continue;
    }

    skipped++;
    summary.push({
      id,
      topicRaw,
      sentence: hasField ? String(existing) : "(none)",
      skipped: true,
    });
  }

  console.log("— Summary —\n");
  for (const row of summary) {
    if (row.skipped) {
      console.log(
        `[SKIP] ${row.id}\n  topic: ${row.topicRaw}\n  existing previewSentence: ${row.sentence.slice(0, 80)}${row.sentence.length > 80 ? "…" : ""}\n`
      );
    } else {
      console.log(`[WRITE] ${row.id}\n  topic: ${row.topicRaw}\n  previewSentence: ${row.sentence}\n`);
    }
  }

  console.log(`\nDone. Written: ${written}, skipped (already had field): ${skipped}, total docs: ${snapshot.size}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
