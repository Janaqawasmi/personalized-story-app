import * as fs from "fs";
import { callLLM } from "@/agent1/shared/llm-client";

/** Stable ref for the SDK `messages.create` mock (survives `clearMocks`). */
var mockMessagesCreate: jest.Mock;

jest.mock("@anthropic-ai/sdk", () => {
  mockMessagesCreate = jest.fn();
  return {
    Anthropic: jest.fn().mockImplementation(() => ({
      messages: { create: mockMessagesCreate },
    })),
  };
});

jest.mock("fs", () => {
  const actual = jest.requireActual<typeof import("fs")>("fs");
  return {
    ...actual,
    appendFileSync: jest.fn(() => {}),
    mkdirSync: jest.fn(() => undefined),
  };
});

const appendFileSyncMock = fs.appendFileSync as unknown as jest.Mock;
const mkdirSyncMock = fs.mkdirSync as unknown as jest.Mock;

function getMessagesCreateMock(): jest.Mock {
  return mockMessagesCreate;
}

const baseInput = {
  model: "claude-test",
  prompt: "test prompt",
  maxTokens: 1024,
  step: "step1_architect" as const,
  attempt: 1,
};

describe("callLLM", () => {
  beforeEach(() => {
    getMessagesCreateMock().mockReset();
    appendFileSyncMock.mockReset();
    mkdirSyncMock.mockReset();
    appendFileSyncMock.mockImplementation(() => {});
    mkdirSyncMock.mockImplementation(() => undefined);
  });

  describe("successful call", () => {
    it("returns text and tokens, logs success metadata", async () => {
      const create = getMessagesCreateMock();
      create.mockResolvedValue({
        content: [{ type: "text", text: "Hello world" }],
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      const out = await callLLM(baseInput);

      expect(out.text).toBe("Hello world");
      expect(out.inputTokens).toBe(100);
      expect(out.outputTokens).toBe(50);
      expect(out.latencyMs).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(out.latencyMs)).toBe(true);

      expect(appendFileSyncMock).toHaveBeenCalledTimes(1);
      const logPath = appendFileSyncMock.mock.calls[0]![0] as string;
      expect(logPath).toMatch(/agent1-calls\.jsonl$/);
      const line = appendFileSyncMock.mock.calls[0]![1] as string;
      expect(JSON.parse(line).success).toBe(true);
    });
  });

  describe("retry on 429", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("waits 2s and retries once, logging failure then success", async () => {
      const create = getMessagesCreateMock();
      create
        .mockRejectedValueOnce(
          Object.assign(new Error("rate limit"), { status: 429 }),
        )
        .mockResolvedValueOnce({
          content: [{ type: "text", text: "recovered" }],
          usage: { input_tokens: 1, output_tokens: 2 },
        });

      const p = callLLM(baseInput);
      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(2000);
      await expect(p).resolves.toMatchObject({
        text: "recovered",
        inputTokens: 1,
        outputTokens: 2,
      });

      expect(create).toHaveBeenCalledTimes(2);
      expect(appendFileSyncMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("retry on 500", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("waits 2s and retries once", async () => {
      const create = getMessagesCreateMock();
      create
        .mockRejectedValueOnce(
          Object.assign(new Error("server error"), { status: 500 }),
        )
        .mockResolvedValueOnce({
          content: [{ type: "text", text: "ok" }],
          usage: { input_tokens: 3, output_tokens: 4 },
        });

      const p = callLLM(baseInput);
      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(2000);
      await expect(p).resolves.toMatchObject({ text: "ok" });

      expect(create).toHaveBeenCalledTimes(2);
      expect(appendFileSyncMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("no retry on 400", () => {
    it("rejects without a second API call", async () => {
      const create = getMessagesCreateMock();
      create.mockRejectedValue(
        Object.assign(new Error("bad request"), { status: 400 }),
      );

      await expect(callLLM(baseInput)).rejects.toThrow();
      expect(create).toHaveBeenCalledTimes(1);
    });
  });

  describe("no retry on second attempt", () => {
    it("does not retry when attempt is 2", async () => {
      const create = getMessagesCreateMock();
      create.mockRejectedValue(
        Object.assign(new Error("rate limit"), { status: 429 }),
      );

      await expect(
        callLLM({ ...baseInput, attempt: 2 }),
      ).rejects.toThrow();

      expect(create).toHaveBeenCalledTimes(1);
    });
  });

  describe("no text block in response", () => {
    it("throws an error mentioning no text block", async () => {
      const create = getMessagesCreateMock();
      create.mockResolvedValue({
        content: [],
        usage: { input_tokens: 10, output_tokens: 0 },
      });

      await expect(callLLM(baseInput)).rejects.toThrow(/no text block/i);
    });
  });

  describe("logging failure does not crash", () => {
    it("still resolves when appendFileSync throws", async () => {
      const create = getMessagesCreateMock();
      create.mockResolvedValue({
        content: [{ type: "text", text: "fine" }],
        usage: { input_tokens: 5, output_tokens: 5 },
      });

      appendFileSyncMock.mockImplementation(() => {
        throw new Error("disk full");
      });
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      await expect(
        callLLM(baseInput),
      ).resolves.toMatchObject({ text: "fine" });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("log entry shape", () => {
    it("writes a complete JSON line for successful calls", async () => {
      const create = getMessagesCreateMock();
      create.mockResolvedValue({
        content: [{ type: "text", text: "x" }],
        usage: { input_tokens: 9, output_tokens: 8 },
      });

      await callLLM({
        ...baseInput,
        step: "step3_post_validation",
        model: "claude-log",
      });

      const line = appendFileSyncMock.mock.calls[0]![1] as string;
      const parsed = JSON.parse(line) as Record<string, unknown>;

      expect(parsed).toMatchObject({
        step: "step3_post_validation",
        model: "claude-log",
        attempt: 1,
        inputTokens: 9,
        outputTokens: 8,
        success: true,
      });
      expect(typeof parsed.timestamp).toBe("string");
      expect(parsed.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/u,
      );
      expect(parsed.errorMessage).toBeUndefined();
      expect(typeof parsed.latencyMs).toBe("number");
    });
  });
});
