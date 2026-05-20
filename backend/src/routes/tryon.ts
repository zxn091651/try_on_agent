import { randomUUID } from "node:crypto";
import { Router } from "express";
import multer from "multer";
import { runTryOnWithCursorAgent } from "../services/cursorAgent.js";

const allowedMimeTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const maxFileBytes = 8 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxFileBytes }
});

function encodeBuffer(file: Express.Multer.File): string {
  return file.buffer.toString("base64");
}

async function fetchRemoteImage(url: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`远程结果图下载失败: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const mimeType = response.headers.get("content-type") || "image/png";
  return { buffer: Buffer.from(arrayBuffer), mimeType };
}

export const tryOnRouter = Router();

tryOnRouter.post(
  "/tryon",
  upload.fields([
    { name: "handImage", maxCount: 1 },
    { name: "nailImage", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const files = req.files as Record<string, Express.Multer.File[] | undefined>;
      const handImage = files.handImage?.[0];
      const nailImage = files.nailImage?.[0];

      if (!handImage || !nailImage) {
        return res.status(400).json({ error: "请同时上传 handImage 和 nailImage。" });
      }

      if (!allowedMimeTypes.has(handImage.mimetype) || !allowedMimeTypes.has(nailImage.mimetype)) {
        return res.status(400).json({ error: "仅支持 PNG、JPEG、WEBP 图片格式。" });
      }

      const requestId = randomUUID();
      const result = await runTryOnWithCursorAgent({
        handImageBase64: encodeBuffer(handImage),
        handImageMimeType: handImage.mimetype,
        nailImageBase64: encodeBuffer(nailImage),
        nailImageMimeType: nailImage.mimetype
      });

      if (result.resultImageBase64) {
        const mimeType = result.resultImageMimeType ?? "image/png";
        const imageBuffer = Buffer.from(result.resultImageBase64, "base64");
        res.setHeader("Content-Type", mimeType);
        res.setHeader("Content-Length", imageBuffer.length.toString());
        res.setHeader("X-Request-Id", requestId);
        res.setHeader("X-Model-Message", encodeURIComponent(result.message ?? "生成完成"));
        return res.status(200).send(imageBuffer);
      }

      if (result.resultImageUrl) {
        const remoteImage = await fetchRemoteImage(result.resultImageUrl);
        res.setHeader("Content-Type", remoteImage.mimeType);
        res.setHeader("Content-Length", remoteImage.buffer.length.toString());
        res.setHeader("X-Request-Id", requestId);
        res.setHeader("X-Model-Message", encodeURIComponent(result.message ?? "生成完成"));
        return res.status(200).send(remoteImage.buffer);
      }

      return res.status(502).json({ error: "模型未返回可用图片结果。" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "服务异常";
      return res.status(500).json({ error: message });
    }
  }
);
