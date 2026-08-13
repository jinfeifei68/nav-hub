// ============================================================
// NavHub · 数据管理层
// 统一管理：站点、分类、布局、颜色、内容设置
// 存储策略：localStorage（默认）→ 可切换为远程 API（部署用）
// ============================================================

// ---------- 远程 API 配置（Cloudflare 部署时启用） ----------
const DATA_SOURCE = 'api';            // 'local' 本地存储 | 'api' 云端接口
const API_BASE_URL = '';              // 同域部署留空（相对路径 /api/nav）
const API_ADMIN_KEY = 'feige666'; // 保存接口密钥，必须与 Cloudflare 环境变量 ADMIN_KEY 一致

// ---------- 默认配置（首次使用/重置时写入） ----------
const DEFAULT_SETTINGS = {
    logoText: "NavHub",
    logoIcon: {                  // 顶部导航 Logo 图标配置
        type: 'default',         // 'default' | 'emoji' | 'image'
        emoji: '🚀',             // type=emoji 时显示的字符
        image: ''                // type=image 时的图片 URL
    },
    siteTitle: "发现优质资源",
    siteSubtitle: "精选站点 · 即搜即达",
    footerText: "NavHub © 2026 · 精选导航 · 持续更新中",
    accentColor: "#6366f1",      // 主色
    accentColor2: "#8b5cf6",     // 渐变辅色
    blobColor1: "#6366f1",       // 背景光斑1
    blobColor2: "#ec4899",       // 背景光斑2
    blobColor3: "#06b6d4",       // 背景光斑3
    gridMinWidth: 200,           // 卡片最小宽度(px)
    gridGap: 16,                 // 卡片间距(px)
    cardPadding: 16,             // 卡片内边距(px)
    cardRadius: 14,              // 卡片圆角(px)
    cardMinHeight: 0,            // 卡片最小高度(px, 0=自动)
    cardOpacity: 100,            // 卡片背景透明度(%, 100=完全不透明)
    showDesc: true,              // 是否显示描述文字
    faviconService: 'faviconim', // 站点图标识别服务: 'faviconim'|'google'|'yandex'|'direct'|'none': 'dnspod'|'google'|'duckduckgo'|'yandex'|'direct'|'none'
    backgroundImage: {           // 网站背景图配置
        enabled: false,          // 是否启用背景图
        url: '',                 // 背景图片地址
        opacity: 0.9,            // 背景图不透明度 (0-1)
        blur: 0,                 // 背景图模糊 (px)
        overlayColor: '',        // 遮罩颜色（空 = 跟随主题背景色）
        overlayOpacity: 0.55     // 遮罩强度 (0-1)
    }
};

const DEFAULT_CATEGORIES = [
    { id: "dev",    name: "开发工具", emoji: "🛠️" },
    { id: "design", name: "设计资源", emoji: "🎨" },
    { id: "ai",     name: "AI 智能", emoji: "🤖" },
    { id: "social", name: "社交社区", emoji: "💬" },
    { id: "media",  name: "影视娱乐", emoji: "🎬" },
    { id: "news",   name: "新闻资讯", emoji: "📰" },
    { id: "learn",  name: "学习平台", emoji: "📚" },
    { id: "tools",  name: "效率工具", emoji: "⚡" }
];

