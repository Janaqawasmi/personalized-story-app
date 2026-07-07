/** @jest-environment node */

/**
 * Regression tests for the "approve the wrong version" bug: the specialist
 * could view version 2/3 (or a model variant from /generate-variant) in the
 * Draft tab, click Approve, and have the server silently approve whatever
 * text happened to already be persisted in `currentDraft` instead of the
 * version actually on screen.
 *
 * The fix has the client send an explicit `draft` (title/body/wordCount +
 * sourceGenerationId) alongside the `approved` transition. The server
 * validates it, folds it into `currentDraft`/`pages` atomically, and records
 * `approvedGenerationId` as an audit trail of which version was approved.
 */

jest.mock("../../../middleware/auth.middleware", () => ({
  requireAuth: (_req: any, _res: any, next: any) => next(),
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock("../../../agent1", () => ({
  generateStoryDraftFromBrief: jest.fn(),
  BriefNotReadyError: class BriefNotReadyError extends Error {},
  UnsupportedStoryTypeError: class UnsupportedStoryTypeError extends Error {},
  TypeMismatchError: class TypeMismatchError extends Error {},
  Step1IncoherentError: class Step1IncoherentError extends Error {},
}));

jest.mock("../../../agent1/shared/llm-client", () => ({
  NoTextBlockError: class NoTextBlockError extends Error {},
}));

jest.mock("../../../illustration/shared/job-enqueue", () => ({
  enqueueJob: jest.fn(),
}));

jest.mock("../../../illustration/shared/history-events", () => ({
  appendIllustrationEvent: jest.fn(),
  appendIllustrationEvents: jest.fn(),
}));

jest.mock("../../../illustration/shared/artefact-store", () => ({
  readLatestImage: jest.fn(),
  listImagesForPage: jest.fn(),
  listScenePlansForPage: jest.fn(),
  readVisualBible: jest.fn(),
  listVisualBibleVersions: jest.fn(),
}));

jest.mock("../../../illustration/orchestrator/patchVisualBible", () => ({
  patchVisualBible: jest.fn(),
  PatchVisualBibleValidationError: class PatchVisualBibleValidationError extends Error {},
}));

jest.mock("../../../illustration/orchestrator/publishStory", () => ({
  publishStory: jest.fn(),
  PublishStoryError: class PublishStoryError extends Error {},
}));

type DocData = Record<string, unknown>;

let storyDb: Record<string, DocData> = {};

function makeDocRef(storyId: string) {
  return {
    get: jest.fn(() =>
      Promise.resolve({
        exists: storyDb[storyId] !== undefined,
        data: () => storyDb[storyId],
      }),
    ),
    update: jest.fn((patch: DocData) => {
      storyDb[storyId] = { ...storyDb[storyId], ...patch };
      return Promise.resolve();
    }),
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({ get: jest.fn(), update: jest.fn() })),
    })),
  };
}

jest.mock("../../../config/firebase", () => ({
  firestore: {
    collection: jest.fn((path: string) => {
      if (path !== "stories") throw new Error(`Unexpected collection: ${path}`);
      return {
        doc: jest.fn((storyId: string) => makeDocRef(storyId)),
      };
    }),
  },
}));

import { reconcilePagesFromDraft, parseApprovalDraft } from "../stories.router";
import storiesRouter from "../stories.router";
import type { Story, StoryPage } from "../../../models/story.model";

function findHandler(method: string, path: string) {
  const layer = (storiesRouter as any).stack.find(
    (l: any) => l.route && l.route.path === path && l.route.methods[method],
  );
  if (!layer) throw new Error(`No route found for ${method} ${path}`);
  const handlers = layer.route.stack.map((s: any) => s.handle);
  return handlers[handlers.length - 1];
}

