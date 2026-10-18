import { describe, expect, it } from "vitest";
import { analysisSchema, imageSignature, soilSchema } from "../src/lib/validation";
import { weatherAdvice, weatherLabel, type Weather } from "../src/lib/weather";

describe("untrusted inputs", () => {
  it("rejects forged image extensions and accepts image signatures", () => {
    expect(imageSignature(Buffer.from('<script>alert(1)</script>'))).toBe(false);
    expect(imageSignature(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
    expect(imageSignature(Buffer.from('RIFF0000WEBP'))).toBe(true);
    expect(imageSignature(Buffer.alloc(0))).toBe(false);
  });
  it("enforces physical ranges and field ownership inputs", () => {
    const input = { field: "North", moisture: 45, ph: 6.5, temperature: 24 };
    expect(soilSchema.parse(input).notes).toBe("");
    for (const extra of [{ ph: 15 }, { moisture: -1 }, { temperature: 100 }, { field: " " }, { moisture: "45" }, { notes: "x".repeat(1001) }]) {
      expect(soilSchema.safeParse({ ...input, ...extra }).success).toBe(false);
    }
  });
  it("rejects incomplete or unsupported AI assessments", () => {
    expect(analysisSchema.safeParse({ condition: "Blight" }).success).toBe(false);
    expect(analysisSchema.safeParse({ isPlant: true, crop: "Tomato", condition: "Leaf spots", severity: "certain", summary: "Spots", actions: [], uncertainty: "None" }).success).toBe(false);
  });
});

describe("forecast guidance", () => {
  const weather: Weather = { temperature: 36, humidity: 85, rain: 1, wind: 24, code: 80, time: "2026-10-18T14:00", daily: [{ date: "2026-10-18", high: 37, low: 25, rainChance: 90, code: 80 }] };
  it("identifies rain, humidity, heat, and wind risks", () => {
    const tips = weatherAdvice(weather);
    expect(tips).toHaveLength(4);
    expect(tips.join(" ")).toContain("Rain is likely");
    expect(weatherLabel(80)).toBe("Rain showers");
    expect(weatherLabel(95)).toBe("Thunderstorms");
  });
  it("provides a routine scouting reminder for mild conditions", () => {
    const tips = weatherAdvice({ ...weather, temperature: 24, humidity: 50, wind: 5, daily: [] });
    expect(tips).toHaveLength(1);
    expect(tips[0]).toContain("Scout");
  });
});