const DEFAULT_SITES = [
    // ----- 开发工具 -----
    { name: "GitHub", url: "https://github.com", desc: "全球最大代码托管平台", category: "dev", color: "#24292e", icon: "G" },
    { name: "Stack Overflow", url: "https://stackoverflow.com", desc: "开发者问答社区", category: "dev", color: "#f48024", icon: "S" },
    { name: "MDN Web Docs", url: "https://developer.mozilla.org", desc: "Web 开发权威文档", category: "dev", color: "#000000", icon: "M" },
    { name: "CodePen", url: "https://codepen.io", desc: "在线代码编辑与分享", category: "dev", color: "#000000", icon: "C" },
    { name: "npm", url: "https://www.npmjs.com", desc: "Node 包管理器", category: "dev", color: "#cb3837", icon: "n" },
    { name: "Vite", url: "https://vitejs.dev", desc: "下一代前端构建工具", category: "dev", color: "#646cff", icon: "V" },
    { name: "Regex101", url: "https://regex101.com", desc: "正则表达式在线测试", category: "dev", color: "#5b6e8c", icon: "R" },
    { name: "Can I Use", url: "https://caniuse.com", desc: "浏览器兼容性查询", category: "dev", color: "#23a36a", icon: "C" },

    // ----- 设计资源 -----
    { name: "Dribbble", url: "https://dribbble.com", desc: "设计师灵感作品社区", category: "design", color: "#ea4c89", icon: "D" },
    { name: "Behance", url: "https://www.behance.net", desc: "Adobe 创意作品展示", category: "design", color: "#1769ff", icon: "B" },
    { name: "Figma", url: "https://www.figma.com", desc: "协同设计工具", category: "design", color: "#f24e1e", icon: "F" },
    { name: "Coolors", url: "https://coolors.co", desc: "配色方案生成器", category: "design", color: "#7209b7", icon: "C" },
    { name: "Unsplash", url: "https://unsplash.com", desc: "免费高清图片素材", category: "design", color: "#000000", icon: "U" },
    { name: "Iconfont", url: "https://www.iconfont.cn", desc: "阿里巴巴矢量图标库", category: "design", color: "#165dff", icon: "I" },
    { name: "Lucide Icons", url: "https://lucide.dev", desc: "精美的开源图标集", category: "design", color: "#f59e0b", icon: "L" },
    { name: "Google Fonts", url: "https://fonts.google.com", desc: "免费字体库", category: "design", color: "#4285f4", icon: "G" },

    // ----- AI 智能 -----
    { name: "ChatGPT", url: "https://chat.openai.com", desc: "OpenAI 智能对话助手", category: "ai", color: "#10a37f", icon: "C" },
    { name: "Claude", url: "https://claude.ai", desc: "Anthropic AI 助手", category: "ai", color: "#d97757", icon: "C" },
    { name: "Gemini", url: "https://gemini.google.com", desc: "Google AI 多模态助手", category: "ai", color: "#4285f4", icon: "G" },
    { name: "Midjourney", url: "https://www.midjourney.com", desc: "AI 图像生成", category: "ai", color: "#1a1a1a", icon: "M" },
    { name: "Hugging Face", url: "https://huggingface.co", desc: "开源模型中心", category: "ai", color: "#ff9d00", icon: "H" },
    { name: "Poe", url: "https://poe.com", desc: "多模型 AI 聚合平台", category: "ai", color: "#570df8", icon: "P" },

    // ----- 社交社区 -----
    { name: "微博", url: "https://weibo.com", desc: "中文社交媒体平台", category: "social", color: "#e6162d", icon: "W" },
    { name: "知乎", url: "https://www.zhihu.com", desc: "高质量问答社区", category: "social", color: "#0084ff", icon: "Z" },
    { name: "哔哩哔哩", url: "https://www.bilibili.com", desc: "年轻文化视频社区", category: "social", color: "#fb7299", icon: "B" },
    { name: "小红书", url: "https://www.xiaohongshu.com", desc: "生活分享社交平台", category: "social", color: "#ff2741", icon: "R" },
    { name: "Reddit", url: "https://www.reddit.com", desc: "全球热门讨论社区", category: "social", color: "#ff4500", icon: "R" },
    { name: "X (Twitter)", url: "https://x.com", desc: "实时信息社交网络", category: "social", color: "#000000", icon: "X" },

    // ----- 影视娱乐 -----
    { name: "YouTube", url: "https://www.youtube.com", desc: "全球最大视频平台", category: "media", color: "#ff0000", icon: "Y" },
    { name: "Netflix", url: "https://www.netflix.com", desc: "全球流媒体巨头", category: "media", color: "#e50914", icon: "N" },
    { name: "爱奇艺", url: "https://www.iqiyi.com", desc: "在线视频平台", category: "media", color: "#00be06", icon: "i" },
    { name: "优酷", url: "https://www.youku.com", desc: "阿里巴巴视频平台", category: "media", color: "#1989fa", icon: "Y" },
    { name: "腾讯视频", url: "https://v.qq.com", desc: "海量影视综艺内容", category: "media", color: "#ff6022", icon: "T" },
    { name: "Spotify", url: "https://www.spotify.com", desc: "音乐流媒体平台", category: "media", color: "#1db954", icon: "S" },

    // ----- 新闻资讯 -----
    { name: "36氪", url: "https://36kr.com", desc: "科技商业资讯", category: "news", color: "#36c3ff", icon: "3" },
    { name: "虎嗅", url: "https://www.huxiu.com", desc: "商业科技深度报道", category: "news", color: "#e83828", icon: "H" },
    { name: "少数派", url: "https://sspai.com", desc: "高品质数字消费指南", category: "news", color: "#d33a2a", icon: "s" },
    { name: "Hacker News", url: "https://news.ycombinator.com", desc: "技术圈热门资讯", category: "news", color: "#ff6600", icon: "H" },
    { name: "V2EX", url: "https://www.v2ex.com", desc: "创意工作者社区", category: "news", color: "#333333", icon: "V" },
    { name: "TechCrunch", url: "https://techcrunch.com", desc: "科技创业新闻", category: "news", color: "#0a9648", icon: "T" },

    // ----- 学习平台 -----
    { name: "Coursera", url: "https://www.coursera.org", desc: "世界名校在线课程", category: "learn", color: "#0056d2", icon: "C" },
    { name: "freeCodeCamp", url: "https://www.freecodecamp.org", desc: "免费编程学习", category: "learn", color: "#0a0a23", icon: "f" },
    { name: "LeetCode", url: "https://leetcode.cn", desc: "算法刷题平台", category: "learn", color: "#ffa116", icon: "L" },
    { name: "Khan Academy", url: "https://www.khanacademy.org", desc: "免费在线教育平台", category: "learn", color: "#14bf96", icon: "K" },
    { name: "MDN Learn", url: "https://developer.mozilla.org/zh-CN/docs/Learn", desc: "Web 开发入门教程", category: "learn", color: "#000000", icon: "M" },
    { name: "中国大学MOOC", url: "https://www.icourse163.org", desc: "名校课程在线学习", category: "learn", color: "#c93756", icon: "M" },

    // ----- 效率工具 -----
    { name: "Notion", url: "https://www.notion.so", desc: "一体化工作空间", category: "tools", color: "#000000", icon: "N" },
    { name: "语雀", url: "https://www.yuque.com", desc: "蚂蚁集团知识管理", category: "tools", color: "#25b864", icon: "Y" },
    { name: "飞书", url: "https://www.feishu.cn", desc: "企业协同办公套件", category: "tools", color: "#3370ff", icon: "F" },
    { name: "Wolfram Alpha", url: "https://www.wolframalpha.com", desc: "计算知识引擎", category: "tools", color: "#dd1100", icon: "W" },
    { name: "TinyPNG", url: "https://tinypng.com", desc: "图片压缩工具", category: "tools", color: "#0094d9", icon: "T" },
    { name: "removebg", url: "https://www.remove.bg", desc: "AI 一键去背景", category: "tools", color: "#5e26ff", icon: "R" }
];

