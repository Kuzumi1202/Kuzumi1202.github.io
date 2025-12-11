// 古文风雅 · 动态标题
var originalTitle = document.title;
var titleTimer;

document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // 君将离兮，殷殷相留
        document.title = '⇽ 客行远 · 待君还 ⇾';
        clearTimeout(titleTimer);
    } else {
        // 君既返兮，欣然相迎
        document.title = '⇾ 燕归来 · 喜迎君 ⇽';
        // 三息后复原（古时一息约3秒，此处取2秒）
        titleTimer = setTimeout(function() {
            document.title = originalTitle;
        }, 2000);
    }
});