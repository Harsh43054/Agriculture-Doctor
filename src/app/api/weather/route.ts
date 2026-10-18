import { NextResponse } from "next/server";
import { fail, HttpError } from "@/lib/server";
import { z } from "zod";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    if (params.has("city")) {
      const city = z.string().trim().min(2).max(100).parse(params.get("city"));
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=5&language=en&format=json`,
        { next: { revalidate: 86400 }, signal: AbortSignal.timeout(10000) },
      );
      if (!response.ok)
        throw new HttpError(502, "Location search is unavailable.");
      const data = await response.json();
      return NextResponse.json({
        locations: (data.results || []).map(
          (r: {
            id: number;
            name: string;
            admin1?: string;
            country: string;
            latitude: number;
            longitude: number;
          }) => ({
            id: r.id,
            name: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
            latitude: r.latitude,
            longitude: r.longitude,
          }),
        ),
      });
    }
    const { lat, lon } = z
      .object({
        lat: z.coerce.number().min(-90).max(90),
        lon: z.coerce.number().min(-180).max(180),
      })
      .parse({
        lat: params.get("lat") ?? undefined,
        lon: params.get("lon") ?? undefined,
      });
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=5&timezone=auto`;
    const response = await fetch(url, {
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok)
      throw new HttpError(502, "Weather service is temporarily unavailable.");
    const data = await response.json();
    if (!data.current || !data.daily)
      throw new HttpError(
        502,
        "Weather data is unavailable for this location.",
      );
    return NextResponse.json({
      temperature: data.current.temperature_2m,
      humidity: data.current.relative_humidity_2m,
      rain: data.current.precipitation,
      wind: data.current.wind_speed_10m,
      code: data.current.weather_code,
      time: data.current.time,
      daily: data.daily.time.map((date: string, i: number) => ({
        date,
        high: data.daily.temperature_2m_max[i],
        low: data.daily.temperature_2m_min[i],
        rainChance: data.daily.precipitation_probability_max[i],
        code: data.daily.weather_code[i],
      })),
    });
  } catch (error) {
    return fail(error);
  }
}
