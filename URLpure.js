// ==UserScript==
// @name         Bilibili URL Turbo Purifier
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  极致性能优化版。在加载初期静默替换URL，不中断网络请求，不监听DOM，零性能损耗。
// @author       Sway
// @match        *://*.bilibili.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 1. 配置黑名单 (使用 Set 实现 O(1) 查找，速度最快)
    const uselessParams = new Set([
        'buvid', 'is_story_h5', 'launch_id', 'live_from', 'mid',
        'session_id', 'timestamp', 'up_id', 'vd_source', 'from_source',
        'from_spmid', 'seid', 'share_source', 'share_medium', 'share_plat',
        'share_tag', 'share_session_id', 'share_from', 'bbid', 'ts',
        'unique_k', 'rt', 'tdsourcetag', 'referfrom', 'visit_id',
        'bsource', 'hotRank', 'spm_id_from', 'msource', 'trackid',
        'plat_id', 'extra_jump_from', 'subarea_rank', 'popular_rank'
    ]);

    // 2. 预编译正则 (避免在循环中重复编译，提升V8引擎效率)
    const regexPatterns = [/^spm/, /^from/, /^share/];

    /**
     * 核心清理函数 (高性能实现)
     * @param {string} urlStr
     * @returns {string|null} 返回清理后的URL，无变化则返回null
     */
    function purify(urlStr) {
        try {
            const url = new URL(urlStr, location.href);
            // 快速跳过：如果没有参数，直接返回
            if (!url.search) return null;

            const params = url.searchParams;
            // 性能点：直接遍历迭代器，不需要转数组
            // 删除操作是原地修改，因此需要先收集要删除的键
            const keysToDelete = [];

            for (const key of params.keys()) {
                if (uselessParams.has(key)) {
                    keysToDelete.push(key);
                } else {
                    // 仅在 Set 未命中时检查正则
                    for (const reg of regexPatterns) {
                        if (reg.test(key)) {
                            keysToDelete.push(key);
                            break;
                        }
                    }
                }
            }

            if (keysToDelete.length) {
                keysToDelete.forEach(key => params.delete(key));
                // 重新赋值 search 会自动更新 queryString
                url.search = params.toString();
                return url.toString();
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    // ==========================================
    // 核心逻辑：立即执行 (同步)
    // ==========================================

    // 1. 清理当前页面
    // 此时 DOM 尚未开始解析，浏览器正在建立连接或接收头部
    const cleanUrl = purify(location.href);
    if (cleanUrl) {
        // 使用 replaceState 静默修改地址栏和历史记录
        // 不会触发页面刷新，不会中断加载，视觉上无感知
        history.replaceState(history.state, '', cleanUrl);
    }

    // ==========================================
    // 拦截后续跳转
    // ==========================================

    // 2. Hook pushState (拦截路由跳转)
    const nativePushState = history.pushState;
    history.pushState = function(state, unused, url) {
        // 仅在 url 存在时处理
        if (url) {
            const cleaned = purify(url);
            if (cleaned) url = cleaned;
        }
        return nativePushState.apply(this, arguments);
    };

    // 3. Hook replaceState (拦截路由替换)
    const nativeReplaceState = history.replaceState;
    history.replaceState = function(state, unused, url) {
        if (url) {
            const cleaned = purify(url);
            if (cleaned) url = cleaned;
        }
        return nativeReplaceState.apply(this, arguments);
    };

})();
