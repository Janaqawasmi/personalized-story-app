/** @jest-environment node */

/**
 * Unit tests for situationProposals.service — the shared logic behind both
 * the admin "Situation Suggestions" dashboard endpoints and the standalone
 * approveSituationProposal.ts CLI script.
 *
 * Covers:
 *   1. listPendingSituationProposals — only "pending" proposals are returned.
 *   2. approveSituationProposal — creates the referenceData/situations item
 *      in the shape loadSituationsByTopic/checkReferenceItem expect, updates
 *      the template, is idempotent, and rejects invalid/conflicting input.
 *   3. rejectSituationProposal — updates status only, leaves the rest of the
 *      template (including its published status) untouched, is idempotent.
 *   4. Data-consistency: an approved situation is immediately visible via the
 *      existing checkReferenceItem() read path (same mocked Firestore),
 *      proving the write format matches what the read side already expects.
 */

type DocData = Record<string, unknown>;

// ─────────────────────────────────────────────────────────────────────────────
// In-memory Firestore fixtures
// ─────────────────────────────────────────────────────────────────────────────

let templateDocs: Record<string, DocData> = {};
let situationDocs: Record<string, DocData> = {};
let situationSetCalls: Record<string, number> = {};

function applyDotUpdate(obj: DocData, update: DocData): DocData {
  const result: DocData = { ...obj };
  for (const [key, value] of Object.entries(update)) {
    if (key.includes(".")) {
      const [top, ...rest] = key.split(".");
      const nested = (result[top!] as DocData) ?? {};
      result[top!] = applyDotUpdate(nested, { [rest.join(".")]: value });
    } else {
      result[key] = value;
    }
  }
  return result;
}

function makeTemplateDocRef(id: string) {
  return {
    get: jest.fn().mockImplementation(() =>
      Promise.resolve({
        exists: id in templateDocs,
        data: () => templateDocs[id],
      }),
    ),
    update: jest.fn().mockImplementation((data: DocData) => {
      templateDocs[id] = applyDotUpdate(templateDocs[id] ?? {}, data);
      return Promise.resolve();
    }),
  };
}

function makeSituationItemRef(id: string) {
  return {
    get: jest.fn().mockImplementation(() =>
      Promise.resolve({ exists: id in situationDocs, data: () => situationDocs[id] }),
    ),
    set: jest.fn().mockImplementation((data: DocData) => {
      situationDocs[id] = data;
      situationSetCalls[id] = (situationSetCalls[id] ?? 0) + 1;
      return Promise.resolve();
    }),
  };
}

function makeStoryTemplatesCollection() {
  return {
    doc: jest.fn().mockImplementation((id: string) => makeTemplateDocRef(id)),
    where: jest.fn().mockImplementation((field: string, op: string, value: unknown) => ({
      get: jest.fn().mockImplementation(() => {
        if (field !== "situationProposal.status" || op !== "==") {
          throw new Error(`Unexpected where clause in test: ${field} ${op} ${String(value)}`);
        }
        const docs = Object.entries(templateDocs)
          .filter(([, data]) => (data.situationProposal as DocData | undefined)?.status === value)
          .map(([id, data]) => ({ id, data: () => data }));
        return Promise.resolve({ docs });
      }),
    })),
  };
}

function makeReferenceDataCollection() {
  return {
    doc: jest.fn().mockImplementation((id: string) => {
      if (id !== "situations") throw new Error(`Unexpected referenceData doc in test: ${id}`);
      return {
        collection: jest.fn().mockImplementation((sub: string) => {
          if (sub !== "items") throw new Error(`Unexpected subcollection in test: ${sub}`);
          return { doc: jest.fn().mockImplementation((itemId: string) => makeSituationItemRef(itemId)) };
        }),
      };
    }),
  };
}

const mockFirestore = {
  collection: jest.fn().mockImplementation((name: string) => {
    if (name === "story_templates") return makeStoryTemplatesCollection();
    if (name === "referenceData") return makeReferenceDataCollection();
    throw new Error(`Unexpected collection in test: ${name}`);
  }),
};

