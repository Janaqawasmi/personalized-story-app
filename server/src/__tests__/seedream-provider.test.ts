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
  return { data: [{ b64_json: b64 }], model: "seedream-3" };
}

function makeSeedreamUrlResponse(url = "https://example.com/img.png"): object {
  return { data: [{ url }], model: "seedream-3" };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SeedreamProvider — construction", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV, SEEDREAM_API_KEY: "test-key" };
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  test("constructs with explicit apiKey", () => {
    const p = new SeedreamProvider({ apiKey: "my-key" });
    expect(p.providerId).toBe("seedream");
    expect(p.modelId).toBe("seedream-3");
  });

  test("constructs from SEEDREAM_API_KEY env var", () => {
    const p = new SeedreamProvider();
    expect(p.providerId).toBe("seedream");
  });

  test("throws when no API key available", () => {
    delete process.env.SEEDREAM_API_KEY;
    expect(() => new SeedreamProvider({ apiKey: "" })).toThrow(
      "SEEDREAM_API_KEY is not set",
    );
  });

  test("respects custom modelId", () => {
    const p = new SeedreamProvider({ apiKey: "k", modelId: "seedream-turbo" });
    expect(p.modelId).toBe("seedream-turbo");
  });
});

describe("SeedreamProvider — generateImage", () => {
  let provider: SeedreamProvider;

  beforeEach(() => {
    mockFetch.mockReset();
    provider = new SeedreamProvider({ apiKey: "test-key" });
  });

  test("returns ImageGenerationResult on b64_json response", async () => {
    mockFetch.mockResolvedValueOnce(
      makeOkResponse(makeSeedreamB64Response("ZmFrZQ==")),
    );
    const result = await provider.generateImage({ textPrompt: "A rabbit in moonlight." });
    expect(result.providerId).toBe("seedream");
    expect(result.modelId).toBe("seedream-3");
    expect(Buffer.isBuffer(result.imageBuffer)).toBe(true);
    expect(result.imageBuffer.length).toBeGreaterThan(0);
    expect(result.mimeType).toBe("image/png");
    expect(typeof result.latencyMs).toBe("number");
  });

  test("downloads image from URL when b64_json absent", async () => {
    mockFetch
      .mockResolvedValueOnce(makeOkResponse(makeSeedreamUrlResponse()))
      .mockResolvedValueOnce(makeOkResponse({}, "image/png"));

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
    mockFetch.mockResolvedValueOnce(
      makeOkResponse({ data: [], model: "seedream-3" }),
    );
    await expect(
      provider.generateImage({ textPrompt: "A rabbit." }),
    ).rejects.toThrow("no image data");
  });

  test("throws when item has neither b64_json nor url", async () => {
    mockFetch.mockResolvedValueOnce(
      makeOkResponse({ data: [{}], model: "seedream-3" }),
    );
    await expect(
      provider.generateImage({ textPrompt: "A rabbit." }),
    ).rejects.toThrow("neither b64_json nor url");
  });

  test("sends seed in request body when provided", async () => {
    mockFetch.mockResolvedValueOnce(
      makeOkResponse(makeSeedreamB64Response()),
    );
    await provider.generateImage({ textPrompt: "A rabbit.", seed: 42 });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.seed).toBe(42);
  });

  test("omits seed when not provided", async () => {
    mockFetch.mockResolvedValueOnce(
      makeOkResponse(makeSeedreamB64Response()),
    );
    await provider.generateImage({ textPrompt: "A rabbit." });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.seed).toBeUndefined();
  });

  test("sends reference_image as data URI when Buffer provided", async () => {
    mockFetch.mockResolvedValueOnce(
      makeOkResponse(makeSeedreamB64Response()),
    );
    const refBuf = Buffer.from("fake-ref-image");
    await provider.generateImage({
      textPrompt: "Page 2.",
      referenceImage: refBuf,
      referenceImageMediaType: "image/png",
    });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.reference_image).toMatch(/^data:image\/png;base64,/);
  });

  test("omits reference_image when not provided (page 1 case)", async () => {
    mockFetch.mockResolvedValueOnce(
      makeOkResponse(makeSeedreamB64Response()),
    );
    await provider.generateImage({ textPrompt: "Page 1." });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.reference_image).toBeUndefined();
  });

  test("passes string reference image through unchanged", async () => {
    mockFetch.mockResolvedValueOnce(
      makeOkResponse(makeSeedreamB64Response()),
    );
    const url = "https://storage.example.com/page1.png";
    await provider.generateImage({
      textPrompt: "Page 2.",
      referenceImage: url,
    });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.reference_image).toBe(url);
  });

  test("sends Authorization header with Bearer token", async () => {
    mockFetch.mockResolvedValueOnce(
      makeOkResponse(makeSeedreamB64Response()),
    );
    await provider.generateImage({ textPrompt: "A rabbit." });
    const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer test-key");
  });

  test("uses custom apiUrl when provided", async () => {
    const custom = new SeedreamProvider({
      apiKey: "k",
      apiUrl: "https://custom.example.com/v1",
    });
    mockFetch.mockResolvedValueOnce(
      makeOkResponse(makeSeedreamB64Response()),
    );
    await custom.generateImage({ textPrompt: "A rabbit." });
    expect(mockFetch.mock.calls[0][0]).toBe(
      "https://custom.example.com/v1/images/generations",
    );
  });

  test("default size is 1024x1024", async () => {
    mockFetch.mockResolvedValueOnce(
      makeOkResponse(makeSeedreamB64Response()),
    );
    await provider.generateImage({ textPrompt: "A rabbit." });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.size).toBe("1024x1024");
  });

  test("respects custom outputWidth and outputHeight", async () => {
    mockFetch.mockResolvedValueOnce(
      makeOkResponse(makeSeedreamB64Response()),
    );
    await provider.generateImage({
      textPrompt: "A rabbit.",
      outputWidth: 768,
      outputHeight: 512,
    });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.size).toBe("768x512");
  });
});
