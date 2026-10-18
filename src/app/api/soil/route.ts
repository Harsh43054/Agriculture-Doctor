import { NextResponse } from "next/server";
import { authenticate, databaseError, fail, HttpError } from "@/lib/server";
import { soilSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    const { db, user } = await authenticate(request);
    const { data, error } = await db
      .from("soil_readings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw databaseError();
    return NextResponse.json(
      { readings: data },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const { db, user } = await authenticate(request);
    if (Number(request.headers.get("content-length")) > 8192)
      throw new HttpError(413, "Reading payload is too large.");
    const reading = soilSchema.parse(await request.json());
    const { data, error } = await db
      .from("soil_readings")
      .insert({ user_id: user.id, ...reading })
      .select()
      .single();
    if (error) throw databaseError();
    return NextResponse.json({ reading: data }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
