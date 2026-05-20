import "dotenv/config";
import cors from "cors";
import express from "express";
import { tryOnRouter } from "./routes/tryon.js";

const app = express();
const port = Number(process.env.PORT ?? "8787");

const corsOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: corsOrigins.length > 0 ? corsOrigins : true
  })
);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api", tryOnRouter);

app.listen(port, () => {
  console.log(`Backend is running on http://localhost:${port}`);
});
