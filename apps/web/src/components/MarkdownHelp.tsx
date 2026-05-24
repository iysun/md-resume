import { useState } from 'react'
import { dismissHelp, isHelpDismissed } from '../lib/storage'

const SYNTAX_ITEMS = [
  { syntax: '# 姓名', desc: '一级标题，作为简历姓名' },
  { syntax: '## 分节名', desc: '二级标题，如工作经历、教育经历' },
  { syntax: '### 公司 · 职位', desc: '三级标题，条目标题' },
  { syntax: '*2022.03 – 至今*', desc: '斜体行，紧接标题下方作为日期' },
  { syntax: '- 要点', desc: '无序列表，描述工作内容' },
]

interface MarkdownHelpProps {
  compact?: boolean
}

export function MarkdownHelp({ compact = false }: MarkdownHelpProps) {
  const [open, setOpen] = useState(!compact && !isHelpDismissed())
  const [collapsed, setCollapsed] = useState(compact ? true : isHelpDismissed())

  if (compact) {
    return (
      <div className="markdown-help-compact-wrap">
        <button
          type="button"
          className="markdown-help-toggle"
          onClick={() => setCollapsed((value) => !value)}
          aria-expanded={!collapsed}
          aria-label="Markdown 语法帮助"
        >
          ?
        </button>
        {!collapsed && (
          <div className="markdown-help markdown-help-popover">
            <div className="markdown-help-header">
              <strong>Markdown 速查</strong>
              <button type="button" onClick={() => setCollapsed(true)} aria-label="收起帮助">
                收起
              </button>
            </div>
            <ul className="markdown-help-list">
              {SYNTAX_ITEMS.map((item) => (
                <li key={item.syntax}>
                  <code>{item.syntax}</code>
                  <span>{item.desc}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  if (isHelpDismissed() && !open) return null

  return (
    <div className="markdown-help">
      <div className="markdown-help-header">
        <strong>Markdown 速查</strong>
        <div className="markdown-help-actions">
          <button
            type="button"
            onClick={() => {
              dismissHelp()
              setOpen(false)
            }}
          >
            不再显示
          </button>
        </div>
      </div>
      {open && (
        <ul className="markdown-help-list">
          {SYNTAX_ITEMS.map((item) => (
            <li key={item.syntax}>
              <code>{item.syntax}</code>
              <span>{item.desc}</span>
            </li>
          ))}
        </ul>
      )}
      {!open && (
        <button type="button" className="markdown-help-show" onClick={() => setOpen(true)}>
          展开语法说明
        </button>
      )}
    </div>
  )
}
