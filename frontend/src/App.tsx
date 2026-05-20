import { FormEvent, useEffect, useMemo, useState } from "react";
import { submitTryOn } from "./api";

function toPreviewUrl(file: File | null): string | null {
  return file ? URL.createObjectURL(file) : null;
}

export default function App() {
  const [handImage, setHandImage] = useState<File | null>(null);
  const [nailImage, setNailImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultSrc, setResultSrc] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handPreview = useMemo(() => toPreviewUrl(handImage), [handImage]);
  const nailPreview = useMemo(() => toPreviewUrl(nailImage), [nailImage]);

  useEffect(() => {
    return () => {
      if (resultSrc) {
        URL.revokeObjectURL(resultSrc);
      }
    };
  }, [resultSrc]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!handImage || !nailImage) {
      setError("请先上传手部照片和美甲照片。");
      return;
    }

    try {
      setLoading(true);
      const payload = await submitTryOn(handImage, nailImage);
      const objectUrl = URL.createObjectURL(payload.imageBlob);
      if (resultSrc) {
        URL.revokeObjectURL(resultSrc);
      }
      setResultSrc(objectUrl);
      setRequestId(payload.requestId);
      setMessage(payload.message ?? null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "提交失败。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container">
      <h1>美甲试穿生成</h1>
      <p className="subtitle">上传手部照片与目标美甲照片，生成试穿效果图。</p>

      <form className="card" onSubmit={onSubmit}>
        <label>
          手部照片
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setHandImage(event.target.files?.[0] ?? null)}
          />
        </label>
        {handPreview && <img src={handPreview} className="preview" alt="手部预览" />}

        <label>
          美甲照片
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setNailImage(event.target.files?.[0] ?? null)}
          />
        </label>
        {nailPreview && <img src={nailPreview} className="preview" alt="美甲预览" />}

        <button type="submit" disabled={loading}>
          {loading ? "生成中..." : "生成试穿图"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {resultSrc && (
        <section className="result">
          <h2>生成结果</h2>
          {message && <p>{message}</p>}
          <img src={resultSrc} className="result-image" alt="美甲试穿结果" />
          <a href={resultSrc} download={`nail-tryon-${requestId ?? "result"}.png`}>
            下载图片
          </a>
        </section>
      )}
    </main>
  );
}