jest.mock("@/config/firebase", () => ({
  admin: { firestore: { Timestamp: { now: () => "MOCK_TIMESTAMP" } } },
  firestore: mockFirestore,
  db: mockFirestore,
}));

// ─────────────────────────────────────────────────────────────────────────────
// Subject under test
// ─────────────────────────────────────────────────────────────────────────────

import {
  approveSituationProposal,
  listPendingSituationProposals,
  rejectSituationProposal,
  SituationProposalError,
} from "../situationProposals.service";
import { checkReferenceItem } from "../referenceData.service";

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const ADMIN_UID = "admin-uid-1";

function pendingProposalTemplate(overrides: Partial<DocData> = {}): DocData {
  return {
    title: "The Brave Fox",
    slug: "the-brave-fox",
    primaryTopic: "fear_anxiety",
    status: "published",
    isActive: true,
    situationProposal: {
      status: "pending",
      labelHe: "פחד מכלבים",
      labelAr: "الخوف من الكلاب",
      labelEn: "Fear of dogs",
      reason: "No existing situation covers dog phobia specifically.",
      createdBy: "specialist-uid-1",
      createdAt: { toDate: () => new Date(1700000000000) },
    },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  templateDocs = {};
  situationDocs = {};
  situationSetCalls = {};
});

// ─────────────────────────────────────────────────────────────────────────────
// listPendingSituationProposals
// ─────────────────────────────────────────────────────────────────────────────

