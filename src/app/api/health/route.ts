import { NextResponse } from "next/server";
import { analysisConfigured } from "@/lib/ai";
export async function GET() {
  return NextResponse.json({ status: "ok", services: {
    supabaseConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    analysisConfigured: analysisConfigured(),
    weather: "Open-Meteo"
  } }, { headers: { "Cache-Control": "no-store" } });
}
