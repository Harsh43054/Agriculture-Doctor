import { afterEach, describe, expect, it, vi } from "vitest";
import { analyze } from "../src/lib/ai";

const result = {
  isPlant: true,
  crop: "Tomato",
  condition: "Possible leaf spotting",
  severity: "uncertain",
  summary: "Visible spots warrant closer inspection.",
  actions: ["Inspect both sides of the leaf."],
  uncertainty: "A single photograph cannot confirm the cause.",
};
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("AI provider boundary", () => {
  it("sends a JPEG to the gateway and validates its structured result", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("AI_GATEWAY_API_KEY", "test-server-secret");
    const request = vi
      .fn()
      .mockResolvedValue(
        Response.json({
          choices: [{ message: { content: JSON.stringify(result) } }],
        }),
      );
    vi.stubGlobal("fetch", request);
    expect(await analyze(Buffer.from("test-image"), "Tomato")).toEqual(result);
    expect(request.mock.calls[0][0]).toBe(
      "https://ai-gateway.vercel.sh/v1/chat/completions",
    );
    const body = JSON.parse(request.mock.calls[0][1].body);
    expect(body.messages[1].content[1].image_url.url).toMatch(
      /^data:image\/jpeg;base64,/,
    );
    expect(body.response_format.type).toBe("json_schema");
    expect(JSON.stringify(body)).not.toContain("test-server-secret");
  });
  it("handles empty or malformed provider output without fabricating a diagnosis", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ candidates: [] })),
    );
    await expect(analyze(Buffer.from("image"), "")).rejects.toMatchObject({
      status: 502,
    });
  });
  it("reports provider quota failures without exposing provider bodies", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("private-provider-error", { status: 429 }),
        ),
    );
    await expect(analyze(Buffer.from("image"), "")).rejects.toMatchObject({
      status: 429,
    });
  });
});
