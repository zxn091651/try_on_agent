export interface TryOnImageResponse {
  requestId: string;
  message?: string;
  imageBlob: Blob;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export async function submitTryOn(handImage: File, nailImage: File): Promise<TryOnImageResponse> {
  const formData = new FormData();
  formData.append("handImage", handImage);
  formData.append("nailImage", nailImage);

  const response = await fetch(`${API_BASE_URL}/api/tryon`, {
    method: "POST",
    headers: {
      Accept: "image/*,application/json"
    },
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

  const requestId = response.headers.get("X-Request-Id") ?? crypto.randomUUID();
  const encodedMessage = response.headers.get("X-Model-Message");
  const message = encodedMessage ? decodeURIComponent(encodedMessage) : undefined;
  const imageBlob = await response.blob();

  if (!imageBlob.type.startsWith("image/")) {
    throw new Error("服务返回成功但不是图片格式。");
  }

  return { requestId, message, imageBlob };
}
