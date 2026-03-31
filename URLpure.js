// ==UserScript==
// @name         Bilibili URL Purifier (Performance Edition)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  在页面加载最初期重定向至无跟踪参数的URL，拒绝“先加载后清理”，性能极致优化版。
// @author       Sway
// @match        *://*.bilibili.com/*
// @run-at      document-start
// @grant       none
// ==/UserScript==

(function() {
    'use strict';

    // 1. 定义需要删除的参数列表 (使用 Set 实现 O(1) 查找速度)
    const uselessParams = new Set([
        'buvid', 'is_story_h5', 'launch_id', 'live_from', 'mid',
        'session_id', 'timestamp', 'up_id', 'vd_source', 'from_source',
        'from_spmid', 'seid', 'share_source', 'share_medium', 'share_plat',
        'share_tag', 'share_session_id', 'share_from', 'bbid', 'ts',
        'unique_k', 'rt', 'tdsourcetag', 'referfrom', 'visit_id',
        'bsource', 'hotRank', 'spm_id_from', 'msource', 'trackid',
        'plat_id', 'extra_jump_from', 'subarea_rank', 'popular_rank'
    ]);

    // 2. 正则匹配规则 (用于匹配 spm=, from= 等动态参数)
    const regexPatterns = [
        /^spm/,      // 匹配 spm_id_from, spm_id 等
        /^from/,     // 匹配 from_source, from 等
        /^share/,    // 匹配 share_source 等
    ];

    /**
     * 核心清理函数 (高性能版)
     * @param {string} urlStr 需要清理的URL
     * @returns {string|null} 返回清理后的URL，如果无需清理返回 null
     */
    function purify(urlStr) {
        try {
            const url = new URL(urlStr, location.href);
            // 如果没有参数，直接跳过
            if (!url.search) return null;

            const params = url.searchParams;
            const keys = Array.from(params.keys()); // 获取所有 key
            let changed = false;

            for (const key of keys) {
                let shouldDelete = false;

                // 优化点1：Set 查找极快
                if (uselessParams.has(key)) {
                    shouldDelete = true;
                } else {
                    // 优化点2：正则循环 (大部分情况走 Set 分支，这里执行频率低)
                    for (const reg of regexPatterns) {
                        if (reg.test(key)) {
                            shouldDelete = true;
                            break;
                        }
                    }
                }

                if (shouldDelete) {
                    params.delete(key);
                    changed = true;
                }
            }

            if (changed) {
                // 处理末尾多余的 ? 或者参数
                url.search = params.toString();
                return url.toString();
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    // ==========================================
    // 策略一：立即重定向
    // ==========================================
    // 这是解决“先加载后删除”的关键。
    // 我们在 document-start 阶段立即检测，如果发现脏URL，立刻 stop() 并 replace。
    const cleanUrl = purify(location.href);
    if (cleanUrl) {
        // 停止当前文档的加载和解析，释放资源
        window.stop();
        // 立即替换当前 URL，不会在历史记录留下痕迹
        location.replace(cleanUrl);
        // 终止后续脚本执行，因为页面即将重定向
        throw new Error("[URL Purifier] Redirecting to clean URL...");
    }

    // ==========================================
    // 策略二：拦截后续跳转
    // ==========================================
    // 如果页面是 SPA (单页应用) 内部跳转，上面的代码不会触发，需要 Hook History API。
    const nativePushState = history.pushState;
    history.pushState = function(state, unused, url) {
        const cleaned = purify(url);
        // 如果需要清理，传入清理后的 URL，否则原样传入
        return nativePushState.apply(this, [state, unused, cleaned || url]);
    };

    const nativeReplaceState = history.replaceState;
    history.replaceState = function(state, unused, url) {
        const cleaned = purify(url);
        return nativeReplaceState.apply(this, [state, unused, cleaned || url]);
    };

})();
