/* ==========================================================================
   Mermaid 流程图（自托管 + 按需加载）
   --------------------------------------------------------------------------
   为什么不用主题自带的 mermaid 支持：
   主题的钩子找的是 `pre > code.mermaid`，而本站 syntax_highlighter = highlight.js，
   围栏代码会被 Hexo 转成 <figure class="highlight plaintext">…<span class="line">，
   类名直接丢失，主题那个钩子永远匹配不到。

   这里改为「按首行关键字识别」：只要代码块第一行是 flowchart / graph / sequenceDiagram
   等图表关键字，就当作 mermaid 源码渲染。这样文章里写 ```mermaid 就够了，
   不会因为 Hexo 把语言类名抹成 plaintext 而失效。

   2.5MB 的 mermaid 只在「页面确实有图表」时才加载，其余页面零成本。
   ========================================================================== */

;(function () {
  const LIB = '/js/libs/mermaid.min.js'

  // 图表类型白名单（mermaid 各类图的首行关键字）
  const DIAGRAM_RE =
    /^\s*(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram(-v2)?|erDiagram|journey|gantt|pie|mindmap|timeline|quadrantChart|gitGraph|C4Context|sankey-beta|xychart-beta|block-beta)\b/

  // 取源码：Hexo 的 highlight 输出里每一行是一个 .line 元素、行间靠 <br>，直接取 textContent 会粘成一行；
  // 注意 gutter（行号栏）的数字 span 也叫 .line，必须限定在 .code 列里，否则源码前面会多出一串行号
  const getSource = (el) => {
    if (el.matches('pre.mermaid, div.mermaid')) return el.textContent || ''
    const lines = el.querySelectorAll('.code pre .line')
    if (lines.length) {
      return Array.from(lines, (line) => line.textContent).join('\n')
    }
    const pre = el.querySelector('pre')
    return pre ? pre.textContent : ''
  }

  const collect = () =>
    Array.from(
      document.querySelectorAll(
        '#article-container figure.highlight, #article-container pre.mermaid, #article-container div.mermaid'
      )
    )
      .map((el) => ({ el, src: getSource(el).trim() }))
      .filter(({ el, src }) => el.matches('pre.mermaid, div.mermaid') || DIAGRAM_RE.test(src))

  let libPromise = null
  const loadLib = () => {
    if (!libPromise) {
      libPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script')
        s.src = LIB
        s.async = true
        s.onload = resolve
        s.onerror = () => reject(new Error('mermaid.min.js 加载失败'))
        document.head.appendChild(s)
      })
    }
    return libPromise
  }

  // 配色对齐站点极简红黑：节点中性黑底、灰色描边、文字灰白，连线低调
  const setup = () => {
    window.mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      securityLevel: 'strict',
      fontFamily: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
      themeVariables: {
        darkMode: true,
        background: 'transparent',
        fontSize: '14px',
        primaryColor: '#111111',
        primaryTextColor: '#e8e8e8',
        primaryBorderColor: '#666666',
        secondaryColor: '#1a1a1a',
        secondaryTextColor: '#e8e8e8',
        secondaryBorderColor: 'rgba(255,255,255,0.18)',
        tertiaryColor: '#111111',
        tertiaryTextColor: '#e8e8e8',
        tertiaryBorderColor: 'rgba(255,255,255,0.14)',
        textColor: '#e8e8e8',
        lineColor: '#999999',
        edgeLabelBackground: '#111111',
        clusterBkg: 'rgba(255,255,255,0.02)',
        clusterBorder: 'rgba(255,255,255,0.08)',
        actorBkg: '#111111',
        actorBorder: '#666666',
        actorTextColor: '#e8e8e8',
        signalColor: '#999999',
        labelBoxBkgColor: '#111111',
        noteBkgColor: '#1a1a1a',
        noteTextColor: '#e8e8e8'
      },
      flowchart: { curve: 'basis', padding: 14, nodeSpacing: 40, rankSpacing: 40, useMaxWidth: true }
    })
  }

  const render = async () => {
    const items = collect()
    if (!items.length) return
    try {
      await loadLib()
    } catch (e) {
      console.warn('[mermaid] 脚本加载失败，保留原始代码块：', e)
      return
    }
    setup()

    for (let i = 0; i < items.length; i++) {
      const { el, src } = items[i]
      const id = 'mermaid-' + i + '-' + Math.random().toString(36).slice(2, 7)
      try {
        const { svg } = await window.mermaid.render(id, src)
        const wrap = document.createElement('div')
        wrap.className = 'mermaid-wrap'
        wrap.innerHTML = svg
        el.replaceWith(wrap)
      } catch (e) {
        // 语法错误时保留原始代码块，读者仍能看到内容
        console.warn('[mermaid] 渲染失败：', e)
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render)
  } else {
    render()
  }
})()
