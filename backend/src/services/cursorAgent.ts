import { Agent } from "@cursor/sdk";
import { runImageModel } from "./imageModelAdapter.js";

export interface TryOnAgentInput {
  handImageBase64: string;
  handImageMimeType: string;
  nailImageBase64: string;
  nailImageMimeType: string;
}

export interface TryOnAgentOutput {
  resultImageUrl?: string;
  resultImageBase64?: string;
  resultImageMimeType?: string;
  message?: string;
}

interface AgentPlanResult {
  prompt?: string;
}

function parseAgentJson(text: string): AgentPlanResult {
  try {
    const parsed = JSON.parse(text) as AgentPlanResult;
    return parsed;
  } catch {
    return {};
  }
}

function buildFallbackPrompt(): string {
  return [
    "Create a realistic nail try-on image.",
    "Keep the original hand identity and skin texture.",
    "Apply nail style from reference image with natural lighting."
  ].join(" ");
}

async function generatePromptWithCursorAgent(): Promise<string> {
  const apiKey = process.env.CURSOR_API_KEY;
  if (!apiKey) {
    return buildFallbackPrompt();
  }

  const modelId = process.env.CURSOR_MODEL_ID ?? "auto";
  const run = await Agent.prompt(
    [
      "You are an image try-on orchestration assistant.",
      "Generate ONLY JSON with shape: {\"prompt\":\"...\"}.",
      "The prompt should guide an image generation model to blend hand photo and nail photo naturally.",
      "Keep response concise."
    ].join("\n"),
    {
      apiKey,
      model: { id: modelId },
      local: { cwd: process.cwd() }
    }
  );

  const parsed = parseAgentJson(run.result ?? "");
  return parsed.prompt || buildFallbackPrompt();
}

export async function runTryOnWithCursorAgent(input: TryOnAgentInput): Promise<TryOnAgentOutput> {
  const prompt = await generatePromptWithCursorAgent();

  const modelOutput = await runImageModel({
    ...input,
    prompt
  });

  return {
    resultImageUrl: modelOutput.resultImageUrl,
    resultImageBase64: modelOutput.resultImageBase64,
    resultImageMimeType: modelOutput.resultImageMimeType,
    message: modelOutput.message ?? "生成完成"
  };
}
