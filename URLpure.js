// ==UserScript==
// @name         Bilibili URL Pure Load (Zero Latency)
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  不阻塞、不重定向。在页面加载的同时瞬间静默替换地址栏参数，性能损耗几乎为0。
// @author       Sway
// @match        *://*.bilibili.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 1. 参数黑名单 (使用 Set 实现 O(1) 极速查找)
    const uselessParams = new Set([
        'buvid', 'is_story_h5', 'launch_id', 'live_from', 'mid',
        'session_id', 'timestamp', 'up_id', 'vd_source', 'from_source',
        'from_spmid', 'seid', 'share_source', 'share_medium', 'share_plat',
        'share_tag', 'share_session_id', 'share_from', 'bbid', 'ts',
        'unique_k', 'rt', 'tdsourcetag', 'referfrom', 'visit_id',
        'bsource', 'hotRank', 'spm_id_from', 'msource', 'trackid',
        'plat_id', 'extra_jump_from', 'subarea_rank', 'popular_rank'
    ]);

    // 正则匹配 (处理 spm=, from= 等同类参数)
    const regexPatterns = [/^spm/, /^from/, /^share/];

    /**
     * 核心清理函数 (纯计算，无DOM操作，微秒级耗时)
     */
    function purify(urlStr) {
        try {
            const url = new URL(urlStr, location.href);
            if (!url.search) return null;

            const params = url.searchParams;
            // 使用 keys() 快速遍历，避免 toString() 产生额外开销
            const keys = Array.from(params.keys());
            let changed = false;

            for (const key of keys) {
                // 优先使用 Set 查找 (最快)
                if (uselessParams.has(key)) {
                    params.delete(key);
                    changed = true;
                } else {
                    // 其次使用正则
                    for (const reg of regexPatterns) {
                        if (reg.test(key)) {
                            params.delete(key);
                            changed = true;
                            break;
                        }
                    }
                }
            }

            if (changed) {
                url.search = params.toString();
                return url.toString();
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    // ==========================================
    // 核心逻辑：同步静默替换
    // ==========================================

    // 立即执行，此时 DOM 尚未解析，HTML 正在下载中
    const cleanUrl = purify(location.href);
    if (cleanUrl) {
        // 关键点：使用 replaceState 而不是 location.replace
        // 效果：当前页面继续加载，不会中断，但地址栏和历史记录瞬间被替换
        // 性能：零网络开销，仅消耗微小的 CPU 时间
        history.replaceState(history.state, '', cleanUrl);
    }

    // ==========================================
    // 拦截后续跳转
    // ==========================================
    const nativePushState = history.pushState;
    history.pushState = function(state, unused, url) {
        const cleaned = purify(url);
        // 直接修改参数，传入干净的 URL
        return nativePushState.apply(this, [state, unused, cleaned || url]);
    };

    const nativeReplaceState = history.replaceState;
    history.replaceState = function(state, unused, url) {
        const cleaned = purify(url);
        return nativeReplaceState.apply(this, [state, unused, cleaned || url]);
    };

})();
