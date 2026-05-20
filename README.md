# Try On Agent

人物服饰试穿分析网页项目，基于前端直连 MiMo 大模型进行分析。

- 前端：React + Vite，部署到 GitHub Pages

## 项目结构

- `frontend`：页面与上传交互
- `.github/workflows/deploy-frontend.yml`：自动发布前端到 GitHub Pages

## 本地运行

### 1) 安装前端依赖

```bash
cd frontend
npm install
```

### 2) 配置环境变量

- 复制 `frontend/.env.example` 为 `frontend/.env`

关键变量：

- `VITE_MIMO_API_URL`：前端直连 MiMo 的 base URL（实验模式）
- 页面内输入 `MIMO API Key`
- 页面内选择模型（`mimo-v2.5` / `mimo-v2-omni`）

说明：该项目为前端直连 MiMo 模式，API Key 由用户在页面输入。

### 3) 启动服务

```bash
cd frontend
npm run dev
```

## 分析说明

- 上传两张图片：
  - `人物照片`：目标人物
  - `服饰照片`：服饰参考
- 模型会按照固定约束识别图像身份：
  - 人物照片中的人物是唯一目标人物
  - 服饰照片仅用于提取服饰信息
  - 不会把服饰照片里的人当成目标人物

## GitHub Pages 发布

1. 推送代码到 `main` 分支
2. 在仓库设置中将 Pages Source 设为 **GitHub Actions**
3. 访问 `https://zxn091651.github.io/try_on_agent/`
