import { z } from "zod";
export async function readBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("A JSON body is required.");
  const decoder = new TextDecoder(); let size = 0; let text = "";
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.length;
    if (size > 16_384) { await reader.cancel(); throw new Error("Request exceeds 16 KB."); }
    text += decoder.decode(value, { stream: true });
  }
  return schema.parse(JSON.parse(text + decoder.decode()));
}
