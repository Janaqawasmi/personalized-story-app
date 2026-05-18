/** @jest-environment node */

import type { DocumentReference } from "firebase-admin/firestore";

const mockRunTransaction = jest.fn();

jest.mock("@/config/firebase", () => ({
  firestore: {
    runTransaction: (fn: (tx: unknown) => Promise<boolean>) => mockRunTransaction(fn),
  },
}));

import { claimJob } from "../claim";

describe("claimJob", () => {
  beforeEach(() => {
    mockRunTransaction.mockReset();
  });

  test("pending job with cancelRequested is marked cancelled and returns false", async () => {
    const txUpdate = jest.fn();
    mockRunTransaction.mockImplementation(async (fn: (tx: { get: jest.Mock; update: jest.Mock }) => Promise<boolean>) => {
      const tx = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            status: "pending",
            cancelRequested: true,
          }),
        }),
        update: txUpdate,
      };
      return fn(tx);
    });
    const jobRef = { id: "job1" } as unknown as DocumentReference;
    const ok = await claimJob(jobRef);
    expect(ok).toBe(false);
    expect(txUpdate).toHaveBeenCalledWith(
      jobRef,
      expect.objectContaining({
        status: "cancelled",
      }),
    );
  });
});
