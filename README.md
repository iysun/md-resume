# MD 简历编辑器

用 Markdown 编写简历，浏览器实时预览 HTML 排版，导出 PDF。

## 功能

- 左侧 Markdown 编辑，右侧实时 HTML 预览（300ms 防抖）
- 内容自动保存到浏览器 localStorage
- 导出 PDF（默认浏览器打印，无需后端）
- 导入 / 导出 `.md` 文件

## 环境要求

- Node.js 18+
- pnpm

## 安装与运行

```bash
cd md-resume
pnpm install
pnpm dev:web
```

浏览器打开终端显示的地址（默认 [http://localhost:5173](http://localhost:5173)）。

**默认无需启动后端**，`pnpm dev:web` 即可完整使用所有功能。点击「导出 PDF」会打开浏览器打印对话框，选择「另存为 PDF」即可保存。

## 纯静态部署

```bash
pnpm build
```

将 `apps/web/dist/` 目录部署到任意静态托管（Nginx、GitHub Pages 等），无需 PDF 服务。

## 脚本

| 命令 | 说明 |
|------|------|
| `pnpm dev:web` | 启动前端（推荐，功能完整） |
| `pnpm dev` | 启动前端 + 可选 PDF 服务 |
| `pnpm dev:pdf` | 仅启动 Puppeteer PDF 服务 |
| `pnpm build` | 构建前端静态资源 |
| `pnpm preview` | 预览构建产物 |
| `pnpm lint` | 全仓库 lint |

## 可选：Puppeteer 服务端 PDF

如需一键下载 PDF 文件（无需打印对话框），可启用 Puppeteer 后端：

1. 安装 Chrome（首次）：

```bash
PDF_SERVER=1 pnpm install
# 或手动：
PUPPETEER_CACHE_DIR=$HOME/.cache/puppeteer npx puppeteer browsers install chrome
```

2. 设置环境变量并启动：

```bash
VITE_PDF_MODE=server pnpm dev
```

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VITE_PDF_MODE` | `client` | `client` = 浏览器打印；`server` = Puppeteer 一键下载 |
| `VITE_PDF_API_URL` | `/api/export-pdf` | 生产环境自定义 API 地址 |
| `PDF_SERVER` | — | 设为 `1` 时 `pnpm install` 会下载 Puppeteer Chrome |

Linux 服务端建议安装中文字体：

```bash
sudo apt install fonts-noto-cjk
```

若 Puppeteer 服务不可用，会自动降级为浏览器打印。

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
│   │       ├── components/     # 编辑器、预览、工具栏
│   │       ├── lib/            # Markdown 解析、存储、PDF
│   │       └── styles/         # 布局与简历排版 CSS
│   └── pdf-server/         # 可选 Puppeteer PDF 服务
├── pnpm-workspace.yaml
└── package.json            # 根 orchestration 脚本
```

## 常见问题

**如何导出 PDF？**

默认模式下点击「导出 PDF」，在打印对话框中选择目标为「另存为 PDF」即可。矢量输出，排版与预览一致。

**想要一键下载 PDF 文件？**

设置 `VITE_PDF_MODE=server` 并启动 PDF 服务（`pnpm dev:pdf` 或 `pnpm dev`）。

**Puppeteer 导出失败？**

1. 确认 PDF 服务已启动
2. Linux 无头环境安装 Chromium 依赖：

```bash
sudo apt install -y chromium fonts-noto-cjk \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
  libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
  libgbm1 libasound2
```

服务不可用时会自动降级为浏览器打印。