describe("listPendingSituationProposals", () => {
  test("returns only templates with a pending situationProposal", async () => {
    templateDocs["tmpl-pending-1"] = pendingProposalTemplate();
    templateDocs["tmpl-pending-2"] = pendingProposalTemplate({ title: "Second Story" });
    templateDocs["tmpl-approved"] = pendingProposalTemplate({
      situationProposal: { ...pendingProposalTemplate().situationProposal as DocData, status: "approved" },
    });
    templateDocs["tmpl-rejected"] = pendingProposalTemplate({
      situationProposal: { ...pendingProposalTemplate().situationProposal as DocData, status: "rejected" },
    });
    templateDocs["tmpl-no-proposal"] = { title: "No proposal here", primaryTopic: "fear_anxiety" };

    const proposals = await listPendingSituationProposals();

    const ids = proposals.map((p) => p.templateId).sort();
    expect(ids).toEqual(["tmpl-pending-1", "tmpl-pending-2"]);
  });

  test("maps every field the admin UI needs, including epoch-ms createdAt", async () => {
    templateDocs["tmpl-1"] = pendingProposalTemplate();

    const [proposal] = await listPendingSituationProposals();

    expect(proposal).toEqual({
      templateId: "tmpl-1",
      title: "The Brave Fox",
      slug: "the-brave-fox",
      primaryTopic: "fear_anxiety",
      labelHe: "פחד מכלבים",
      labelAr: "الخوف من الكلاب",
      labelEn: "Fear of dogs",
      reason: "No existing situation covers dog phobia specifically.",
      createdBy: "specialist-uid-1",
      createdAt: 1700000000000,
    });
  });

  test("returns an empty array when there are no pending proposals", async () => {
    await expect(listPendingSituationProposals()).resolves.toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// approveSituationProposal
// ─────────────────────────────────────────────────────────────────────────────

describe("approveSituationProposal", () => {
  test("creates the referenceData/situations item in the shape the read path expects", async () => {
    templateDocs["tmpl-1"] = pendingProposalTemplate();

    await approveSituationProposal("tmpl-1", "fear_of_dogs", ADMIN_UID);

    expect(situationDocs["fear_of_dogs"]).toEqual({
      label_en: "Fear of dogs",
      label_ar: "الخوف من الكلاب",
      label_he: "פחד מכלבים",
      topicKey: "fear_anxiety",
      active: true,
    });
  });

  test("sets situationId and marks the proposal approved on the template", async () => {
    templateDocs["tmpl-1"] = pendingProposalTemplate();

    await approveSituationProposal("tmpl-1", "fear_of_dogs", ADMIN_UID);

    const updated = templateDocs["tmpl-1"]!;
    expect(updated.situationId).toBe("fear_of_dogs");
    const proposal = updated.situationProposal as DocData;
    expect(proposal.status).toBe("approved");
    expect(proposal.reviewedBy).toBe(ADMIN_UID);
    expect(proposal.reviewedAt).toBe("MOCK_TIMESTAMP");
  });

  test("does not touch the template's published status or other fields", async () => {
    templateDocs["tmpl-1"] = pendingProposalTemplate();

    await approveSituationProposal("tmpl-1", "fear_of_dogs", ADMIN_UID);

    const updated = templateDocs["tmpl-1"]!;
    expect(updated.status).toBe("published");
    expect(updated.isActive).toBe(true);
    expect(updated.title).toBe("The Brave Fox");
  });

  test("is idempotent: a repeated call after success returns the existing result without duplicating the write", async () => {
    templateDocs["tmpl-1"] = pendingProposalTemplate();

    const first = await approveSituationProposal("tmpl-1", "fear_of_dogs", ADMIN_UID);
    const second = await approveSituationProposal("tmpl-1", "fear_of_dogs", ADMIN_UID);

    expect(first.alreadyApproved).toBe(false);
    expect(second.alreadyApproved).toBe(true);
    expect(second.situationId).toBe("fear_of_dogs");
    // The referenceData item must only ever be written once.
    expect(situationSetCalls["fear_of_dogs"]).toBe(1);
  });

  test("rejects a situationId that already exists (choose a different id)", async () => {
    templateDocs["tmpl-1"] = pendingProposalTemplate();
    situationDocs["fear_of_school"] = {
      label_en: "Fear of school",
      label_ar: "",
      label_he: "",
      topicKey: "fear_anxiety",
      active: true,
    };

    await expect(
      approveSituationProposal("tmpl-1", "fear_of_school", ADMIN_UID),
    ).rejects.toMatchObject({ code: "SITUATION_ID_TAKEN" });
  });

  test("rejects an invalid situationId format", async () => {
    templateDocs["tmpl-1"] = pendingProposalTemplate();

    await expect(
      approveSituationProposal("tmpl-1", "Fear Of Dogs!", ADMIN_UID),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  test("rejects an empty situationId", async () => {
    templateDocs["tmpl-1"] = pendingProposalTemplate();

    await expect(approveSituationProposal("tmpl-1", "   ", ADMIN_UID)).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
  });

  test("throws NOT_PENDING when the proposal was already rejected", async () => {
    templateDocs["tmpl-1"] = pendingProposalTemplate({
      situationProposal: { ...pendingProposalTemplate().situationProposal as DocData, status: "rejected" },
    });

    await expect(
      approveSituationProposal("tmpl-1", "fear_of_dogs", ADMIN_UID),
    ).rejects.toMatchObject({ code: "NOT_PENDING" });
  });

  test("throws NO_PROPOSAL when the template has no situationProposal at all", async () => {
    templateDocs["tmpl-1"] = { title: "No proposal", primaryTopic: "fear_anxiety" };

    await expect(
      approveSituationProposal("tmpl-1", "fear_of_dogs", ADMIN_UID),
    ).rejects.toMatchObject({ code: "NO_PROPOSAL" });
  });

  test("throws TEMPLATE_NOT_FOUND for an unknown templateId", async () => {
    await expect(
      approveSituationProposal("does-not-exist", "fear_of_dogs", ADMIN_UID),
    ).rejects.toMatchObject({ code: "TEMPLATE_NOT_FOUND" });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// rejectSituationProposal
// ─────────────────────────────────────────────────────────────────────────────

describe("rejectSituationProposal", () => {
  test("marks the proposal rejected and records reviewer metadata", async () => {
    templateDocs["tmpl-1"] = pendingProposalTemplate();

    await rejectSituationProposal("tmpl-1", ADMIN_UID, "Too narrow — covered by fear_of_animals.");

    const proposal = templateDocs["tmpl-1"]!.situationProposal as DocData;
    expect(proposal.status).toBe("rejected");
    expect(proposal.reviewedBy).toBe(ADMIN_UID);
    expect(proposal.reviewedAt).toBe("MOCK_TIMESTAMP");
    expect(proposal.reviewNote).toBe("Too narrow — covered by fear_of_animals.");
  });

  test("does not touch situationId, published status, or create a referenceData item", async () => {
    templateDocs["tmpl-1"] = pendingProposalTemplate();

    await rejectSituationProposal("tmpl-1", ADMIN_UID);

    const updated = templateDocs["tmpl-1"]!;
    expect(updated.situationId).toBeUndefined();
    expect(updated.status).toBe("published");
    expect(updated.isActive).toBe(true);
    expect(Object.keys(situationDocs)).toHaveLength(0);
  });

  test("rejection without a note does not write reviewNote", async () => {
    templateDocs["tmpl-1"] = pendingProposalTemplate();

    await rejectSituationProposal("tmpl-1", ADMIN_UID);

    const proposal = templateDocs["tmpl-1"]!.situationProposal as DocData;
    expect(proposal.reviewNote).toBeUndefined();
  });

  test("is idempotent: a repeated call after success is a no-op", async () => {
    templateDocs["tmpl-1"] = pendingProposalTemplate();

    const first = await rejectSituationProposal("tmpl-1", ADMIN_UID);
    const second = await rejectSituationProposal("tmpl-1", ADMIN_UID);

    expect(first.alreadyRejected).toBe(false);
    expect(second.alreadyRejected).toBe(true);
  });

  test("throws NOT_PENDING when the proposal was already approved", async () => {
    templateDocs["tmpl-1"] = pendingProposalTemplate({
      situationProposal: { ...pendingProposalTemplate().situationProposal as DocData, status: "approved" },
    });

    await expect(rejectSituationProposal("tmpl-1", ADMIN_UID)).rejects.toMatchObject({
      code: "NOT_PENDING",
    });
  });

  test("throws TEMPLATE_NOT_FOUND for an unknown templateId", async () => {
    await expect(rejectSituationProposal("does-not-exist", ADMIN_UID)).rejects.toMatchObject({
      code: "TEMPLATE_NOT_FOUND",
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Data consistency: approved situations are immediately usable by the
// existing read path (loadSituationsByTopic / checkReferenceItem), proving
// the write format this service produces matches what the reader expects.
// ─────────────────────────────────────────────────────────────────────────────

describe("data consistency with the existing situation read path", () => {
  test("checkReferenceItem sees an approved situation as existing + active", async () => {
    templateDocs["tmpl-1"] = pendingProposalTemplate();

    await approveSituationProposal("tmpl-1", "fear_of_dogs", ADMIN_UID);

    await expect(checkReferenceItem("situations", "fear_of_dogs")).resolves.toEqual({
      exists: true,
      active: true,
    });
  });

  test("checkReferenceItem does not see a rejected proposal's would-be id as an existing situation", async () => {
    templateDocs["tmpl-1"] = pendingProposalTemplate();

    await rejectSituationProposal("tmpl-1", ADMIN_UID);

    await expect(checkReferenceItem("situations", "fear_of_dogs")).resolves.toEqual({
      exists: false,
      active: false,
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SituationProposalError sanity
// ─────────────────────────────────────────────────────────────────────────────

describe("SituationProposalError", () => {
  test("carries the error code and a readable message", () => {
    const err = new SituationProposalError("INVALID_INPUT", "situationId is required.");
    expect(err.code).toBe("INVALID_INPUT");
    expect(err.message).toBe("situationId is required.");
    expect(err.name).toBe("SituationProposalError");
  });
});
