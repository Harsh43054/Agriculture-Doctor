import { NextResponse } from "next/server";
import sharp from "sharp";
import { z } from "zod";
import { authenticate, databaseError, fail, HttpError } from "@/lib/server";
import { MAX_IMAGE_BYTES, imageSignature } from "@/lib/validation";
import { analyze, analysisConfigured } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const { db, user } = await authenticate(request);
    const { data, error } = await db
      .from("scans")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw databaseError();
    const scans = await Promise.all(
      data.map(async (scan) => {
        const { data: signed } = await db.storage
          .from("plant-images")
          .createSignedUrl(scan.image_path, 900);
        return { ...scan, imageUrl: signed?.signedUrl };
      }),
    );
    return NextResponse.json(
      { scans },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const { db, user } = await authenticate(request);
    if (!(await analysisConfigured()))
      throw new HttpError(
        503,
        "Photo analysis is not connected yet. Configure Gemini or Vercel AI Gateway.",
      );
    const length = Number(request.headers.get("content-length"));
    if (length > MAX_IMAGE_BYTES + 65536)
      throw new HttpError(413, "Choose an image under 3 MB.");
    const form = await request.formData();
    const file = form.get("image");
    if (!(file instanceof File) || !file.size)
      throw new HttpError(400, "Choose a plant photograph first.");
    if (file.size > MAX_IMAGE_BYTES)
      throw new HttpError(413, "Choose an image under 3 MB.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
      throw new HttpError(415, "Use a JPG, PNG, or WebP image.");
    const fields = z
      .object({
        field: z.string().trim().min(1).max(80),
        crop_hint: z.string().trim().max(80),
      })
      .parse({
        field: form.get("field") || "My field",
        crop_hint: form.get("crop_hint") || "",
      });
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!imageSignature(bytes))
      throw new HttpError(
        415,
        "This file is not a valid JPG, PNG, or WebP image.",
      );
    let image: Buffer;
    try {
      image = await sharp(bytes, {
        limitInputPixels: 25000000,
        animated: false,
      })
        .rotate()
        .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
    } catch {
      throw new HttpError(
        415,
        "The image is damaged or too large to decode. Choose another photograph.",
      );
    }
    const { data: allowed, error: quotaError } =
      await db.rpc("consume_scan_quota");
    if (quotaError) throw databaseError();
    if (!allowed)
      throw new HttpError(
        429,
        "Your daily limit of 10 analysis attempts has been reached. Try again tomorrow (UTC).",
      );
    const result = await analyze(image, fields.crop_hint);
    if (!result.isPlant)
      throw new HttpError(
        422,
        "No plant could be identified. Upload a clear photograph of the affected plant.",
      );
    const path = `${user.id}/${crypto.randomUUID()}.jpg`;
    const { error: uploadError } = await db.storage
      .from("plant-images")
      .upload(path, image, { contentType: "image/jpeg", upsert: false });
    if (uploadError)
      throw new HttpError(
        503,
        "Image storage is unavailable. Check the private plant-images bucket and policies.",
      );
    const { data, error } = await db
      .from("scans")
      .insert({ user_id: user.id, image_path: path, ...fields, result })
      .select()
      .single();
    if (error) {
      await db.storage.from("plant-images").remove([path]);
      throw databaseError();
    }
    const { data: signed } = await db.storage
      .from("plant-images")
      .createSignedUrl(path, 900);
    return NextResponse.json(
      { scan: { ...data, imageUrl: signed?.signedUrl } },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return fail(error);
  }
}
