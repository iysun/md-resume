# MD 简历编辑器

用 Markdown 编写简历，浏览器实时预览 HTML 排版，AI 辅助检查，导出 PDF。

## 功能

- 左侧 Markdown 编辑，右侧实时 HTML 预览（300ms 防抖）
- 内容自动保存到 SQLite（经后端 API），支持多文档管理
- **AI 检查**：支持选区或全文，结构化建议，逐条复制 / 一键替换，历史记录持久化
- 主题偏好（系统 / 浅色 / 深色）持久化
- 导出 PDF（默认浏览器打印；可选 Puppeteer 服务端一键下载）
- 导入 / 导出 `.md` 文件

## 环境要求

- Node.js 22.5+（后端使用内置 `node:sqlite`）
- pnpm
- DeepSeek API Key（AI 检查必需）

## 安装与运行

```bash
cd md-resume
pnpm install
cp .env.example .env   # 填入 DEEPSEEK_API_KEY
pnpm dev
```

在 `.env` 中设置 `DEEPSEEK_API_KEY`（也支持 `OPENAI_API_KEY`），然后启动。浏览器打开 [http://localhost:5173](http://localhost:5173)。

`pnpm dev` 会同时启动前端与 API 服务（默认端口 3001）。**AI 检查依赖后端，不可仅启动前端。**

## 脚本

| 命令 | 说明 |
|------|------|
| `pnpm dev` | **推荐**：启动前端 + API 服务 |
| `pnpm dev:web` | 仅启动前端（AI 不可用，仅供 UI 调试） |
| `pnpm dev:pdf` | 仅启动 API 服务 |
| `pnpm build` | 构建前端静态资源 |
| `pnpm preview` | 预览构建产物 |
| `pnpm lint` | 全仓库 lint |
| `pnpm --filter pdf-server db:generate` | 修改 schema 后生成 migration |
| `pnpm --filter pdf-server db:migrate` | 执行 migration |
| `pnpm --filter pdf-server db:studio` | 打开 Drizzle Studio |

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DEEPSEEK_API_KEY` | — | **必填**，DeepSeek API Key（别名 `OPENAI_API_KEY`） |
| `DEEPSEEK_MODEL` | `deepseek-chat` | 模型名称 |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` | API 端点 |
| `PDF_PORT` | `3001` | API 服务端口 |
| `DATABASE_PATH` | `./data/md-resume.db` | SQLite 数据库文件路径 |
| `VITE_PDF_MODE` | `client` | `client` = 浏览器打印；`server` = Puppeteer 一键下载 |
| `VITE_PDF_API_URL` | `/api/export-pdf` | 生产环境 PDF API 地址 |
| `VITE_AI_API_URL` | `/api/ai-check` | 生产环境 AI API 地址 |

## 部署

生产环境需**分离部署**前端静态资源与 API 服务：

1. 构建前端：`pnpm build` → 部署 `apps/web/dist/`
2. 部署 API 服务：运行 `apps/pdf-server`（需 `DEEPSEEK_API_KEY`）
3. 前端环境变量指向 API 域名（`VITE_AI_API_URL`、`VITE_PDF_API_URL`）

## AI 检查用法

- 工具栏 **AI 检查选区 (N 字)** / **AI 检查全文**：有选区时检查选区，否则检查全文
- 编辑器内**选中文字后右键** →「AI 检查选区」
- 检查前会显示范围确认；结果按错误 / 格式 / 建议 / 亮点分类展示
- 每条建议可「复制」或「替换」（当 AI 给出原文与建议时）

## 可选：Puppeteer 服务端 PDF

如需一键下载 PDF 文件（无需打印对话框）：

```bash
PDF_SERVER=1 pnpm install   # 首次安装 Chrome
VITE_PDF_MODE=server pnpm dev
```

Linux 服务端建议安装中文字体：

```bash
sudo apt install fonts-noto-cjk
```

若 Puppeteer 不可用，会自动降级为浏览器打印。

## Markdown 写法

```markdown
# 姓名

**邮箱:** xxx@email.com · **电话:** 138xxxx · **GitHub:** github.com/xxx

## 工作经历

### 公司名 · 职位
*2022.03 – 至今*

- 负责 xxx，带来 yyy 结果
```

- `#` 姓名标题
- `##` 分节（工作经历、教育经历等）
- `###` 条目标题（公司 · 职位）
- `*斜体*` 日期行

## 项目结构

```
md-resume/
├── apps/
│   ├── web/                # React 前端（Vite）
│   │   ├── public/templates/   # 默认简历模板
│   │   └── src/
│   │       ├── components/     # 编辑器、预览、工具栏、AI 弹窗
│   │       ├── hooks/          # AI 检查逻辑
│   │       ├── lib/            # Markdown、存储、PDF、AI API
│   │       └── styles/         # 布局与简历排版 CSS
│   └── pdf-server/         # API 服务（AI 检查 + 可选 PDF）
├── .env.example
├── pnpm-workspace.yaml
└── package.json
```

## 常见问题

**AI 检查按钮不可用？**

确认 API 服务已启动且 `.env` 中已配置 `DEEPSEEK_API_KEY`。页面顶部若显示「后端未连接」横幅，请使用 `pnpm dev` 而非 `pnpm dev:web`。

**如何导出 PDF？**

默认点击「导出 PDF」，在打印对话框中选择「另存为 PDF」。设置 `VITE_PDF_MODE=server` 可一键下载。

**Puppeteer 导出失败？**

1. 确认 API 服务已启动
2. Linux 安装 Chromium 与中文字体依赖

服务不可用时会自动降级为浏览器打印。

## todo

- [ ] 自定义简历样式
- [ ] 文档管理列表
- [ ] electron 封装
