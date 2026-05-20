import { FormEvent, useMemo, useState } from "react";
import { NailAnalysisResponse, submitAnalysis, submitAnalysisDirectMimo } from "./api";

function toPreviewUrl(file: File | null): string | null {
  return file ? URL.createObjectURL(file) : null;
}

export default function App() {
  const [handImage, setHandImage] = useState<File | null>(null);
  const [nailImage, setNailImage] = useState<File | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [requestMode, setRequestMode] = useState<"backend" | "direct">("backend");
  const [mimoBaseUrl, setMimoBaseUrl] = useState("https://token-plan-cn.xiaomimimo.com/v1");
  const [mimoModel, setMimoModel] = useState("mimo-v2.5");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<NailAnalysisResponse | null>(null);

  const handPreview = useMemo(() => toPreviewUrl(handImage), [handImage]);
  const nailPreview = useMemo(() => toPreviewUrl(nailImage), [nailImage]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setAnalysis(null);

    if (!handImage || !nailImage) {
      setError("请先上传手部照片和美甲照片。");
      return;
    }
    if (!apiKey.trim()) {
      setError("请先输入 MIMO API Key。");
      return;
    }

    try {
      setLoading(true);
      const payload =
        requestMode === "backend"
          ? await submitAnalysis(handImage, nailImage, apiKey.trim())
          : await submitAnalysisDirectMimo(
              handImage,
              nailImage,
              apiKey.trim(),
              mimoModel.trim() || "mimo-v2.5",
              mimoBaseUrl.trim()
            );
      setAnalysis(payload);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "提交失败。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container">
      <h1>美甲穿戴审美分析</h1>
      <p className="subtitle">上传手部照片与美甲图，调用 MIMO 模型分析搭配是否好看。</p>

      <form className="card" onSubmit={onSubmit}>
        <label>
          请求模式
          <select value={requestMode} onChange={(event) => setRequestMode(event.target.value as "backend" | "direct")}>
            <option value="backend">后端代理（推荐）</option>
            <option value="direct">前端直连 MiMo（实验）</option>
          </select>
        </label>

        <label>
          MIMO API Key（登录）
          <input
            type="password"
            value={apiKey}
            placeholder="tp-..."
            onChange={(event) => setApiKey(event.target.value)}
          />
        </label>

        {requestMode === "direct" && (
          <>
            <label>
              MiMo Base URL
              <input
                type="text"
                value={mimoBaseUrl}
                onChange={(event) => setMimoBaseUrl(event.target.value)}
              />
            </label>
            <label>
              MiMo Model
              <input type="text" value={mimoModel} onChange={(event) => setMimoModel(event.target.value)} />
            </label>
          </>
        )}

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
          {loading ? "分析中..." : requestMode === "backend" ? "通过后端分析" : "直连 MiMo 分析"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {analysis && (
        <section className="result">
          <h2>分析结果</h2>
          <p>
            <strong>综合评分：</strong>
            {analysis.score}/100
          </p>
          <p>
            <strong>结论：</strong>
            {analysis.verdict}
          </p>
          <p>{analysis.summary}</p>
          <p>
            <strong>优点：</strong>
            {analysis.strengths.join("；")}
          </p>
          <p>
            <strong>改进建议：</strong>
            {analysis.suggestions.join("；")}
          </p>
          <p className="request-id">请求 ID: {analysis.requestId}</p>
        </section>
      )}
    </main>
  );
}