async function invokeTransition(storyId: string, ownerUid: string, body: DocData) {
  const handler = findHandler("post", "/:storyId/transitions");
  const req: any = { params: { storyId }, user: { uid: ownerUid }, body };
  let statusCode = 0;
  let responseBody: any = null;
  const res: any = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: any) {
      responseBody = payload;
      return this;
    },
  };
  await handler(req, res);
  return { statusCode, body: responseBody };
}

function makeVersion(overrides: Partial<DocData> = {}): DocData {
  return {
    generationId: "gen-1",
    title: "Title",
    story: "Body text.",
    wordCount: 2,
    targetWordRange: [1, 10],
    wordCountDrift: "within_range",
    postValidationFlags: [],
    generatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function seedStory(storyId: string, overrides: Partial<DocData> = {}): void {
  const v1 = makeVersion({ generationId: "gen-1", title: "V1 title", story: "V1 body." });
  storyDb[storyId] = {
    ownerUid: "specialist-1",
    status: "in_review",
    title: "V1 title",
    agent1Result: v1,
    agent1Versions: [v1],
    currentDraft: { title: "V1 title", body: "V1 body.", wordCount: 2, updatedAt: 1 },
    pages: [{ pageNumber: 1, text: "V1 body.", wordCount: 2 }],
    editHistory: [],
    approvedAt: null,
    approvedGenerationId: null,
    ...overrides,
  };
}

beforeEach(() => {
  storyDb = {};
  jest.clearAllMocks();
});

// ============================================================================
// Pure helper unit tests
// ============================================================================

describe("parseApprovalDraft", () => {
  it("returns null for missing/non-object input", () => {
    expect(parseApprovalDraft(undefined)).toBeNull();
    expect(parseApprovalDraft(null)).toBeNull();
    expect(parseApprovalDraft("nope")).toBeNull();
  });

  it("returns null when body is missing or empty", () => {
    expect(parseApprovalDraft({ title: "T", body: "" })).toBeNull();
    expect(parseApprovalDraft({ title: "T", body: "   " })).toBeNull();
    expect(parseApprovalDraft({ title: "T" })).toBeNull();
  });

  it("derives wordCount when not provided", () => {
    const parsed = parseApprovalDraft({ title: "T", body: "one two three" });
    expect(parsed?.wordCount).toBe(3);
  });

  it("preserves an explicit sourceGenerationId, trimmed", () => {
    const parsed = parseApprovalDraft({
      title: "T",
      body: "hello",
      sourceGenerationId: "  gen-2  ",
    });
    expect(parsed?.sourceGenerationId).toBe("gen-2");
  });

  it("omits sourceGenerationId when blank", () => {
    const parsed = parseApprovalDraft({ title: "T", body: "hello", sourceGenerationId: "  " });
    expect(parsed?.sourceGenerationId).toBeUndefined();
  });
});

describe("reconcilePagesFromDraft", () => {
  function story(pages: StoryPage[] | null, draftBody: string): Story {
    return {
      pages,
      currentDraft: draftBody ? { title: "T", body: draftBody, wordCount: 1, updatedAt: 1 } : null,
    } as Story;
  }

  it("returns null when the draft matches the composed pages (no manual edits)", () => {
    const pages: StoryPage[] = [{ pageNumber: 1, text: "Para one.", wordCount: 2 }];
    expect(reconcilePagesFromDraft(story(pages, "Para one."))).toBeNull();
  });

  it("rebuilds pages when the draft diverges from the existing pages (version switch)", () => {
    const pages: StoryPage[] = [{ pageNumber: 1, text: "Para one.", wordCount: 2 }];
    const result = reconcilePagesFromDraft(story(pages, "A different version entirely."));
    expect(result).toEqual([{ pageNumber: 1, text: "A different version entirely.", wordCount: 4 }]);
  });

  it("splits on blank lines into multiple pages", () => {
    const result = reconcilePagesFromDraft(story(null, "Page one.\n\nPage two."));
    expect(result).toEqual([
      { pageNumber: 1, text: "Page one.", wordCount: 2 },
      { pageNumber: 2, text: "Page two.", wordCount: 2 },
    ]);
  });

  it("returns null when there is no draft body", () => {
    expect(reconcilePagesFromDraft(story(null, ""))).toBeNull();
  });
});

// ============================================================================
// handleTransition — approving the version actually shown in the editor
// ============================================================================

describe("POST /:storyId/transitions — approving the selected version", () => {
  it("approves the model variant (v2) when that's what's shown, not v1", async () => {
    const v1 = makeVersion({ generationId: "gen-1", title: "V1 title", story: "V1 body." });
    const v2 = makeVersion({
      generationId: "gen-2",
      title: "V2 title (GPT variant)",
      story: "V2 body from the GPT variant.",
      modelChoice: "gpt",
    });
    seedStory("s1", {
      agent1Result: v1,
      agent1Versions: [v1, v2],
      currentDraft: { title: "V1 title", body: "V1 body.", wordCount: 2, updatedAt: 1 },
      pages: [{ pageNumber: 1, text: "V1 body.", wordCount: 2 }],
    });

    const { statusCode, body } = await invokeTransition("s1", "specialist-1", {
      to: "approved",
      draft: {
        title: "V2 title (GPT variant)",
        body: "V2 body from the GPT variant.",
        wordCount: 5,
        sourceGenerationId: "gen-2",
      },
    });

    expect(statusCode).toBe(200);
    expect(body.story.status).toBe("approved");
    expect(body.story.approvedGenerationId).toBe("gen-2");
    expect(body.story.currentDraft.body).toBe("V2 body from the GPT variant.");
    expect(body.story.pages).toEqual([
      { pageNumber: 1, text: "V2 body from the GPT variant.", wordCount: 6 },
    ]);
  });

  it("approves v3 after two feedback regenerations (v1 -> v2 -> v3)", async () => {
    const v1 = makeVersion({ generationId: "gen-1", story: "V1 body." });
    const v2 = makeVersion({ generationId: "gen-2", story: "V2 body." });
    const v3 = makeVersion({ generationId: "gen-3", story: "V3 body." });
    seedStory("s1", {
      agent1Result: v3,
      agent1Versions: [v1, v2, v3],
      currentDraft: { title: "Title", body: "V3 body.", wordCount: 2, updatedAt: 1 },
      pages: [{ pageNumber: 1, text: "V3 body.", wordCount: 2 }],
    });

    const { body } = await invokeTransition("s1", "specialist-1", {
      to: "approved",
      draft: { title: "Title", body: "V3 body.", wordCount: 2, sourceGenerationId: "gen-3" },
    });

    expect(body.story.approvedGenerationId).toBe("gen-3");
    expect(body.story.pages).toEqual([{ pageNumber: 1, text: "V3 body.", wordCount: 2 }]);
  });

  it("approves v1 when the specialist switches back to it, not the latest v3", async () => {
    const v1 = makeVersion({ generationId: "gen-1", title: "V1 title", story: "V1 body." });
    const v2 = makeVersion({ generationId: "gen-2", title: "V2 title", story: "V2 body." });
    const v3 = makeVersion({ generationId: "gen-3", title: "V3 title", story: "V3 body." });
    seedStory("s1", {
      agent1Result: v3, // v3 is the "current" generation server-side (latest)
      agent1Versions: [v1, v2, v3],
      currentDraft: { title: "V3 title", body: "V3 body.", wordCount: 2, updatedAt: 1 },
      pages: [{ pageNumber: 1, text: "V3 body.", wordCount: 2 }],
    });

    const { body } = await invokeTransition("s1", "specialist-1", {
      to: "approved",
      // Specialist switched the Draft tab back to v1 and approved from there.
      draft: { title: "V1 title", body: "V1 body.", wordCount: 2, sourceGenerationId: "gen-1" },
    });

    expect(body.story.approvedGenerationId).toBe("gen-1");
    expect(body.story.currentDraft.body).toBe("V1 body.");
    expect(body.story.pages).toEqual([{ pageNumber: 1, text: "V1 body.", wordCount: 2 }]);
  });

  it("approves manual edits made on top of a selected variant", async () => {
    const v1 = makeVersion({ generationId: "gen-1", story: "V1 body." });
    const v2 = makeVersion({ generationId: "gen-2", story: "V2 original body.", modelChoice: "opus" });
    seedStory("s1", {
      agent1Result: v1,
      agent1Versions: [v1, v2],
      currentDraft: { title: "Title", body: "V1 body.", wordCount: 2, updatedAt: 1 },
      pages: [{ pageNumber: 1, text: "V1 body.", wordCount: 2 }],
    });

    const { body } = await invokeTransition("s1", "specialist-1", {
      to: "approved",
      draft: {
        title: "Title",
        body: "V2 original body, but manually edited by the specialist.",
        wordCount: 9,
        sourceGenerationId: "gen-2",
      },
    });

    expect(body.story.approvedGenerationId).toBe("gen-2");
    expect(body.story.currentDraft.body).toBe(
      "V2 original body, but manually edited by the specialist.",
    );
    expect(body.story.pages).toEqual([
      {
        pageNumber: 1,
        text: "V2 original body, but manually edited by the specialist.",
        wordCount: 9,
      },
    ]);
  });

  it("rejects a sourceGenerationId that doesn't match any known version", async () => {
    seedStory("s1");
    const { statusCode, body } = await invokeTransition("s1", "specialist-1", {
      to: "approved",
      draft: { title: "T", body: "Body.", wordCount: 1, sourceGenerationId: "gen-does-not-exist" },
    });
    expect(statusCode).toBe(400);
    expect(body.error).toBe("INVALID_INPUT");
    // Nothing should have been persisted.
    expect(storyDb["s1"]!.status).toBe("in_review");
  });

  it("rejects a malformed draft payload instead of silently falling back", async () => {
    seedStory("s1");
    const { statusCode, body } = await invokeTransition("s1", "specialist-1", {
      to: "approved",
      draft: { title: "T", body: "   " }, // empty body after trim
    });
    expect(statusCode).toBe(400);
    expect(body.error).toBe("INVALID_INPUT");
  });

  it("falls back to the persisted currentDraft when no draft payload is sent (back-compat)", async () => {
    seedStory("s1");
    const { statusCode, body } = await invokeTransition("s1", "specialist-1", { to: "approved" });
    expect(statusCode).toBe(200);
    expect(body.story.status).toBe("approved");
    expect(body.story.approvedGenerationId).toBe("gen-1");
    expect(body.story.currentDraft.body).toBe("V1 body.");
  });

  it("regression guard: joined pages text always matches the approved draft body", async () => {
    const v1 = makeVersion({ generationId: "gen-1", story: "Page one.\n\nPage two." });
    seedStory("s1", {
      agent1Result: v1,
      agent1Versions: [v1],
      currentDraft: { title: "Title", body: "Page one.\n\nPage two.", wordCount: 4, updatedAt: 1 },
      pages: [
        { pageNumber: 1, text: "Page one.", wordCount: 2 },
        { pageNumber: 2, text: "Page two.", wordCount: 2 },
      ],
    });

    const { body } = await invokeTransition("s1", "specialist-1", {
      to: "approved",
      draft: {
        title: "Title",
        body: "Page one, edited.\n\nPage two.",
        wordCount: 5,
        sourceGenerationId: "gen-1",
      },
    });

    const joined = body.story.pages
      .sort((a: StoryPage, b: StoryPage) => a.pageNumber - b.pageNumber)
      .map((p: StoryPage) => p.text)
      .join("\n\n");
    expect(joined).toBe(body.story.currentDraft.body);
  });
});
