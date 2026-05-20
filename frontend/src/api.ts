export interface NailAnalysisResponse {
  requestId: string;
  score: number;
  verdict: string;
  summary: string;
  strengths: string[];
  suggestions: string[];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export async function submitAnalysis(
  handImage: File,
  nailImage: File,
  apiKey: string
): Promise<NailAnalysisResponse> {
  const formData = new FormData();
  formData.append("handImage", handImage);
  formData.append("nailImage", nailImage);
  formData.append("apiKey", apiKey);

  const response = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    let errorMessage = "请求失败，请稍后重试。";
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) {
        errorMessage = payload.error;
      }
    } catch {
      // Ignore JSON parse failure and keep default message.
    }
    throw new Error(errorMessage);
  }

  return (await response.json()) as NailAnalysisResponse;
}
