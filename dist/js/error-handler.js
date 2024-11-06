// 全局错误处理
window.onerror = function(msg, url, line, col, error) {
    console.error('全局错误:', { msg, url, line, col, error });
    return false;
}; 