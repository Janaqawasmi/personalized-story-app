/** @jest-environment node */

/**
 * Regression tests for GET /api/caregiver/stories/:storyId.
 *
 * Root cause of "Failed to retrieve story" (cart/payment flow bug): this
 * handler looked up the owning purchase with
 *   db.collection(`caregivers/${caregiverUid}/purchases`).where("purchaseId", "==", id)
 * — a COLLECTION-scope query. firestore.indexes.json only declared a
 * COLLECTION_GROUP-scope index override for `purchaseId` on the `purchases`
 * collection, which (per Firestore's field-override semantics) *disables*
 * the default COLLECTION-scope single-field index for that field. Every
 * purchased-story read — personalized or "fixed" (non-personalized) —
 * therefore failed with a FAILED_PRECONDITION index error, caught by the
 * generic try/catch and surfaced as a useless "Failed to retrieve story".
 *
 * The fix switches the handler to the same collectionGroup("purchases")
 * query shape already used (and already indexed) in
 * fullStoryGeneration.service.ts, adds an explicit ownership check (since a
 * collectionGroup query spans every caregiver), and replaces the generic
 * catch-all message with one that includes the underlying error / missing
 * field so failures are diagnosable instead of opaque.
 */

type DocData = Record<string, unknown>;

function makeStoryDoc(overrides: Partial<DocData> = {}) {
  const data: DocData = {
    caregiverUid: "caregiver-1",
    isAccessible: true,
    purchaseId: "purchase-1",
    templateId: "template-1",
    templateTitle: "A Story",
    language: "he",
    generationStatus: "completed",
    coverImageUrl: "https://example.com/cover.jpg",
    pages: [],
    ...overrides,
  };
  return { exists: true, id: "story-1", data: () => data };
}

let storyDocFixture = makeStoryDoc();
let purchaseDocsFixture: Array<{ id: string; data: () => DocData }> = [
  { id: "auto-id-1", data: () => ({ purchaseId: "purchase-1", caregiverUid: "caregiver-1", status: "completed" }) },
];
let collectionGroupWhereError: Error | null = null;

jest.mock("../../../config/firebase", () => ({
  admin: { firestore: { Timestamp: { now: () => "MOCK_TIMESTAMP" } } },
  db: {
    collection: jest.fn().mockImplementation((path: string) => {
      if (path === "personalizedStories") {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockImplementation(() => Promise.resolve(storyDocFixture)),
          }),
        };
      }
      throw new Error(`Unexpected collection path in test: ${path}`);
    }),
    collectionGroup: jest.fn().mockImplementation((name: string) => {
      if (name !== "purchases") throw new Error(`Unexpected collectionGroup: ${name}`);
      return {
        where: jest.fn().mockImplementation(() => {
          if (collectionGroupWhereError) throw collectionGroupWhereError;
          return {
            limit: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({
                empty: purchaseDocsFixture.length === 0,
                docs: purchaseDocsFixture,
              }),
            }),
          };
        }),
      };
    }),
  },
}));

jest.mock("../../../middleware/caregiverAuth.middleware", () => ({
  requireCaregiverAuth: (req: any, _res: any, next: any) => {
    req.caregiverUser = req.caregiverUser ?? { uid: "caregiver-1" };
    next();
  },
}));

import storiesRouter from "../stories.router";

function findHandler(method: string, path: string) {
  const layer = (storiesRouter as any).stack.find(
    (l: any) => l.route && l.route.path === path && l.route.methods[method]
  );
  if (!layer) throw new Error(`No route found for ${method} ${path}`);
  const handlers = layer.route.stack.map((s: any) => s.handle);
  return handlers[handlers.length - 1];
}

async function invoke(storyId = "story-1", caregiverUid = "caregiver-1") {
  const handler = findHandler("get", "/:storyId");
  const req: any = { params: { storyId }, caregiverUser: { uid: caregiverUid } };
  let statusCode = 0;
  let body: any = null;
  const res: any = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: any) {
      body = payload;
      return this;
    },
  };
  await handler(req, res);
  return { statusCode, body };
}

beforeEach(() => {
  storyDocFixture = makeStoryDoc();
  purchaseDocsFixture = [
    { id: "auto-id-1", data: () => ({ purchaseId: "purchase-1", caregiverUid: "caregiver-1", status: "completed" }) },
  ];
  collectionGroupWhereError = null;
});

describe("GET /api/caregiver/stories/:storyId", () => {
  it("returns the story for a valid personalized/fixed purchase (collectionGroup lookup)", async () => {
    const { statusCode, body } = await invoke();
    expect(statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.storyId).toBe("story-1");
  });

  it("works identically for a fixed (non-personalized) story — same code path, no childFirstName", async () => {
    storyDocFixture = makeStoryDoc({ childFirstName: "" });
    const { statusCode, body } = await invoke();
    expect(statusCode).toBe(200);
    expect(body.success).toBe(true);
  });

  it("returns a diagnosable 500 when the story is missing purchaseId, instead of crashing", async () => {
    storyDocFixture = makeStoryDoc({ purchaseId: undefined });
    const { statusCode, body } = await invoke();
    expect(statusCode).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/purchaseId/i);
  });

  it("returns 403 when the matching purchase belongs to a different caregiver", async () => {
    purchaseDocsFixture = [
      { id: "auto-id-1", data: () => ({ purchaseId: "purchase-1", caregiverUid: "someone-else", status: "completed" }) },
    ];
    const { statusCode, body } = await invoke();
    expect(statusCode).toBe(403);
    expect(body.error).toBe("Access denied");
  });

  it("returns 403 with the actual status when the purchase is not completed/paid", async () => {
    purchaseDocsFixture = [
      { id: "auto-id-1", data: () => ({ purchaseId: "purchase-1", caregiverUid: "caregiver-1", status: "pending" }) },
    ];
    const { statusCode, body } = await invoke();
    expect(statusCode).toBe(403);
    expect(body.error).toMatch(/pending/);
  });

  it("returns 403 when no purchase matches the purchaseId", async () => {
    purchaseDocsFixture = [];
    const { statusCode, body } = await invoke();
    expect(statusCode).toBe(403);
    expect(body.error).toMatch(/purchase-1/);
  });

  it("includes the underlying error message instead of a generic string on unexpected failure", async () => {
    collectionGroupWhereError = new Error("9 FAILED_PRECONDITION: The query requires an index.");
    const { statusCode, body } = await invoke();
    expect(statusCode).toBe(500);
    expect(body.error).toMatch(/FAILED_PRECONDITION/);
  });

  it("returns 404 when the story document does not exist", async () => {
    storyDocFixture = { exists: false, id: "missing", data: () => ({}) } as any;
    const { statusCode, body } = await invoke("missing");
    expect(statusCode).toBe(404);
    expect(body.error).toBe("Story not found");
  });

  it("returns 403 when the story belongs to a different caregiver", async () => {
    storyDocFixture = makeStoryDoc({ caregiverUid: "someone-else" });
    const { statusCode, body } = await invoke();
    expect(statusCode).toBe(403);
    expect(body.error).toBe("Access denied");
  });

  it("returns 403 when the story is not yet accessible", async () => {
    storyDocFixture = makeStoryDoc({ isAccessible: false });
    const { statusCode, body } = await invoke();
    expect(statusCode).toBe(403);
    expect(body.success).toBe(false);
  });
});
