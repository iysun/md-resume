# MD 简历编辑器

用 Markdown 编写简历，浏览器实时预览 HTML 排版，一键导出 A4 PDF。

## 功能

- 左侧 Markdown 编辑，右侧实时 HTML 预览（300ms 防抖）
- 内容自动保存到浏览器 localStorage
- 一键导出 PDF（Puppeteer）
- 导入 / 导出 `.md` 文件
- 浏览器打印备用方案

## 环境要求

- Node.js 18+
- Linux 建议安装中文字体（PDF 中文显示）：

```bash
sudo apt install fonts-noto-cjk
```

## 安装与运行

```bash
cd md-resume
npm install
npm run dev
```

浏览器打开终端显示的地址（默认 [http://localhost:5173](http://localhost:5173)）。

`npm run dev` 会同时启动：

- Vite 前端（5173，被占用时自动换端口）
- PDF 导出服务（3001）

### 首次安装：下载 Puppeteer Chrome

`npm install` 会自动尝试下载 Chrome。若网络不通，可在终端开启代理后手动安装：

```bash
# zsh 用户（已有 set-proxy 函数）
set-proxy

# 或手动设置代理
export http_proxy=http://127.0.0.1:7890
export https_proxy=http://127.0.0.1:7890

# 清理损坏的缓存后重新安装
rm -rf $HOME/.cache/puppeteer/chrome
cd md-resume
PUPPETEER_CACHE_DIR=$HOME/.cache/puppeteer npx puppeteer browsers install chrome
```

安装成功后会输出 Chrome 可执行文件路径。

## 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动前端 + PDF 服务 |
| `npm run dev:web` | 仅启动 Vite |
| `npm run dev:pdf` | 仅启动 PDF 服务 |
| `npm run build` | 构建前端静态资源 |

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
├── public/templates/   # 默认简历模板
├── server/             # Puppeteer PDF 服务
└── src/
    ├── components/     # 编辑器、预览、工具栏
    ├── lib/            # Markdown 解析、存储、PDF
    └── styles/         # 布局与简历排版 CSS
```

## 常见问题

**导出 PDF 失败？**

1. 确认 PDF 服务已启动（`npm run dev` 或 `npm run dev:pdf`）
2. 首次导出 Puppeteer 需下载 Chromium，可能较慢
3. Linux 无头环境若报错，可尝试安装 Chromium 依赖：

```bash
sudo apt install -y chromium fonts-noto-cjk \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
  libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
  libgbm1 libasound2
```

**PDF 中文乱码？**

安装 `fonts-noto-cjk` 后重启 PDF 服务。
