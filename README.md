# Try On Gen

美甲试穿网页项目，采用前后端分离架构：

- 前端：React + Vite，部署到 GitHub Pages
- 后端：Node.js + Express，接收上传图片并调用 Cursor Agent + 图像模型接口

## 项目结构

- `frontend`：页面与上传交互
- `backend`：`/api/tryon` 服务接口
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
- `CURSOR_API_KEY`：Cursor API Key（仅后端）
- `IMAGE_MODEL_ENDPOINT`：你的图像生成模型接口

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

`POST /api/tryon`

- Content-Type: `multipart/form-data`
- 字段：
  - `handImage`
  - `nailImage`

返回：

- Body 直接返回 `image/*` 二进制
- Header:
  - `X-Request-Id`: 请求 ID
  - `X-Model-Message`: URL 编码后的模型提示信息

## GitHub Pages 发布

1. 推送代码到 `main` 分支
2. 在仓库设置中将 Pages Source 设为 **GitHub Actions**
3. 在仓库 Variables 中配置 `VITE_API_BASE_URL`
4. 访问 `https://zxn091651.github.io/try_on_gen/`
