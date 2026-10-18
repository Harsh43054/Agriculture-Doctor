import { z } from "zod";

export const soilSchema = z.object({
  field: z.string().trim().min(1).max(80),
  moisture: z.number().min(0).max(100),
  ph: z.number().min(0).max(14),
  temperature: z.number().min(-30).max(80),
  notes: z.string().trim().max(1000).default(""),
});

export const analysisSchema = z.object({
  isPlant: z.boolean(),
  crop: z.string().min(1).max(120),
  condition: z.string().min(1).max(180),
  severity: z.enum(["healthy", "low", "moderate", "high", "uncertain"]),
  summary: z.string().min(1).max(2000),
  actions: z.array(z.string().min(1).max(500)).min(1).max(5),
  uncertainty: z.string().min(1).max(1000),
});
export type Analysis = z.infer<typeof analysisSchema>;
export type SoilInput = z.infer<typeof soilSchema>;
export type Scan = { id: string; field: string; crop_hint: string; result: Analysis; created_at: string; image_path: string; imageUrl?: string };
export type Soil = SoilInput & { id: string; created_at: string };
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

export function imageSignature(bytes: Uint8Array): boolean {
  return (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    || (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)
    || (Buffer.from(bytes.slice(0, 4)).toString() === "RIFF" && Buffer.from(bytes.slice(8, 12)).toString() === "WEBP");
}
