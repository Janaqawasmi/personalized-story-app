import { SeedreamProvider } from "@/providers/seedream.provider";

// ---------------------------------------------------------------------------
// fetch mock
// ---------------------------------------------------------------------------

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function makeOkResponse(body: unknown, contentType = "application/json"): Response {
  return {
    ok: true,
    status: 200,
    headers: { get: (h: string) => (h === "content-type" ? contentType : null) },
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
    arrayBuffer: () =>
      Promise.resolve(Buffer.from("fake-image").buffer as ArrayBuffer),
  } as unknown as Response;
}

function makeErrorResponse(status: number, body: string): Response {
  return {
    ok: false,
    status,
    headers: { get: () => null },
    text: () => Promise.resolve(body),
  } as unknown as Response;
}

function makeSeedreamB64Response(b64 = "ZmFrZQ=="): object {
  return { data: [{ b64_json: b64 }] };
}

function makeSeedreamUrlResponse(url = "https://example.com/img.jpeg"): object {
  return { data: [{ url }] };
}

function makeSeedreamRevisedPromptResponse(): object {
  return { data: [{ b64_json: "ZmFrZQ==", revised_prompt: "enhanced prompt text" }] };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SeedreamProvider — construction", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV, ARK_API_KEY: "test-key" };
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  test("constructs with explicit apiKey", () => {
    const p = new SeedreamProvider({ apiKey: "my-key" });
    expect(p.providerId).toBe("seedream");
    expect(p.modelId).toBe("seedream-4-0-250828");
  });

  test("constructs from ARK_API_KEY env var", () => {
    const p = new SeedreamProvider();
    expect(p.providerId).toBe("seedream");
  });

  test("throws when no API key available", () => {
    delete process.env.ARK_API_KEY;
    expect(() => new SeedreamProvider({ apiKey: "" })).toThrow("ARK_API_KEY is not set");
  });

  test("respects custom modelId", () => {
    const p = new SeedreamProvider({ apiKey: "k", modelId: "seedream-4-5-251128" });
    expect(p.modelId).toBe("seedream-4-5-251128");
  });
});

