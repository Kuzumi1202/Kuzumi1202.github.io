// 动态标题：离开 / 返回时切换浏览器标签标题

var hiddenTitle = '404 · 你离开了';
var visibleTitle = '200 · 欢迎回来';

var originalTitle = document.title;
var titleTimer;

document.addEventListener('visibilitychange', function () {
  if (document.hidden) {
    document.title = hiddenTitle;
    clearTimeout(titleTimer);
  } else {
    document.title = visibleTitle;
    titleTimer = setTimeout(function () {
      document.title = originalTitle;
    }, 2000);
  }
});