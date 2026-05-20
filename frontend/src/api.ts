export interface NailAnalysisResponse {
  requestId: string;
  score: number;
  verdict: string;
  summary: string;
  strengths: string[];
  suggestions: string[];
}

const DEFAULT_MIMO_BASE_URL =
  import.meta.env.VITE_MIMO_API_URL ?? "https://token-plan-cn.xiaomimimo.com/v1";
export const DEFAULT_USER_PROMPT = [
  "请分析人物照片中的目标人物穿上服饰照片中衣服后的搭配效果，从版型适配、色彩协调、风格一致性、日常适用性四个维度给出评价。",
  "请给出明确结论，并提供可执行的优化建议（例如颜色、版型、层次搭配与拍摄建议）。"
].join("\n");

const FIXED_OUTPUT_SCHEMA_PROMPT =
  "只返回 JSON，字段：score(0-100), verdict, summary, strengths(数组), suggestions(数组)。";
const FIXED_TARGET_SUBJECT_PROMPT =
  [
    "图像身份约束：第一张图是“人物照片”，第二张图是“服饰照片”。",
    "请务必将人物照片中的人物视为唯一目标人物，只提取服饰照片中的服饰款式，不要将服饰照片里出现的人当作目标人物。"
  ].join("\n");

interface MimoChatCompletionResponse {
  id?: string;
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
}

function resolveMimoCompletionUrl(baseUrl?: string): string {
  const normalized = (baseUrl ?? DEFAULT_MIMO_BASE_URL).replace(/\/+$/, "");
  if (normalized.endsWith("/chat/completions")) {
    return normalized;
  }
  if (normalized.endsWith("/v1")) {
    return `${normalized}/chat/completions`;
  }
  return `${normalized}/v1/chat/completions`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("图片读取失败。"));
    reader.readAsDataURL(file);
  });
}

function parseContentToText(content?: string | Array<{ type?: string; text?: string }>): string {
  if (!content) {
    return "";
  }
  if (typeof content === "string") {
    return content;
  }
  return content.map((item) => item.text ?? "").join("").trim();
}

function parseAnalysisFromModelText(text: string): Omit<NailAnalysisResponse, "requestId"> {
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");

  if (jsonStart >= 0 && jsonEnd > jsonStart) {
    try {
      const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as Omit<NailAnalysisResponse, "requestId">;
      if (
        typeof parsed.score === "number" &&
        typeof parsed.verdict === "string" &&
        typeof parsed.summary === "string" &&
        Array.isArray(parsed.strengths) &&
        Array.isArray(parsed.suggestions)
      ) {
        return parsed;
      }
    } catch {
      // Fallback handled below.
    }
  }

  return {
    score: 50,
    verdict: "模型返回非结构化结果",
    summary: text || "模型未返回可解析内容。",
    strengths: [],
    suggestions: ["建议切换为后端代理模式，提升稳定性与可解析性。"]
  };
}

function buildFinalPrompt(userPrompt?: string): string {
  const editablePrompt = userPrompt?.trim() || DEFAULT_USER_PROMPT;
  return `${editablePrompt}\n${FIXED_TARGET_SUBJECT_PROMPT}\n${FIXED_OUTPUT_SCHEMA_PROMPT}`;
}

export async function submitAnalysisDirectMimo(
  handImage: File,
  nailImage: File,
  apiKey: string,
  model: string,
  baseUrl?: string,
  promptText?: string
): Promise<NailAnalysisResponse> {
  const [handImageUrl, nailImageUrl] = await Promise.all([
    fileToDataUrl(handImage),
    fileToDataUrl(nailImage)
  ]);

  const response = await fetch(resolveMimoCompletionUrl(baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey
    },
    body: JSON.stringify({
      model,
      max_completion_tokens: 1024,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are MiMo, a professional nail and hand aesthetics consultant. Always return strict JSON."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "【人物照片】如下："
            },
            {
              type: "image_url",
              image_url: { url: handImageUrl }
            },
            {
              type: "text",
              text: "【服饰照片】如下："
            },
            {
              type: "image_url",
              image_url: { url: nailImageUrl }
            },
            {
              type: "text",
              text: buildFinalPrompt(promptText)
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `直连 MiMo 失败: ${response.status} ${response.statusText}${errorBody ? ` | ${errorBody}` : ""}`
    );
  }

  const payload = (await response.json()) as MimoChatCompletionResponse;
  const modelText = parseContentToText(payload.choices?.[0]?.message?.content);
  const analysis = parseAnalysisFromModelText(modelText);

  return {
    requestId: payload.id ?? crypto.randomUUID(),
    ...analysis
  };
}
