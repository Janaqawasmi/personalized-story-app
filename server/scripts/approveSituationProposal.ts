/**
 * Admin/clinical-manager review CLI for `story_templates.situationProposal`.
 *
 * A specialist can request a new situation at publish time (when no existing
 * `referenceData/situations` entry fits). That request is saved on the
 * template as `situationProposal: { status: "pending", ... }` and does NOT
 * become an official situation on its own.
 *
 * This is now a thin wrapper around
 * server/src/services/situationProposals.service.ts — the exact same
 * approve/reject logic also backs the admin dashboard's Situation Suggestions
 * page (server/src/routes/admin/situationSuggestions.router.ts). Keeping the
 * risky part (creating a live catalog entry, flipping proposal status) in one
 * place means this CLI and the web UI can never drift out of sync; use
 * whichever is more convenient.
 *
 * List pending proposals:
 *   npx ts-node -r tsconfig-paths/register scripts/approveSituationProposal.ts
 *
 * Approve one (creates the referenceData/situations item and sets
 * situationId on the template):
 *   npx ts-node -r tsconfig-paths/register scripts/approveSituationProposal.ts --templateId=<id> --situationId=<new-id>
 *
 * Reject one (leaves the template without a situationId; specialist must
 * publish again with a different choice):
 *   npx ts-node -r tsconfig-paths/register scripts/approveSituationProposal.ts --templateId=<id> --reject
 */

// Importing this self-initializes Firebase Admin (FIREBASE_SERVICE_ACCOUNT_JSON
// env var in production, or server/config/serviceAccountKey.json locally) —
// same bootstrap the Express app and every other `@/`-based script use.
import "@/config/firebase";
import {
  approveSituationProposal,
  listPendingSituationProposals,
  rejectSituationProposal,
  SituationProposalError,
} from "@/services/situationProposals.service";

const CLI_REVIEWER_ID = "cli-script";

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

const templateId = parseArg("templateId");
const newSituationId = parseArg("situationId");
const rejectFlag = process.argv.includes("--reject");

async function listPending(): Promise<void> {
  const proposals = await listPendingSituationProposals();

  if (proposals.length === 0) {
    console.log("✅ No pending situation proposals.\n");
    return;
  }

  console.log(`📋 ${proposals.length} pending situation proposal(s):\n`);
  for (const p of proposals) {
    console.log(`   templateId: ${p.templateId}`);
    console.log(`   title:      ${p.title}`);
    console.log(`   primaryTopic: ${p.primaryTopic}`);
    console.log(`   labels:     he="${p.labelHe}" ar="${p.labelAr}" en="${p.labelEn}"`);
    console.log(`   reason:     ${p.reason}`);
    console.log(`   createdBy:  ${p.createdBy}`);
    console.log(
      `   Approve:  npx ts-node -r tsconfig-paths/register scripts/approveSituationProposal.ts --templateId=${p.templateId} --situationId=<new-id>`,
    );
    console.log(
      `   Reject:   npx ts-node -r tsconfig-paths/register scripts/approveSituationProposal.ts --templateId=${p.templateId} --reject\n`,
    );
  }
}

async function run(): Promise<void> {
  if (templateId && rejectFlag) {
    const result = await rejectSituationProposal(templateId, CLI_REVIEWER_ID);
    console.log(
      result.alreadyRejected
        ? `❌ Already rejected: story_templates/${templateId}.\n`
        : `❌ Rejected the proposal on story_templates/${templateId}. It still has no situationId — ` +
            `the specialist must republish with an existing situation or a new request.\n`,
    );
    return;
  }
  if (templateId && newSituationId) {
    const result = await approveSituationProposal(templateId, newSituationId, CLI_REVIEWER_ID);
    console.log(
      result.alreadyApproved
        ? `✅ Already approved: story_templates/${templateId}.situationId = "${result.situationId}".\n`
        : `✅ Approved. Created referenceData/situations/items/${result.situationId} and set ` +
            `story_templates/${templateId}.situationId = "${result.situationId}".\n`,
    );
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
    if (err instanceof SituationProposalError) {
      console.error(`❌ ${err.code}: ${err.message}`);
    } else {
      console.error("❌ Failed:", err instanceof Error ? err.message : err);
    }
    process.exit(1);
  });
