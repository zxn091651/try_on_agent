import { z } from "zod";

export interface AnalyzeInput {
  handImageBase64: string;
  handImageMimeType: string;
  nailImageBase64: string;
  nailImageMimeType: string;
  apiKey: string;
}

export interface AnalyzeOutput {
  score: number;
  verdict: string;
  summary: string;
  strengths: string[];
  suggestions: string[];
}

const analysisSchema = z.object({
  score: z.number().min(0).max(100),
  verdict: z.string().min(1),
  summary: z.string().min(1),
  strengths: z.array(z.string()).default([]),
  suggestions: z.array(z.string()).default([])
});

function buildDataUri(mimeType: string, base64: string): string {
  return `data:${mimeType};base64,${base64}`;
}

function resolveCompletionsEndpoint(rawUrl: string): string {
  const normalized = rawUrl.replace(/\/+$/, "");
  if (normalized.endsWith("/chat/completions")) {
    return normalized;
  }
  if (normalized.endsWith("/v1")) {
    return `${normalized}/chat/completions`;
  }
  return `${normalized}/v1/chat/completions`;
}

function toHeuristicFallback(): AnalyzeOutput {
  return {
    score: 70,
    verdict: "中等偏好看",
    summary: "当前为降级结果：MIMO 接口未配置，无法调用真实视觉分析。",
    strengths: ["照片可上传且格式有效"],
    suggestions: ["配置 MIMO 接口后可得到基于图像内容的真实审美分析"]
  };
}

export async function analyzeByMimo(input: AnalyzeInput): Promise<AnalyzeOutput> {
  const rawApiUrl = process.env.MIMO_API_URL;
  const model = process.env.MIMO_MODEL ?? "mimo-v2.5";
  const maxCompletionTokens = Number(process.env.MIMO_MAX_COMPLETION_TOKENS ?? "1024");

  if (!rawApiUrl || !input.apiKey) {
    return toHeuristicFallback();
  }
  const apiUrl = resolveCompletionsEndpoint(rawApiUrl);

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": input.apiKey
    },
    body: JSON.stringify({
      model,
      max_completion_tokens: maxCompletionTokens,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You are MiMo, an AI assistant developed by Xiaomi.",
            "You are also a professional nail and hand aesthetics consultant."
          ].join(" ")
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                "请分析这组“手部图+美甲图”的试戴效果是否好看。",
                "返回严格 JSON，字段为：",
                "score(0-100), verdict, summary, strengths(数组), suggestions(数组)。",
                "要求：结论明确，建议可执行。"
              ].join("\n")
            },
            {
              type: "image_url",
              image_url: {
                url: buildDataUri(input.handImageMimeType, input.handImageBase64)
              }
            },
            {
              type: "image_url",
              image_url: {
                url: buildDataUri(input.nailImageMimeType, input.nailImageBase64)
              }
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `MIMO 接口调用失败: ${response.status} ${response.statusText}${errorBody ? ` | ${errorBody}` : ""}`
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string | Array<{ type?: string; text?: string }>;
      };
    }>;
  };

  const contentRaw = payload.choices?.[0]?.message?.content;
  const content =
    typeof contentRaw === "string"
      ? contentRaw
      : contentRaw?.map((chunk) => chunk.text ?? "").join("").trim();

  if (!content) {
    throw new Error("MIMO 接口返回为空，未获得分析结果。");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`MIMO 返回非 JSON 内容: ${content}`);
  }

  return analysisSchema.parse(parsed);
}