describe("SeedreamProvider — generateImage", () => {
  let provider: SeedreamProvider;

  beforeEach(() => {
    mockFetch.mockReset();
    provider = new SeedreamProvider({ apiKey: "test-key" });
  });

  test("returns ImageGenerationResult on b64_json response", async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse(makeSeedreamB64Response("ZmFrZQ==")));
    const result = await provider.generateImage({ textPrompt: "A rabbit in moonlight." });
    expect(result.providerId).toBe("seedream");
    expect(result.modelId).toBe("seedream-4-0-250828");
    expect(Buffer.isBuffer(result.imageBuffer)).toBe(true);
    expect(result.imageBuffer.length).toBeGreaterThan(0);
    expect(result.mimeType).toBe("image/jpeg");
    expect(typeof result.latencyMs).toBe("number");
  });

  test("downloads image from URL when b64_json absent", async () => {
    mockFetch
      .mockResolvedValueOnce(makeOkResponse(makeSeedreamUrlResponse()))
      .mockResolvedValueOnce(makeOkResponse({}, "image/jpeg"));
    const result = await provider.generateImage({ textPrompt: "A rabbit." });
    expect(Buffer.isBuffer(result.imageBuffer)).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  test("throws on non-2xx response", async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse(429, "rate limited"));
    await expect(
      provider.generateImage({ textPrompt: "A rabbit." }),
    ).rejects.toThrow("HTTP 429");
  });

  test("throws when response data array is empty", async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse({ data: [] }));
    await expect(
      provider.generateImage({ textPrompt: "A rabbit." }),
    ).rejects.toThrow("no image data");
  });

  test("throws when item has neither b64_json nor url", async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse({ data: [{}] }));
    await expect(
      provider.generateImage({ textPrompt: "A rabbit." }),
    ).rejects.toThrow("neither b64_json nor url");
  });

  test("sends seed in request body when provided", async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse(makeSeedreamB64Response()));
    await provider.generateImage({ textPrompt: "A rabbit.", seed: 42 });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.seed).toBe(42);
  });

  test("omits seed when not provided", async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse(makeSeedreamB64Response()));
    await provider.generateImage({ textPrompt: "A rabbit." });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.seed).toBeUndefined();
  });

  // The `referenceImage` parameter remains on the provider for the
  // caregiver-side personalization flow (child photo). The v2 specialist
  // pipeline (docs/illustration/spec.md) does not use it.

  test("sends referenceImage as URL in the image field when provided", async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse(makeSeedreamB64Response()));
    const refUrl = "https://storage.googleapis.com/bucket/child-photo.jpeg";
    await provider.generateImage({ textPrompt: "A child.", referenceImage: refUrl });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.image).toBe(refUrl);
  });

  test("omits image field when referenceImage is not provided", async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse(makeSeedreamB64Response()));
    await provider.generateImage({ textPrompt: "A scene." });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.image).toBeUndefined();
  });

  test("sends Authorization header with Bearer token", async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse(makeSeedreamB64Response()));
    await provider.generateImage({ textPrompt: "A rabbit." });
    const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer test-key");
  });

  test("uses custom apiUrl when provided", async () => {
    const custom = new SeedreamProvider({
      apiKey: "k",
      apiUrl: "https://custom.example.com/v3",
    });
    mockFetch.mockResolvedValueOnce(makeOkResponse(makeSeedreamB64Response()));
    await custom.generateImage({ textPrompt: "A rabbit." });
    expect(mockFetch.mock.calls[0][0]).toBe(
      "https://custom.example.com/v3/images/generations",
    );
  });

  test("always sends watermark: false", async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse(makeSeedreamB64Response()));
    await provider.generateImage({ textPrompt: "A rabbit." });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.watermark).toBe(false);
  });

  test("always sends response_format: b64_json", async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse(makeSeedreamB64Response()));
    await provider.generateImage({ textPrompt: "A rabbit." });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.response_format).toBe("b64_json");
  });

  test("sends default guidance_scale of 7.5", async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse(makeSeedreamB64Response()));
    await provider.generateImage({ textPrompt: "A rabbit." });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.guidance_scale).toBe(7.5);
  });

  // v2: additionalParams is removed from the ImageGenerationProvider contract.
  // Per-call guidance_scale override is dropped; the default (7.5) applies.

  test("sends size: 2K", async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse(makeSeedreamB64Response()));
    await provider.generateImage({ textPrompt: "A rabbit." });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.size).toBe("2K");
  });

  test("does not send image_format field", async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse(makeSeedreamB64Response()));
    await provider.generateImage({ textPrompt: "A rabbit." });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.image_format).toBeUndefined();
  });

  test("uses default base URL pointing to BytePlus ModelArk", async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse(makeSeedreamB64Response()));
    await provider.generateImage({ textPrompt: "A rabbit." });
    expect(mockFetch.mock.calls[0][0]).toBe(
      "https://ark.ap-southeast.bytepluses.com/api/v3/images/generations",
    );
  });

  test("captures revised_prompt in providerMetadata", async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse(makeSeedreamRevisedPromptResponse()));
    const result = await provider.generateImage({ textPrompt: "A rabbit." });
    expect(result.providerMetadata?.revised_prompt).toBe("enhanced prompt text");
  });

  test("providerMetadata is undefined when no revised_prompt returned", async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse(makeSeedreamB64Response()));
    const result = await provider.generateImage({ textPrompt: "A rabbit." });
    expect(result.providerMetadata).toBeUndefined();
  });

  test("always returns mimeType image/jpeg", async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse(makeSeedreamB64Response()));
    const result = await provider.generateImage({ textPrompt: "A rabbit." });
    expect(result.mimeType).toBe("image/jpeg");
  });
});
