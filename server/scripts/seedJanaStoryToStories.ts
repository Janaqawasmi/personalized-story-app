// Seeds the "Jana first day at school – Room 4" story into the `stories`
// Firestore collection so it appears in the specialist dashboard.
//
// Usage:
//   npx ts-node -r tsconfig-paths/register scripts/seedJanaStoryToStories.ts
//
// The script looks up the ownerUid automatically by the OWNER_EMAIL below.
// Override with env vars:
//   STORY_OWNER_UID=<uid>   — bypass email lookup and use this UID directly
//   STORY_OWNER_EMAIL=<email>
//   STORY_ID=<docId>        — Firestore document id (default: jana-school-room4)

import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import type { Story } from "@/models/story.model";

const serviceAccountPath = path.resolve(__dirname, "../config/serviceAccountKey.json");

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

const STORY_ID    = process.env.STORY_ID          ?? "jana-school-room4";
const OWNER_EMAIL = process.env.STORY_OWNER_EMAIL ?? "shahdmuhtaseb96@gmail.com";

const PAGE_TEXTS: string[] = [
  "Jana stopped three steps from the door. Her feet wouldn't go. The hallway smelled like pencils and floor polish, and somewhere far off a bell was ringing for someone else. Her backpack felt heavier than it was. The door to Room 4 was closed. The handle looked cold.",
  "Another kid was stopped there too. A kid named Sam. Sam was holding the strap of her backpack so tight her knuckles had gone white. Jana looked at Sam. Sam looked at her. Neither of them said anything. But something passed between them, the way a small light passes from one window to another.",
  "Jana's stomach was a knot. Her hands wanted to hold onto something that wasn't there. Inside her chest a small voice was saying the other kids just walk in, why can't I just walk in. She took a breath in, slow, like smelling something good on a plate. She let it out slow, like cooling soup.",
  "Then she took one step. Just one. She was closer to the door now. Her feet were still shaking a little inside her shoes, but they had moved. That counted. Another step. And another. Her hand reached out and the handle was cold, cold as a stone from a river, and she pushed.",
  "The classroom opened up in front of her. It was full of sounds she couldn't sort out - chairs scraping, voices, a pencil tapping somewhere. Rows of desks. She didn't know which one was her desk. Her throat got tight. One thing, she thought. Just find one desk.",
  "She walked to one near the window and sat down. The chair was hard. Her feet didn't quite touch the floor. One whole minute, she told herself. I can sit here for one whole minute. And then the lunchroom bell rang.",
  "It rolled down the hallway like a wave and hit the room, and Jana's throat went tight and her eyes filled up hot and fast. Her hands gripped the edge of the desk because there was nothing else to hold. The tears came so quickly she couldn't stop them. She didn't want anyone to see.",
  "She tucked her chin down so her hair fell forward like a curtain. Under the desk, where nobody could look, her hands were shaking in her lap. And there, hidden, she did the thing she had figured out at the door. Breathe in slow. Like smelling something good. Breathe out slow. Like cooling soup. In. Out. In. Out.",
  "The wave in her chest got a little smaller. Then a little smaller than that. Her hands were still shaking, but she was still here. She hadn't run. She was shaking and staying at the same time, and somehow both things were true. She lifted her head a little. One thing you can see, she thought.",
  "There was a blue stripe painted along the wall, right under the window. A long, quiet blue stripe. She looked at it and the blue looked back. Across the room, Sam was looking at her. Not staring. Just there. Sam gave her the tiniest nod - so small only Jana would have seen it. Jana nodded back.",
  "The morning went on. The afternoon went on. The sounds stayed loud and the chair stayed hard, but Jana stayed too.",
  "At the end of the day, Jana walked out of Room 4 with Sam beside her. They didn't talk. They just walked, shoes squeaking on the tile together. The door she couldn't walk through that morning was behind her now.",
  "Her backpack felt lighter, even though nothing inside it had changed. Her hands had been shaking all day. She had kept going all day. Both of those things were true.",
];

function countWords(text: string): number {
  const normalized = text.trim();
  if (!normalized) return 0;
  return normalized.split(/\s+/).length;
}

