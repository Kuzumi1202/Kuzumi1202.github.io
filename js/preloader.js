/* ==========================================================================
   preloader 真实加载进度
   --------------------------------------------------------------------------
   思路：
   1. 从 DOM 里收集所有静态资源 URL（link[rel=stylesheet] / script[src] / img[src]）
      加上文档本身，作为进度分母
   2. 用 performance.getEntriesByType('resource') 判断哪些已经加载完，作为分子
      —— 这是浏览器自己记录的真实加载完成项，不是"假装"的
   3. 资源全部完成之前最多显示到 94%，剩下的留给 window.onload 收尾，
      避免出现"进度 100% 了画面还在转"的尴尬
   4. 长时间没有新资源（比如就在等最后一个大图）时缓慢涓流，避免进度条卡死不动

   与主题脚本的配合：
   主题的 fullpage-loading.pug 会在 window.load 时立刻给 #loading-box 加 .loaded
   让遮罩瞬间消失。为了先让进度走到 100% 再退场，这里的 MutationObserver 会把
   这个"抢跑"的类名吞掉（微任务里同步移除，不会产生闪烁），等我们自己补到 100%
   并停留 240ms 后再放行。
   用户点击跳过时（模板上的 onclick）不拦截，保持"点一下就进去"。
   ========================================================================== */

;(function () {
  'use strict'

  if (!window.performance || !document.querySelector) return

  var MAX_WAIT = 9000 // 兜底：再慢也最多等 9 秒
  var CAP = 0.94 // 未触发 load 前的显示上限
  var box = null
  var percentEl = null
  var observer = null
  var timer = null

  var shown = 0.04
  var target = 0.04
  var lastAdvance = Date.now()
  var loadFired = false
  var userSkipped = false
  var swallow = false
  var done = false

  /* ---- 与主题抢跑类名的博弈 ---------------------------------------------- */

  function watchThemeShortcut() {
    if (!window.MutationObserver) return
    observer = new MutationObserver(function () {
      // 只吞掉"加载完成就立刻隐藏"的那一次；用户点击 / 我们自己收尾都放行
      if (!swallow || done || userSkipped) return
      if (box && box.classList.contains('loaded')) box.classList.remove('loaded')
    })
    observer.observe(box, { attributes: true, attributeFilter: ['class'] })
  }

  document.addEventListener(
    'click',
    function (e) {
      if (box && box.contains(e.target)) userSkipped = true
    },
    true
  )

  /* ---- 进度计算 ---------------------------------------------------------- */

  function collectUrls() {
    var list = document.querySelectorAll('link[rel="stylesheet"][href], script[src], img[src]')
    var seen = Object.create(null)
    var urls = []
    for (var i = 0; i < list.length; i++) {
      var el = list[i]
      var raw = el.href || el.src
      if (!raw) continue
      var abs
      try {
        abs = new URL(raw, location.href).href
      } catch (err) {
        continue
      }
      if (seen[abs]) continue
      seen[abs] = 1
      urls.push(abs)
    }
    return urls
  }

  function measure() {
    var urls = collectUrls()
    var entries = window.performance.getEntriesByType('resource')
    var loaded = Object.create(null)
    for (var i = 0; i < entries.length; i++) loaded[entries[i].name] = 1

    var doneCount = 1 // 文档自己
    for (var j = 0; j < urls.length; j++) if (loaded[urls[j]]) doneCount++

    var total = urls.length + 1
    return total > 0 ? doneCount / total : 1
  }

  /* ---- 渲染 -------------------------------------------------------------- */

  function render() {
    box.style.setProperty('--preloader-progress', shown.toFixed(4))
    if (percentEl) percentEl.textContent = Math.round(shown * 100) + '%'
  }

  function tick() {
    if (done) return
    if (userSkipped) {
      stop()
      return
    }

    var real = measure()
    var now = Date.now()

    if (loadFired) {
      target = 1
    } else if (real > target) {
      target = Math.min(real, CAP)
      lastAdvance = now
    } else if (now - lastAdvance > 350) {
      // 涓流：没新资源也别让进度条看起来卡死
      target = Math.min(CAP, target + 0.004)
    }

    shown += (target - shown) * 0.22
    if (shown > target) shown = target
    render()

    if (loadFired && shown > 0.985) finish()
  }

  function stop() {
    done = true
    if (timer) clearInterval(timer)
    timer = null
    if (observer) {
      observer.disconnect()
      observer = null
    }
  }

  function finish() {
    stop()
    shown = 1
    target = 1
    render()
    document.body.style.overflow = 'auto'

    // 100% 停在屏幕上 240ms，再开始淡出
    setTimeout(function () {
      swallow = false
      if (box) box.classList.add('loaded')
    }, 240)
  }

  /* ---- 启动 -------------------------------------------------------------- */

  function start() {
    box = document.getElementById('loading-box')
    if (!box) return

    document.documentElement.classList.add('preloader-js')

    var bg = box.querySelector('.loading-bg')
    if (bg && !box.querySelector('.preloader-percent')) {
      percentEl = document.createElement('span')
      percentEl.className = 'preloader-percent'
      percentEl.setAttribute('aria-hidden', 'true')
      bg.appendChild(percentEl)
    }

    // 页面已经加载完（脚本晚到）就不用演了
    if (document.readyState === 'complete') loadFired = true

    swallow = true
    watchThemeShortcut()
    render()

    timer = setInterval(tick, 100)

    window.addEventListener('load', function () {
      loadFired = true
    })

    setTimeout(function () {
      loadFired = true // 兜底
    }, MAX_WAIT)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start)
  } else {
    start()
  }
})()
