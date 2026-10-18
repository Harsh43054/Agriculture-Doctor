import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as getWeather } from "../src/app/api/weather/route";
import { GET as getScans, POST as postScans } from "../src/app/api/scans/route";
import { POST as postSoil } from "../src/app/api/soil/route";
import { GET as health } from "../src/app/api/health/route";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("API boundary", () => {
  it("rejects missing and out-of-range weather coordinates without calling the provider", async () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    for (const url of ["http://localhost/api/weather", "http://localhost/api/weather?lat=100&lon=0", "http://localhost/api/weather?city=x"]) {
      expect((await getWeather(new Request(url))).status).toBe(400);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("uses a fixed provider host and encodes location input", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [] })));
    vi.stubGlobal("fetch", fetchMock);
    const response = await getWeather(new Request("http://localhost/api/weather?city=Delhi%26count%3D100"));
    expect(response.status).toBe(200);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.host).toBe("geocoding-api.open-meteo.com");
    expect(url.searchParams.get("name")).toBe("Delhi&count=100");
    expect(url.searchParams.get("count")).toBe("5");
  });
  it("requires authentication before scans or soil writes", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-test-key");
    expect((await getScans(new Request("http://localhost/api/scans"))).status).toBe(401);
    expect((await postScans(new Request("http://localhost/api/scans", { method: "POST" }))).status).toBe(401);
    expect((await postSoil(new Request("http://localhost/api/soil", { method: "POST" }))).status).toBe(401);
  });
  it("returns a useful setup error and never reveals server secrets", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", ""); vi.stubEnv("GEMINI_API_KEY", "secret-never-echo");
    expect((await getScans(new Request("http://localhost/api/scans"))).status).toBe(503);
    const response = await health(); const body = await response.text();
    expect(body).not.toContain("secret-never-echo");
    expect(JSON.parse(body).services.supabaseConfigured).toBe(false);
  });
});
