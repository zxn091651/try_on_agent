# Try On Agent

美甲穿戴审美分析网页项目，采用前后端分离架构：

- 前端：React + Vite，部署到 GitHub Pages
- 后端：Node.js + Express，接收上传图片并调用小米 MIMO 模型做搭配分析

## 项目结构

- `frontend`：页面与上传交互
- `backend`：`/api/analyze` 服务接口
- `.github/workflows/deploy-frontend.yml`：自动发布前端到 GitHub Pages

## 本地运行

### 1) 安装前端依赖

```bash
cd frontend
npm install
```

### 2) 安装后端依赖

```bash
cd ../backend
npm install
```

### 3) 配置环境变量

- 复制 `frontend/.env.example` 为 `frontend/.env`
- 复制 `backend/.env.example` 为 `backend/.env`

关键变量：

- `VITE_API_BASE_URL`：后端地址
- `VITE_MIMO_API_URL`：前端直连 MiMo 的 base URL（实验模式）
- `MIMO_API_URL`：MIMO 接口根地址（推荐 `https://api.xiaomimimo.com/v1`）
- `MIMO_MODEL`：模型名（如 `mimo-vl`）
- `MIMO_MAX_COMPLETION_TOKENS`：最大输出 token（默认 `1024`）

说明：MIMO API Key 不再保存在后端 `.env`，由前端用户输入后随请求传到后端。

补充：前端支持“直连 MiMo（实验）”模式，可能受浏览器 CORS 策略影响导致请求失败。生产建议仍使用后端代理模式。
页面默认请求模式为“前端直连 MiMo（实验）”，并提供 `mimo-v2.5` 与 `mimo-v2-omni` 的模型选择。

### 4) 启动服务

```bash
# terminal 1
cd backend
npm run dev

# terminal 2
cd frontend
npm run dev
```

## API 说明

`POST /api/analyze`

- Content-Type: `multipart/form-data`
- 字段：
  - `apiKey`
  - `handImage`
  - `nailImage`

返回：

- JSON:

```json
{
  "requestId": "uuid",
  "score": 86,
  "verdict": "整体好看",
  "summary": "手部肤色与甲片主色匹配度较高。",
  "strengths": ["配色统一", "指尖视觉延展自然"],
  "suggestions": ["可把亮片密度降低 10%", "边缘可做更圆润过渡"]
}
```

## GitHub Pages 发布

1. 推送代码到 `main` 分支
2. 在仓库设置中将 Pages Source 设为 **GitHub Actions**
3. 在仓库 Variables 中配置 `VITE_API_BASE_URL`
4. 访问 `https://zxn091651.github.io/try_on_agent/`
