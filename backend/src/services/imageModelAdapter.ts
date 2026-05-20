import { randomUUID } from "node:crypto";
import { z } from "zod";

const imageModelResponseSchema = z.object({
  resultImageUrl: z.string().url().optional(),
  resultImageBase64: z.string().optional(),
  resultImageMimeType: z
    .string()
    .refine((value) => value.startsWith("image/"), "resultImageMimeType 必须是 image/*")
    .optional(),
  message: z.string().optional()
});

export interface ImageModelInput {
  handImageBase64: string;
  handImageMimeType: string;
  nailImageBase64: string;
  nailImageMimeType: string;
  prompt: string;
}

export interface ImageModelOutput {
  resultImageUrl?: string;
  resultImageBase64?: string;
  resultImageMimeType?: string;
  message?: string;
}

function toDataUri(base64: string, mimeType: string): string {
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Calls the configured image generation service. If no endpoint is configured,
 * it returns a deterministic mock using the user's hand image.
 */
export async function runImageModel(input: ImageModelInput): Promise<ImageModelOutput> {
  const endpoint = process.env.IMAGE_MODEL_ENDPOINT;
  const apiKey = process.env.IMAGE_MODEL_API_KEY;

  if (!endpoint) {
    return {
      resultImageBase64: input.handImageBase64,
      resultImageMimeType: input.handImageMimeType,
      message:
        "IMAGE_MODEL_ENDPOINT 未配置，当前返回手部原图作为演示占位。请配置真实图像模型接口。"
    };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
    },
    body: JSON.stringify({
      requestId: randomUUID(),
      handImage: toDataUri(input.handImageBase64, input.handImageMimeType),
      nailImage: toDataUri(input.nailImageBase64, input.nailImageMimeType),
      prompt: input.prompt
    })
  });

  if (!response.ok) {
    throw new Error(`图像模型接口调用失败: ${response.status} ${response.statusText}`);
  }

  const rawPayload = (await response.json()) as unknown;
  return imageModelResponseSchema.parse(rawPayload);
}