async function resolveOwnerUid(): Promise<string> {
  // Explicit env override — use as-is
  if (process.env.STORY_OWNER_UID) {
    console.log(`Using STORY_OWNER_UID from env: ${process.env.STORY_OWNER_UID}`);
    return process.env.STORY_OWNER_UID;
  }

  // Look up by email via Firebase Auth Admin SDK
  console.log(`Looking up UID for email: ${OWNER_EMAIL} …`);
  try {
    const user = await admin.auth().getUserByEmail(OWNER_EMAIL);
    console.log(`Found UID: ${user.uid}`);
    return user.uid;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Could not find Firebase user with email "${OWNER_EMAIL}".\n` +
      `Original error: ${msg}\n\n` +
      `Set STORY_OWNER_UID=<uid> to skip the email lookup.`,
    );
  }
}

async function seedStory(): Promise<void> {
  const ownerUid = await resolveOwnerUid();
  const now = Date.now();
  const combinedBody = PAGE_TEXTS.join("\n\n");
  const totalWordCount = countWords(combinedBody);

  const story: Story = {
    id: STORY_ID,
    ownerUid,
    parentStoryId: null,
    title: "Jana's First Day — Room 4",
    storyType: "fear_anxiety",
    ageRange: "5-7",
    tags: ["school_anxiety", "emotional_regulation", "brave_steps"],
    // illustration_ready means the Illustrations tab opens the book viewer
    status: "illustration_ready",
    briefStatus: "submitted",
    brief: {
      createdAt: now as never,
      updatedAt: now as never,
      createdBy: ownerUid,
      status: "submitted",
      version: 1,
      storyType: "fear_anxiety",
      ageAndScope: {
        ageRange: "5-7",
        peakIntensity: "moderate",
        storyLength: "standard",
      },
      clinicalFoundation: {
        population: "Child beginning school who experiences intense anxiety at classroom entry and in noisy transitions.",
        trigger: "Entering the classroom and hearing the lunch bell in a crowded, loud environment.",
        therapeuticIntention: {
          feel: "quietly brave",
          because: "she can feel fear in her body and still stay present using small, repeatable steps.",
        },
        creativeVision: "Grounded school-day realism with sensory detail, tiny social connection, and a calm internal rhythm through breathing and noticing.",
        oneTrueThing: "Shaking and staying can both be true.",
      },
      therapeuticArchitecture: {
        primaryApproach: "self_regulation",
        supportingApproach: "normalization",
        shameDimension: "present",
        typeSpecificField: {
          fieldType: "somatic_expression",
          selections: ["stomach_ache_feeling_sick", "tension_clenching"],
        },
        copingTool: "deep_breathing",
        resolutionCompleteness: "partial",
        mustNeverList: [
          "Never imply Jana's fear is silly or wrong.",
          "Never resolve by removing the school challenge completely.",
          "Never erase distress; show coping as effortful and real.",
        ],
      },
      storyWorld: {
        personalization: true,
        protagonistType: "child",
        caregiverPresence: "waiting_at_the_end",
        narrativeDistance: "direct",
        supportingCharacters: [
          {
            type: "peer_alongside",
            functionalRole: "Sam silently signals shared courage and connection.",
          },
        ],
      },
      personalizationConfig: {},
      acknowledgedWarnings: [],
    },
    agent1Result: null,
    agent1Versions: [],
    currentDraft: {
      title: "Jana's First Day — Room 4",
      body: combinedBody,
      wordCount: totalWordCount,
      updatedAt: now,
    },
    // Pages seeded with status=done so the book viewer shows them.
    // illustrationUrl is null until you add images manually in Firebase console.
    pages: PAGE_TEXTS.map((text, index) => ({
      pageNumber: index + 1,
      text,
      wordCount: countWords(text),
      imagePrompt: null,
      promptStatus: "approved",
      promptRejectionNote: null,
      illustrationUrl: null,
      illustrationStatus: "done",
      illustrationRejectionNote: null,
    })),
    editHistory: [
      {
        id: crypto.randomUUID(),
        at: now,
        byUid: ownerUid,
        event: { kind: "brief_submitted" },
      },
      {
        id: crypto.randomUUID(),
        at: now,
        byUid: ownerUid,
        event: { kind: "status_changed", from: "draft_brief", to: "approved" },
      },
      {
        id: crypto.randomUUID(),
        at: now,
        byUid: ownerUid,
        event: { kind: "status_changed", from: "approved", to: "illustration_ready" },
      },
    ],
    visualBible: null,
    illustrationSeed: null,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
    submittedAt: now,
    approvedAt: now,
    promptsGeneratedAt: now,
    promptsApprovedAt: now,
    illustrationCompletedAt: now,
    illustrationReadyAt: now,
    publishedAt: null,
  };

  await db.collection("stories").doc(STORY_ID).set(story, { merge: true });

  console.log("\n✓ Story seeded successfully");
  console.log(`  Firestore path : stories/${STORY_ID}`);
  console.log(`  Owner UID      : ${ownerUid}`);
  console.log(`  Pages          : ${PAGE_TEXTS.length}`);
  console.log(`  Status         : illustration_ready`);
  console.log("\nNext step: open Firebase console → stories/${STORY_ID} → pages[]");
  console.log("Set illustrationUrl on each page to add your images.");
}

seedStory()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
