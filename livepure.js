// ==UserScript==
// @name         Bilibili 直播间极速原版 (净化URL)
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  极速跳转：停止当前页面加载并重定向至原版直播间，随后净化URL。无感切换，性能极致。
// @author       Sway
// @match        https://live.bilibili.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 获取路径，直接访问属性比 new URL 快
    const path = location.pathname;

    // 1. 检测普通直播间 (例如: /12345 或 /12345/)
    // 逻辑：以 / 开头，第二部分是纯数字
    const match = path.match(/^\/(\d+)\/?$/);

    if (match) {
        // 【核心优化】立即停止当前页面的一切加载（图片、CSS、JS请求）
        // 这样可以防止加载活动皮肤的大型资源，实现“秒跳”
        window.stop();

        // 构造新地址，保留查询参数 (如 ?spm_id_from=... 和 #锚点)
        const newUrl = '/blanc/' + match[1] + location.search + location.hash;

        // replace 跳转，不留下历史记录
        location.replace(newUrl);
    }
    // 2. 检测原版直播间 (例如: /blanc/12345)
    // 逻辑：路径包含 /blanc/
    else if (path.startsWith('/blanc/')) {
        // 页面加载完成后（或立即）修改 URL 显示
        // 这里使用字符串替换，性能优于正则
        const cleanUrl = location.href.replace('/blanc', '');

        // 仅修改地址栏显示，不刷新页面，不产生历史记录
        history.replaceState(null, '', cleanUrl);
    }
})();
