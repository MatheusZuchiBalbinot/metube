;(function () {
    var mode  = localStorage.getItem('theme-mode')  || 'dark';
    var color = localStorage.getItem('theme-color') || 'violet';
    document.documentElement.dataset.mode  = mode;
    document.documentElement.dataset.color = color;
})();
