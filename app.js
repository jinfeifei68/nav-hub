// ============================================================
// NavHub · 前端核心逻辑
// 数据驱动：所有内容/布局/颜色均来自 NavData 管理层
// ============================================================

(function () {
    'use strict';

    // ----- DOM 元素 -----
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    const cardsSection = document.getElementById('cardsSection');
    const emptyState = document.getElementById('emptyState');
    const categoryBar = document.getElementById('categoryBar');
    const themeToggle = document.getElementById('themeToggle');
    const clockTime = document.getElementById('clockTime');
    const clockDate = document.getElementById('clockDate');
    const footerText = document.getElementById('footerText');

    // ----- 默认 Logo 图形（四色渐变方块） -----
    const DEFAULT_LOGO_SVG = `
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect x="2" y="2" width="10" height="10" rx="3" fill="url(#g1)"/>
            <rect x="16" y="2" width="10" height="10" rx="3" fill="url(#g2)" opacity="0.7"/>
            <rect x="2" y="16" width="10" height="10" rx="3" fill="url(#g3)" opacity="0.5"/>
            <rect x="16" y="16" width="10" height="10" rx="3" fill="url(#g4)" opacity="0.3"/>
            <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stop-color="#6366f1"/>
                    <stop offset="1" stop-color="#8b5cf6"/>
                </linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stop-color="#8b5cf6"/>
                    <stop offset="1" stop-color="#ec4899"/>
                </linearGradient>
                <linearGradient id="g3" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stop-color="#06b6d4"/>
                    <stop offset="1" stop-color="#6366f1"/>
                </linearGradient>
                <linearGradient id="g4" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stop-color="#f59e0b"/>
                    <stop offset="1" stop-color="#ec4899"/>
                </linearGradient>
            </defs>
        </svg>
    `;

    // ----- 状态 -----
    let currentCategory = 'all';
    let currentSearch = '';
    let currentEngine = 'google';

    // ============================================================
    // 应用动态配置（标题、颜色、布局）
    // ============================================================
    function applySettings() {
        const s = NavData.getSettings();
        const root = document.documentElement;

        // 文本内容
        const titleEl = document.querySelector('.search-title');
        const subtitleEl = document.querySelector('.search-subtitle');
        const footerEl = document.querySelector('.footer p');
        const logoEl = document.querySelector('.logo-text');
        if (titleEl) titleEl.textContent = s.siteTitle;
        if (subtitleEl) subtitleEl.textContent = s.siteSubtitle;
        if (footerEl) footerEl.textContent = s.footerText;
        if (logoEl) logoEl.textContent = s.logoText;
        document.title = (s.logoText || 'NavHub') + ' · 精选导航';

        // Logo 图标（默认图形 / Emoji / 图片URL 三种模式）
        const logoIcon = s.logoIcon || {};
        const logoBox = document.getElementById('logoIconBox');
        if (logoBox) {
            const type = logoIcon.type || 'default';
            if (type === 'image' && logoIcon.image) {
                logoBox.innerHTML = `<img src="${String(logoIcon.image).replace(/"/g, '&quot;')}" alt="logo" class="logo-img">`;
            } else if (type === 'emoji' && logoIcon.emoji) {
                logoBox.innerHTML = `<span class="logo-emoji">${escapeHtml(logoIcon.emoji)}</span>`;
            } else {
                logoBox.innerHTML = DEFAULT_LOGO_SVG;
            }
        }

        // 颜色配置（覆盖 CSS 变量）
        root.style.setProperty('--accent', s.accentColor);
        root.style.setProperty('--accent-light', s.accentColor);
        root.style.setProperty('--chip-active-bg', s.accentColor);
        root.style.setProperty('--accent-gradient',
            `linear-gradient(135deg, ${s.accentColor}, ${s.accentColor2})`);
        root.style.setProperty('--blob-1', s.blobColor1);
        root.style.setProperty('--blob-2', s.blobColor2);
        root.style.setProperty('--blob-3', s.blobColor3);

        // 布局配置
        root.style.setProperty('--grid-min-width', s.gridMinWidth + 'px');
        root.style.setProperty('--grid-gap', s.gridGap + 'px');
        root.style.setProperty('--card-padding', s.cardPadding + 'px');
        root.style.setProperty('--card-radius', s.cardRadius + 'px');
        root.style.setProperty('--card-min-height', (s.cardMinHeight || 0) + 'px');
        root.style.setProperty('--card-opacity', (s.cardOpacity ?? 100) / 100);

        // 描述文字显示开关
        document.body.classList.toggle('hide-desc', !s.showDesc);

        // 背景图片配置（开启时叠加背景图层 + 遮罩，保证文字可读性）
        const bg = s.backgroundImage || {};
        const hasBg = !!(bg.enabled && bg.url);
        document.body.classList.toggle('has-bg-image', hasBg);
        if (hasBg) {
            root.style.setProperty('--bg-image-url', `url("${String(bg.url).replace(/"/g, '\\"')}")`);
            root.style.setProperty('--bg-image-opacity', bg.opacity ?? 0.9);
            root.style.setProperty('--bg-image-blur', (bg.blur || 0) + 'px');
            document.body.classList.toggle('bg-overlay-custom', !!bg.overlayColor);
            if (bg.overlayColor) root.style.setProperty('--bg-overlay-color', bg.overlayColor);
            root.style.setProperty('--bg-overlay-opacity', bg.overlayOpacity ?? 0.55);
        } else {
            document.body.classList.remove('bg-overlay-custom');
        }
    }

    // ============================================================
    // 渲染分类筛选栏
    // ============================================================
    function renderCategoryBar() {
        const cats = NavData.getCategories();
        let html = `<button class="category-chip active" data-category="all">全部</button>`;
        for (const cat of cats) {
            html += `<button class="category-chip" data-category="${cat.id}">${cat.emoji || ''} ${cat.name}</button>`;
        }
        categoryBar.innerHTML = html;

        // 重新绑定事件
        document.querySelectorAll('.category-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                currentCategory = chip.dataset.category;
                updateCategoryChips();
                renderCards();
            });
        });
    }

    function updateCategoryChips() {
        document.querySelectorAll('.category-chip').forEach(chip => {
            chip.classList.toggle('active', chip.dataset.category === currentCategory);
        });
    }

    // ============================================================
    // 渲染卡片
    // ============================================================
    function getFilteredSites() {
        let sites = NavData.getSites();

        if (currentCategory !== 'all') {
            sites = sites.filter(s => s.category === currentCategory);
        }

        if (currentSearch) {
            const q = currentSearch.toLowerCase();
            sites = sites.filter(s =>
                (s.name || '').toLowerCase().includes(q) ||
                (s.desc || '').toLowerCase().includes(q)
            );
        }

        return sites;
    }

    function escapeHtml(text) {
        if (text === undefined || text === null) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    function highlightText(text, query) {
        const escaped = escapeHtml(text);
        if (!query) return escaped;
        const q = escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${q})`, 'gi');
        return escaped.replace(regex, '<span class="highlight">$1</span>');
    }

    function renderCards() {
        const sites = getFilteredSites();
        const categories = NavData.getCategories();

        if (sites.length === 0) {
            cardsSection.innerHTML = '';
            emptyState.style.display = 'flex';
            emptyState.style.flexDirection = 'column';
            emptyState.style.alignItems = 'center';
            return;
        }

        emptyState.style.display = 'none';
        let html = '';

        if (currentCategory === 'all') {
            // 按分类分组渲染（保持分类顺序）
            const categorized = new Set();
            for (const cat of categories) {
                const catSites = sites.filter(s => s.category === cat.id);
                if (catSites.length === 0) continue;
                catSites.forEach(s => categorized.add(s.url + '|' + s.name));
                html += renderGroup(cat, catSites);
            }
            // 兜底：未匹配到任何分类的站点（如分类被删除后遗留）
            const leftover = sites.filter(s => !categorized.has(s.url + '|' + s.name));
            if (leftover.length > 0) {
                html += renderGroup({ id: '_misc', name: '未分类' }, leftover);
            }
        } else {
            const cat = categories.find(c => c.id === currentCategory) || { id: currentCategory, name: currentCategory };
            html += renderGroup(cat, sites);
        }

        cardsSection.innerHTML = html;
    }

    function renderGroup(cat, sites) {
        let html = `<div class="category-group">`;
        html += `<h2 class="category-group-title">${escapeHtml(cat.name)} <span class="category-group-count">${sites.length}</span></h2>`;
        html += `<div class="cards-grid">`;
        for (const site of sites) {
            html += renderCard(site);
        }
        html += `</div></div>`;
        return html;
    }

    function renderCard(site) {
        const nameHtml = highlightText(site.name, currentSearch);
        const descHtml = highlightText(site.desc, currentSearch);
        // 自动识别站点 Logo（失败自动回退字母图标）
        const faviconHtml = NavData.buildFaviconHtml(site);
        // 展示域名（去掉协议与 www），复制时使用完整链接
        const domain = NavData.getDomain(site.url) || site.url;
        const fullUrl = escapeHtml(site.url);
        return `
            <div class="site-card" data-url="${fullUrl}">
                <a href="${fullUrl}" target="_blank" rel="noopener noreferrer" class="site-card-main">
                    ${faviconHtml}
                    <div class="site-info">
                        <div class="site-name">${nameHtml}</div>
                        <div class="site-desc">${descHtml}</div>
                    </div>
                </a>
                <div class="site-link-row">
                    <span class="site-url" title="${fullUrl}">${escapeHtml(domain)}</span>
                    <button type="button" class="site-copy-btn" data-url="${fullUrl}">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        <span>复制</span>
                    </button>
                </div>
            </div>
        `;
    }

    // ============================================================
    // 搜索
    // ============================================================
    function handleSearch(value) {
        currentSearch = value.trim();
        searchClear.classList.toggle('visible', currentSearch.length > 0);

        if (currentSearch && currentCategory !== 'all') {
            currentCategory = 'all';
            updateCategoryChips();
        }
        renderCards();
    }

    searchInput.addEventListener('input', (e) => handleSearch(e.target.value));

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && currentSearch) {
            const engineUrl = searchEngines[currentEngine];
            window.open(engineUrl + encodeURIComponent(currentSearch), '_blank');
        }
    });

    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        handleSearch('');
        searchInput.focus();
    });

    // ============================================================
    // 搜索引擎切换
    // ============================================================
    document.querySelectorAll('.engine-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.engine-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentEngine = btn.dataset.engine;
        });
    });

    // ============================================================
    // 主题
    // ============================================================
    function initTheme() {
        const savedTheme = localStorage.getItem('navhub-theme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
        } else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                document.documentElement.setAttribute('data-theme', 'dark');
            }
        }
    }

    themeToggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('navhub-theme', next);
    });

    // ============================================================
    // 数字时钟（导航栏上方 · 按秒跳动）
    // ============================================================
    function updateClock() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        clockTime.textContent = `${h}:${m}:${s}`;

        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        clockDate.textContent =
            `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${weekdays[now.getDay()]}`;

        // 触发"秒跳"动画（每次更新重置一次，产生轻微跳动感）
        clockTime.classList.remove('tick');
        void clockTime.offsetWidth;
        clockTime.classList.add('tick');
    }

    // ============================================================
    // 复制链接（卡片底部按钮，事件委托处理动态渲染的卡片）
    // ============================================================
    function copyToClipboard(text, btn) {
        const done = () => {
            const label = btn.querySelector('span');
            if (label) label.textContent = '已复制';
            btn.classList.add('copied');
            setTimeout(() => {
                if (label) label.textContent = '复制';
                btn.classList.remove('copied');
            }, 1500);
        };
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
        } else {
            fallbackCopy(text, done);
        }
    }

    function fallbackCopy(text, done) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) { /* ignore */ }
        ta.remove();
        done();
    }

    cardsSection.addEventListener('click', (e) => {
        const btn = e.target.closest('.site-copy-btn');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        copyToClipboard(btn.dataset.url, btn);
    });

    // ============================================================
    // 后台管理入口：双击底部页脚文字跳转
    // ============================================================
    footerText.addEventListener('dblclick', () => {
        window.location.href = 'admin.html';
    });

    // ============================================================
    // 键盘快捷键
    // ============================================================
    document.addEventListener('keydown', (e) => {
        if (e.key === '/' && document.activeElement !== searchInput) {
            e.preventDefault();
            searchInput.focus();
        }
        if (e.key === 'Escape' && document.activeElement === searchInput) {
            searchInput.value = '';
            handleSearch('');
            searchInput.blur();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            searchInput.focus();
            searchInput.select();
        }
    });

    // ============================================================
    // 数据变更监听：数据修改后自动刷新页面
    // ============================================================
    NavData.onChange(() => {
        applySettings();
        renderCategoryBar();
        renderCards();
    });

    // ============================================================
    // 初始化
    // ============================================================
    NavData.init();

    // 同步主题（需在 applySettings 之后执行）
    initTheme();
    applySettings();
    renderCategoryBar();
    renderCards();
    updateClock();
    setInterval(updateClock, 1000);
})();
