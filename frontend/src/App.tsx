import { FormEvent, useMemo, useState } from "react";
import { DEFAULT_USER_PROMPT, NailAnalysisResponse, submitAnalysisDirectMimo } from "./api";

function toPreviewUrl(file: File | null): string | null {
  return file ? URL.createObjectURL(file) : null;
}

export default function App() {
  const [handImage, setHandImage] = useState<File | null>(null);
  const [nailImage, setNailImage] = useState<File | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [mimoBaseUrl, setMimoBaseUrl] = useState("https://token-plan-cn.xiaomimimo.com/v1");
  const [mimoModel, setMimoModel] = useState("mimo-v2.5");
  const [analysisPrompt, setAnalysisPrompt] = useState(DEFAULT_USER_PROMPT);
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
      const payload = await submitAnalysisDirectMimo(
        handImage,
        nailImage,
        apiKey.trim(),
        mimoModel.trim() || "mimo-v2.5",
        mimoBaseUrl.trim(),
        analysisPrompt
      );
      setAnalysis(payload);
    } catch (submitError) {
      if (submitError instanceof TypeError && submitError.message.includes("Failed to fetch")) {
        setError(
          "请求失败（Failed to fetch）。通常是网络或浏览器跨域限制导致。请检查 Base URL、API Key、模型是否正确，并确认当前环境允许前端直连 MiMo。"
        );
      } else {
        setError(submitError instanceof Error ? submitError.message : "提交失败。");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container">
      <h1>美甲穿戴审美分析</h1>
      <p className="subtitle">上传手部照片与美甲图，调用 MIMO 大模型分析搭配是否好看。</p>

      <section className="layout">
        <div className="left-column">
          <form className="card" onSubmit={onSubmit}>
            <label>
              MIMO API Key（登录）
              <input
                type="password"
                value={apiKey}
                placeholder="tp-..."
                onChange={(event) => setApiKey(event.target.value)}
              />
            </label>

            <label>
              Base URL
              <input
                type="text"
                value={mimoBaseUrl}
                onChange={(event) => setMimoBaseUrl(event.target.value)}
              />
            </label>
            <label>
              Models
              <select value={mimoModel} onChange={(event) => setMimoModel(event.target.value)}>
                <option value="mimo-v2.5">mimo-v2.5</option>
                <option value="mimo-v2-omni">mimo-v2-omni</option>
              </select>
            </label>
            <label>
              分析需求（可编辑）
              <textarea
                value={analysisPrompt}
                rows={5}
                onChange={(event) => setAnalysisPrompt(event.target.value)}
              />
            </label>

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
              {loading ? "分析中..." : "分析"}
            </button>
          </form>

          {error && <p className="error">{error}</p>}

          <footer className="footer-meta">
            <p>有效期至 2026-06-16 23:59</p>
            <p>Made by zxn, 2026-05-20</p>
          </footer>
        </div>

        <section className="result right-column">
          <h2>分析建议</h2>
          {!analysis && <p className="placeholder">提交后将在这里显示评分、结论与建议。</p>}
          {analysis && (
            <>
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
            </>
          )}
        </section>
      </section>
    </main>
  );
}
