// ==UserScript==
// @name         Bilibili URL Turbo Purifier (Fixed)
// @namespace    http://tampermonkey.net/
// @version      4.1
// @description  修复历史记录Hook失效问题，确保后续跳转也能彻底清理参数。
// @author       Sway
// @match        *://*.bilibili.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 1. 配置黑名单 (Set 查找复杂度 O(1)，性能最优)
    const uselessParams = new Set([
        'buvid', 'is_story_h5', 'launch_id', 'live_from', 'mid',
        'session_id', 'timestamp', 'up_id', 'vd_source', 'from_source',
        'from_spmid', 'seid', 'share_source', 'share_medium', 'share_plat',
        'share_tag', 'share_session_id', 'share_from', 'bbid', 'ts',
        'unique_k', 'rt', 'tdsourcetag', 'referfrom', 'visit_id',
        'bsource', 'hotRank', 'spm_id_from', 'msource', 'trackid',
        'plat_id', 'extra_jump_from', 'subarea_rank', 'popular_rank'
    ]);

    // 2. 预编译正则
    const regexPatterns = [/^spm/, /^from/, /^share/];

    /**
     * 核心清理函数
     * @param {string} urlStr 待清理的URL
     * @returns {string|null} 如果清理了返回新URL，否则返回 null
     */
    function purify(urlStr) {
        if (!urlStr) return null;
        try {
            const url = new URL(urlStr, location.href);
            if (!url.search) return null;

            const params = url.searchParams;
            const keysToDelete = [];

            // 收集需要删除的 Key
            for (const key of params.keys()) {
                if (uselessParams.has(key)) {
                    keysToDelete.push(key);
                } else {
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
                url.search = params.toString();
                return url.toString();
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    // ==========================================
    // 1. 初始化清理 (处理页面首次加载)
    // ==========================================
    const initialClean = purify(location.href);
    if (initialClean) {
        history.replaceState(history.state, '', initialClean);
    }

    // ==========================================
    // 2. Hook History API (处理后续跳转)
    // ==========================================

    const nativePushState = history.pushState;
    history.pushState = function(state, unused, url) {
        // 核心修复：计算清理后的 URL
        const cleaned = purify(url);
        
        // 如果清理成功，使用清理后的 URL；否则使用原 URL
        const finalUrl = cleaned || url;

        // 核心修复：使用 call 显式传递处理后的参数，不要使用 arguments
        return nativePushState.call(this, state, unused, finalUrl);
    };

    const nativeReplaceState = history.replaceState;
    history.replaceState = function(state, unused, url) {
        const cleaned = purify(url);
        const finalUrl = cleaned || url;
        return nativeReplaceState.call(this, state, unused, finalUrl);
    };

})();