// ---------- 搜索引擎配置（静态常量） ----------
const searchEngines = {
    google: "https://www.google.com/search?q=",
    bing: "https://www.bing.com/search?q=",
    baidu: "https://www.baidu.com/s?wd=",
    github: "https://github.com/search?q="
};

// ---------- Favicon 图标识别服务 ----------
// 说明：经实测，favicon.im 返回真实 SVG 图标且国内可访问，设为默认推荐；
// google/duckduckgo 等海外服务在国内网络不可达，仅供海外部署时选用。
// 无论选哪个服务，前端都有「主服务 → 网站自身 favicon.ico → 字母图标」三级回退。
const FAVICON_SERVICES = {
    faviconim:  { label: 'Favicon.im 智能代理 (推荐)', build: d => `https://favicon.im/${d}?larger=true` },
    yandex:     { label: 'Yandex', build: d => `https://favicon.yandex.net/favicon/v2/${d}` },
    google:     { label: 'Google Favicon (海外)', build: d => `https://www.google.com/s2/favicons?domain=${d}&sz=64` },
    direct:     { label: '网站自身 favicon.ico', build: d => `https://${d}/favicon.ico` },
    none:       { label: '不使用自动识别（全部用字母图标）', build: null }
};

// ---------- 通用 HTML 转义 ----------
function _escHtml(s) {
    return String(s === undefined || s === null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ---------- 从 URL 提取域名 ----------
function getDomain(url) {
    try {
        const u = new URL(String(url || '').trim().startsWith('http')
            ? String(url).trim()
            : 'https://' + String(url).trim());
        return u.hostname.replace(/^www\./, '');
    } catch (e) {
        const m = String(url || '').match(/^https?:\/\/([^/]+)/i);
        return m ? m[1].replace(/^www\./, '') : '';
    }
}

// ---------- 获取站点的自动 Favicon 地址 ----------
function getFaviconUrl(site) {
    if (!site || !site.url) return '';
    const svc = (NavData.getSettings().faviconService) || 'faviconim';
    const conf = FAVICON_SERVICES[svc];
    if (!conf || !conf.build) return '';
    const domain = getDomain(site.url);
    if (!domain) return '';
    return conf.build(domain);
}

// ---------- 生成图标 HTML（自动识别 + 失败回退字母） ----------
// cls: 容器类名（前端 'site-favicon'，后台 'site-manage-favicon'）
function buildFaviconHtml(site, cls) {
    cls = cls || 'site-favicon';
    const color = site.color || '#6366f1';
    const letter = site.icon || (site.name ? site.name.charAt(0).toUpperCase() : '?');
    // autoIcon 未设置时默认自动识别
    const useAuto = site.autoIcon !== false;
    const favUrl = useAuto ? getFaviconUrl(site) : '';
    const domain = useAuto ? getDomain(site.url) : '';

    if (favUrl && domain) {
        // 第一服务失败 → 回退网站自身 favicon.ico → 再失败显示字母
        const direct = `https://${domain}/favicon.ico`;
        return `<div class="${cls}" style="background:${_escHtml(color)};">
            <img src="${_escHtml(favUrl)}" alt="" class="favicon-img" loading="lazy" referrerpolicy="no-referrer"
                 onerror="if(!this.dataset.r){this.dataset.r='1';this.src='${_escHtml(direct)}';}else{this.classList.add('failed');}">
            <span class="favicon-letter">${_escHtml(letter)}</span>
        </div>`;
    }
    return `<div class="${cls}" style="background:${_escHtml(color)};"><span>${_escHtml(letter)}</span></div>`;
}

// ---------- 存储键 ----------
const STORAGE_KEY = 'navhub_data_v2';
const AUTH_KEY = 'navhub_admin_authed';

// ============================================================
// 数据管理器
// ============================================================
const NavData = (function () {

    // ----- 内部状态 -----
    let state = null;

    // ----- 默认完整数据结构 -----
    function getDefaultData() {
        return {
            version: 2,
            settings: { ...DEFAULT_SETTINGS },
            categories: DEFAULT_CATEGORIES.map(c => ({ ...c })),
            sites: DEFAULT_SITES.map(s => ({ ...s }))
        };
    }

    // ----- 本地存储读写 -----
    function loadFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return null;
            return parsed;
        } catch (e) {
            console.warn('[NavData] 本地数据解析失败，使用默认数据', e);
            return null;
        }
    }

    function saveToStorage(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('[NavData] 保存失败', e);
            return false;
        }
    }

    // ----- 合并默认值（防止新字段缺失） -----
    function mergeDefaults(data) {
        const merged = {
            version: 2,
            settings: {
                ...DEFAULT_SETTINGS,
                ...(data.settings || {}),
                // 深度合并嵌套的配置，防止旧数据缺字段
                backgroundImage: {
                    ...DEFAULT_SETTINGS.backgroundImage,
                    ...((data.settings && data.settings.backgroundImage) || {})
                },
                logoIcon: {
                    ...DEFAULT_SETTINGS.logoIcon,
                    ...((data.settings && data.settings.logoIcon) || {})
                }
            },
            categories: Array.isArray(data.categories) && data.categories.length > 0
                ? data.categories
                : getDefaultData().categories,
            sites: Array.isArray(data.sites) ? data.sites : []
        };
        return merged;
    }

    // ----- 初始化 -----
    function init() {
        const stored = loadFromStorage();
        if (stored) {
            state = mergeDefaults(stored);
        } else {
            state = getDefaultData();
            saveToStorage(state);
        }
        return state;
    }

    // ----- 获取完整数据 -----
    function getData() {
        if (!state) init();
        return state;
    }

    // ----- 保存（触发前端刷新） -----
    function save(newData) {
        state = newData || state;
        saveToStorage(state);               // 本地始终保留一份（兜底）
        // 通知所有监听者刷新
        notifyChange();
        // API 模式下：云端异步补写（失败不阻塞，下次保存自动重试）
        if (DATA_SOURCE === 'api') {
            apiSave(state).catch(e => console.warn('[NavData] 云端保存失败', e));
        }
        return true;
    }

    // ----- 重置为默认 -----
    function reset() {
        state = getDefaultData();
        saveToStorage(state);
        notifyChange();
        if (DATA_SOURCE === 'api') {
            apiSave(state).catch(e => console.warn('[NavData] 云端保存失败', e));
        }
        return state;
    }

    // ----- 变更监听 -----
    const listeners = [];
    function onChange(cb) {
        listeners.push(cb);
    }
    function notifyChange() {
        listeners.forEach(cb => {
            try { cb(state); } catch (e) { console.error(e); }
        });
    }

    // ----- 便捷读取 -----
    function getSettings() {
        return getData().settings;
    }
    function getCategories() {
        return getData().categories;
    }
    function getSites() {
        return getData().sites;
    }
    function getCategoryName(id) {
        const cat = getData().categories.find(c => c.id === id);
        return cat ? cat.name : id;
    }

    // ----- 导出 / 导入 -----
    function exportJSON() {
        return JSON.stringify(getData(), null, 2);
    }

    function importJSON(jsonStr) {
        try {
            const parsed = JSON.parse(jsonStr);
            if (!parsed || !Array.isArray(parsed.sites)) {
                throw new Error('数据格式不正确');
            }
            const merged = mergeDefaults(parsed);
            save(merged);
            return { ok: true, data: merged };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    }

    // ============================================================
    // 远程 API 支持（部署时启用）
    // 说明：默认使用 localStorage。
    // 部署上线后，把 DATA_SOURCE 改为 'api'，并配置 API_BASE_URL。
    // 后端需实现：GET /api/nav 返回完整数据，PUT /api/nav 接收完整数据。
    // ============================================================
    // DATA_SOURCE / API_BASE_URL / API_ADMIN_KEY 统一定义在文件顶部

    async function apiFetch() {
        const res = await fetch(API_BASE_URL + '/api/nav');
        if (!res.ok) throw new Error('API 请求失败: ' + res.status);
        return res.json();
    }

    async function apiSave(data) {
        const res = await fetch(API_BASE_URL + '/api/nav', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': API_ADMIN_KEY   // 与 Cloudflare 环境变量 ADMIN_KEY 一致
            },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('API 保存失败: ' + res.status);
        return true;
    }

    // 异步初始化（远程数据源时使用）
    async function initAsync() {
        if (DATA_SOURCE === 'api') {
            try {
                const remote = await apiFetch();
                state = mergeDefaults(remote);
                return state;
            } catch (e) {
                console.warn('[NavData] 远程数据加载失败，回退本地存储', e);
                return init();
            }
        }
        return init();
    }

    return {
        init,
        initAsync,
        getData,
        getSettings,
        getCategories,
        getSites,
        getCategoryName,
        save,
        reset,
        onChange,
        exportJSON,
        importJSON,
        getDomain,
        getFaviconUrl,
        buildFaviconHtml,
        FAVICON_SERVICES,
        DATA_SOURCE,
        API_BASE_URL,
        STORAGE_KEY
    };
})();

// ---------- 兼容旧版本（旧 app.js 使用的全局变量） ----------
const siteData = NavData.getSites();
const categoryNames = (function () {
    const map = {};
    NavData.getCategories().forEach(c => { map[c.id] = c.name; });
    return map;
})();
