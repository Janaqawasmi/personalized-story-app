/**
 * Admin/clinical-manager review step for `story_templates.situationProposal`.
 *
 * A specialist can request a new situation at publish time (when no existing
 * `referenceData/situations` entry fits). That request is saved on the
 * template as `situationProposal: { status: "pending", ... }` and does NOT
 * become an official situation on its own — this script is the manual
 * approval/rejection step, matching the existing `seedReferenceData.ts`
 * pattern of managing `referenceData` via a locally-run script rather than
 * a new admin UI (Firestore rules already make `referenceData` writes
 * admin-SDK-only).
 *
 * List pending proposals:
 *   npx ts-node scripts/approveSituationProposal.ts
 *
 * Approve one (creates the referenceData/situations item and sets
 * situationId on the template):
 *   npx ts-node scripts/approveSituationProposal.ts --templateId=<id> --situationId=<new-id>
 *
 * Reject one (leaves the template without a situationId; specialist must
 * publish again with a different choice):
 *   npx ts-node scripts/approveSituationProposal.ts --templateId=<id> --reject
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

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

const templateId = parseArg("templateId");
const newSituationId = parseArg("situationId");
const rejectFlag = process.argv.includes("--reject");

async function listPending() {
  const snap = await db
    .collection("story_templates")
    .where("situationProposal.status", "==", "pending")
    .get();

  if (snap.empty) {
    console.log("✅ No pending situation proposals.\n");
    return;
  }

  console.log(`📋 ${snap.size} pending situation proposal(s):\n`);
  for (const doc of snap.docs) {
    const data = doc.data();
    const p = data.situationProposal ?? {};
    console.log(`   templateId: ${doc.id}`);
    console.log(`   title:      ${data.title}`);
    console.log(`   primaryTopic: ${data.primaryTopic}`);
    console.log(`   labels:     he="${p.labelHe ?? ""}" ar="${p.labelAr ?? ""}" en="${p.labelEn ?? ""}"`);
    console.log(`   reason:     ${p.reason ?? ""}`);
    console.log(`   createdBy:  ${p.createdBy ?? ""}`);
    console.log(
      `   Approve:  npx ts-node scripts/approveSituationProposal.ts --templateId=${doc.id} --situationId=<new-id>`,
    );
    console.log(
      `   Reject:   npx ts-node scripts/approveSituationProposal.ts --templateId=${doc.id} --reject\n`,
    );
  }
}

async function approve(id: string, situationId: string) {
  const ref = db.collection("story_templates").doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error(`No story_templates doc with id "${id}"`);
  const data = snap.data()!;
  const proposal = data.situationProposal;
  if (!proposal || proposal.status !== "pending") {
    throw new Error(`Template "${id}" has no pending situationProposal.`);
  }

  const situationRef = db
    .collection("referenceData")
    .doc("situations")
    .collection("items")
    .doc(situationId);
  const existing = await situationRef.get();
  if (existing.exists) {
    throw new Error(
      `referenceData/situations/items/${situationId} already exists. Choose a different id.`,
    );
  }

  await situationRef.set({
    label_en: proposal.labelEn ?? "",
    label_ar: proposal.labelAr ?? "",
    label_he: proposal.labelHe ?? "",
    topicKey: data.primaryTopic ?? "",
    active: true,
  });

  await ref.update({
    situationId,
    "situationProposal.status": "approved",
  });

  console.log(
    `✅ Approved. Created referenceData/situations/items/${situationId} and set ` +
      `story_templates/${id}.situationId = "${situationId}".\n`,
  );
}

async function reject(id: string) {
  const ref = db.collection("story_templates").doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error(`No story_templates doc with id "${id}"`);
  const proposal = snap.data()?.situationProposal;
  if (!proposal || proposal.status !== "pending") {
    throw new Error(`Template "${id}" has no pending situationProposal.`);
  }

  await ref.update({ "situationProposal.status": "rejected" });
  console.log(
    `❌ Rejected the proposal on story_templates/${id}. It still has no situationId — ` +
      `the specialist must republish with an existing situation or a new request.\n`,
  );
}

async function run() {
  if (templateId && rejectFlag) {
    await reject(templateId);
    return;
  }
  if (templateId && newSituationId) {
    await approve(templateId, newSituationId);
    return;
  }
  if (templateId) {
    throw new Error("Pass either --situationId=<new-id> to approve or --reject to reject.");
  }
  await listPending();
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Failed:", err.message ?? err);
    process.exit(1);
  });
