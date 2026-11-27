/* 首页轮播初始化
   --------------------------------------------------------------------------
   相对插件原版的改动（目的只有一个：别整块空白）：
   1. Swiper 没加载成功时直接降级 —— 不执行任何隐藏逻辑，卡片退回静态首图；
   2. 封面图不再依赖主题懒加载：模板里是 1×1 透明 gif + data-lazy-src，
      懒加载没触发就永远透明，这里直接把真实地址写进 src；
   3. 只有 2 张幻灯片时关掉 loop —— Swiper 4 的 fade + loop 在 2 张时位移
      计算会错乱，激活卡飘到可视区外，表现就是只剩两个小圆点、内容全空；
   4. 初始化后补一次 update()，等字体/CSS 回流结束再校准尺寸；
   5. 去掉 mousewheel —— 轮播只有 200px 高却会吃掉整页滚轮，
      滚快了还会把 fade 卡在过渡态。
   ========================================================================== */

;(function () {
  'use strict'

  var container = document.getElementById('swiper_container')
  if (!container) return

  if (typeof Swiper === 'undefined') {
    console.warn('[swiper] Swiper 未加载，轮播降级为静态首图')
    return
  }

  // 1. 封面图：补齐真实地址，交给浏览器直接加载
  Array.prototype.forEach.call(container.querySelectorAll('img[data-lazy-src]'), function (img) {
    var real = img.getAttribute('data-lazy-src')
    if (!real) return
    img.setAttribute('src', real)
    img.removeAttribute('data-lazy-src')
  })

  var slides = container.querySelectorAll('.blog-slider__item')
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

  var swiper = new Swiper('.blog-slider', {
    passiveListeners: true,
    spaceBetween: 30,
    effect: 'fade',
    loop: slides.length > 2,
    speed: reducedMotion.matches ? 0 : 150,
    autoplay: reducedMotion.matches ? false : {
      disableOnInteraction: true,
      delay: 3000
    },
    pagination: {
      el: '.blog-slider__pagination',
      clickable: true
    },
    observer: true,
    observeParents: true,
    resizeObserver: true
  })

  window.swiper = swiper

  // 2. 就绪标记：CSS 里「先隐藏再淡入」只认这个类。
  //    JS 没跑起来时内容保持可见，永远不会出现空卡片。
  container.classList.add('is-ready')

  // 3. 字体 / 图片 / CSS 回流后重新量一次尺寸
  function refresh() {
    try {
      swiper.update()
    } catch (e) {}
  }
  window.addEventListener('load', function () {
    refresh()
    setTimeout(refresh, 300)
  })
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh)

  // 4. 鼠标停留在轮播上时暂停自动播放
  container.addEventListener('mouseenter', function () {
    if (swiper.autoplay) swiper.autoplay.stop()
  })
  container.addEventListener('mouseleave', function () {
    if (!reducedMotion.matches && swiper.autoplay) swiper.autoplay.start()
  })
  reducedMotion.addEventListener('change', function (event) {
    swiper.params.speed = event.matches ? 0 : 150
    if (event.matches && swiper.autoplay) swiper.autoplay.stop()
    if (!event.matches && swiper.autoplay) {
      swiper.params.autoplay = { disableOnInteraction: true, delay: 3000 }
      if (!container.matches(':hover')) swiper.autoplay.start()
    }
  })
})()
