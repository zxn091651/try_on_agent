import { randomUUID } from "node:crypto";
import { Router } from "express";
import multer from "multer";
import { analyzeByMimo } from "../services/mimoAnalyzer.js";

const allowedMimeTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const maxFileBytes = 8 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxFileBytes }
});

function encodeBuffer(file: Express.Multer.File): string {
  return file.buffer.toString("base64");
}

export const tryOnRouter = Router();

tryOnRouter.post(
  "/analyze",
  upload.fields([
    { name: "handImage", maxCount: 1 },
    { name: "nailImage", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const files = req.files as Record<string, Express.Multer.File[] | undefined>;
      const handImage = files.handImage?.[0];
      const nailImage = files.nailImage?.[0];
      const apiKey = typeof req.body.apiKey === "string" ? req.body.apiKey.trim() : "";

      if (!handImage || !nailImage) {
        return res.status(400).json({ error: "请同时上传 handImage 和 nailImage。" });
      }
      if (!apiKey) {
        return res.status(400).json({ error: "请先输入 MIMO API Key。" });
      }

      if (!allowedMimeTypes.has(handImage.mimetype) || !allowedMimeTypes.has(nailImage.mimetype)) {
        return res.status(400).json({ error: "仅支持 PNG、JPEG、WEBP 图片格式。" });
      }

      const requestId = randomUUID();
      const result = await analyzeByMimo({
        handImageBase64: encodeBuffer(handImage),
        handImageMimeType: handImage.mimetype,
        nailImageBase64: encodeBuffer(nailImage),
        nailImageMimeType: nailImage.mimetype,
        apiKey
      });

      return res.status(200).json({
        requestId,
        score: result.score,
        verdict: result.verdict,
        summary: result.summary,
        strengths: result.strengths,
        suggestions: result.suggestions
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "服务异常";
      return res.status(500).json({ error: message });
    }
  }
);
