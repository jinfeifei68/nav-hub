// ============================================================
// NavHub · 管理后台逻辑
// 功能：登录鉴权、站点管理、分类管理、布局/颜色/内容设置、数据导入导出
// ============================================================

(function () {
    'use strict';

    // ============================================================
    // 常量
    // ============================================================
    // ⚠️ 前端演示用密码（仅简单校验）。
    // 正式部署时请改为后端 API 鉴权（见底部"部署说明"注释）。
    const ADMIN_PASSWORD = 'admin123';

    // ----- 登录元素 -----
    const loginOverlay = document.getElementById('loginOverlay');
    const loginPassword = document.getElementById('loginPassword');
    const loginBtn = document.getElementById('loginBtn');
    const loginError = document.getElementById('loginError');
    const adminShell = document.getElementById('adminShell');

    // ----- 导航元素 -----
    const sidebarToggle = document.getElementById('sidebarToggle');
    const adminSidebar = document.getElementById('adminSidebar');
    const logoutBtn = document.getElementById('logoutBtn');

    // ----- 站点管理元素 -----
    const siteManageList = document.getElementById('siteManageList');
    const siteFilter = document.getElementById('siteFilter');
    const siteSearch = document.getElementById('siteSearch');
    const addSiteBtn = document.getElementById('addSiteBtn');

    // ----- 分类管理元素 -----
    const categoryManageList = document.getElementById('categoryManageList');
    const addCategoryBtn = document.getElementById('addCategoryBtn');

    // ----- 弹窗元素 -----
    const siteModal = document.getElementById('siteModal');
    const categoryModal = document.getElementById('categoryModal');

    // ----- Toast -----
    const toastContainer = document.getElementById('toastContainer');

    // ============================================================
    // 通用工具
    // ============================================================
    function $(id) { return document.getElementById(id); }
    function esc(s) {
        const div = document.createElement('div');
        div.textContent = s === undefined || s === null ? '' : String(s);
        return div.innerHTML;
    }

    function toast(message, type = 'success', duration = 2500) {
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.textContent = message;
        toastContainer.appendChild(el);
        setTimeout(() => {
            el.classList.add('out');
            setTimeout(() => el.remove(), 300);
        }, duration);
    }

    function showModal(modal) {
        modal.style.display = 'flex';
    }
    function hideModal(modal) {
        modal.style.display = 'none';
    }

    // ============================================================
    // 登录鉴权
    // ============================================================
    function isAuthed() {
        return sessionStorage.getItem('navhub_admin_authed') === '1';
    }

    function doLogin() {
        const pwd = loginPassword.value;
        if (pwd === ADMIN_PASSWORD) {
            sessionStorage.setItem('navhub_admin_authed', '1');
            loginOverlay.classList.add('hidden');
            setTimeout(() => { loginOverlay.style.display = 'none'; }, 400);
            adminShell.style.display = 'flex';
            initAdmin();
            toast('欢迎回来，管理员 👋');
        } else {
            loginError.textContent = '密码错误，请重试';
            loginPassword.value = '';
            loginPassword.focus();
            loginPassword.classList.add('shake');
            setTimeout(() => loginPassword.classList.remove('shake'), 500);
        }
    }

    loginBtn.addEventListener('click', doLogin);
    loginPassword.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doLogin();
    });

    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('navhub_admin_authed');
        location.reload();
    });

    // ============================================================
    // 面板切换
    // ============================================================
    document.querySelectorAll('.admin-nav-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.admin-nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
            $('panel-' + item.dataset.panel).classList.add('active');
            // 移动端切换后收起侧边栏
            if (window.innerWidth <= 768) {
                adminSidebar.classList.add('collapsed');
            }
        });
    });

    sidebarToggle.addEventListener('click', () => {
        adminSidebar.classList.toggle('collapsed');
    });

    // ============================================================
    // 站点管理
    // ============================================================
    let editingSiteIndex = -1;
    let dragState = null;

    function getCategoryOptions(selectedId) {
        const cats = NavData.getCategories();
        return cats.map(c =>
            `<option value="${esc(c.id)}" ${c.id === selectedId ? 'selected' : ''}>${esc(c.emoji || '')} ${esc(c.name)}</option>`
        ).join('');
    }

    function renderSiteManageList() {
        let sites = NavData.getSites();
        const filterCat = siteFilter.value;
        const keyword = siteSearch.value.trim().toLowerCase();

        if (filterCat !== 'all') {
            sites = sites.filter(s => s.category === filterCat);
        }
        if (keyword) {
            sites = sites.filter(s =>
                (s.name || '').toLowerCase().includes(keyword) ||
                (s.url || '').toLowerCase().includes(keyword) ||
                (s.desc || '').toLowerCase().includes(keyword)
            );
        }

        if (sites.length === 0) {
            siteManageList.innerHTML = '<div class="empty-admin">暂无站点，点击"新增站点"开始添加</div>';
            return;
        }

        let html = '';
        for (const site of sites) {
            const catName = NavData.getCategoryName(site.category);
            const faviconHtml = NavData.buildFaviconHtml({ ...site, autoIcon: site.autoIcon !== false }, 'site-manage-favicon');
            html += `
                <div class="site-manage-item" draggable="true" data-url="${esc(site.url)}">
                    <div class="drag-handle">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
                            <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                            <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
                        </svg>
                    </div>
                    ${faviconHtml}
                    <div class="site-manage-info">
                        <div class="site-manage-name">
                            <span>${esc(site.name)}</span>
                            <span class="site-manage-cat">${esc(catName)}</span>
                        </div>
                        <div class="site-manage-url">${esc(site.url)}</div>
                    </div>
                    <div class="site-manage-actions">
                        <button class="icon-btn" title="编辑" data-action="edit" data-url="${esc(site.url)}">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                            </svg>
                        </button>
                        <button class="icon-btn danger" title="删除" data-action="delete" data-url="${esc(site.url)}">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        }
        siteManageList.innerHTML = html;

        // 绑定操作按钮
        siteManageList.querySelectorAll('.icon-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const url = btn.dataset.url;
                const site = NavData.getSites().find(s => s.url === url);
                if (!site) return;
                if (action === 'edit') openSiteModal(site);
                if (action === 'delete') deleteSite(site);
            });
        });

        // 绑定拖拽排序
        initDragSort();
    }

    // ----- 拖拽排序 -----
    function initDragSort() {
        const items = siteManageList.querySelectorAll('.site-manage-item[draggable="true"]');

        items.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                dragState = { url: item.dataset.url };
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                document.querySelectorAll('.site-manage-item').forEach(i => i.classList.remove('drag-over'));
                dragState = null;
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (!dragState) return;
                item.classList.add('drag-over');
            });

            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over');
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                item.classList.remove('drag-over');
                if (!dragState || dragState.url === item.dataset.url) return;

                const sites = NavData.getSites();
                const fromIdx = sites.findIndex(s => s.url === dragState.url);
                const toIdx = sites.findIndex(s => s.url === item.dataset.url);
                if (fromIdx === -1 || toIdx === -1) return;

                const [moved] = sites.splice(fromIdx, 1);
                sites.splice(toIdx, 0, moved);
                NavData.save({ ...NavData.getData(), sites });
                renderSiteManageList();
                toast('排序已更新');
            });
        });
    }

    // ----- 新增/编辑站点 -----
    function openSiteModal(site) {
        editingSiteIndex = site ? NavData.getSites().findIndex(s => s.url === site.url && s.name === site.name) : -1;
        $('siteModalTitle').textContent = site ? '编辑站点' : '新增站点';
        $('editSiteName').value = site ? site.name : '';
        $('editSiteUrl').value = site ? site.url : '';
        $('editSiteDesc').value = site ? (site.desc || '') : '';
        $('editSiteCategory').innerHTML = getCategoryOptions(site ? site.category : (NavData.getCategories()[0] || {}).id);
        $('editSiteColor').value = site ? (site.color || '#6366f1') : '#6366f1';
        $('editSiteColorText').value = site ? (site.color || '#6366f1') : '#6366f1';
        $('editSiteIcon').value = site ? (site.icon || '') : '';
        // autoIcon 未设置时默认开启自动识别
        $('editSiteAutoIcon').checked = site ? site.autoIcon !== false : true;
        updateIconPreview();
        showModal(siteModal);
        setTimeout(() => $('editSiteName').focus(), 100);
    }

    function updateIconPreview() {
        const auto = $('editSiteAutoIcon').checked;
        const color = $('editSiteColorText').value || '#6366f1';
        const icon = $('editSiteIcon').value || $('editSiteName').value.charAt(0) || '?';
        const name = $('editSiteName').value || '站点名称';
        const desc = $('editSiteDesc').value || '站点描述';
        const url = $('editSiteUrl').value.trim();

        // 自动识别模式下禁用图标文字输入
        $('editSiteIcon').disabled = auto;

        // 通过统一函数生成图标 HTML（含自动识别 + 失败回退）
        const previewSite = {
            name, url, desc, color, icon,
            autoIcon: auto
        };
        const favHtml = NavData.buildFaviconHtml(previewSite, 'site-favicon');
        const preview = $('siteIconPreview');
        preview.innerHTML = `
            ${favHtml}
            <div class="icon-preview-info">
                <div class="preview-name">${esc(name)}</div>
                <div class="preview-desc">${esc(desc)}</div>
            </div>
        `;
    }

    ['editSiteName', 'editSiteIcon', 'editSiteDesc', 'editSiteColorText', 'editSiteUrl'].forEach(id => {
        $(id).addEventListener('input', updateIconPreview);
    });

    $('editSiteAutoIcon').addEventListener('change', updateIconPreview);

    $('editSiteColor').addEventListener('input', (e) => {
        $('editSiteColorText').value = e.target.value;
        updateIconPreview();
    });
    $('editSiteColorText').addEventListener('input', (e) => {
        $('editSiteColor').value = /^#[0-9a-fA-F]{6}$/.test(e.target.value) ? e.target.value : $('editSiteColor').value;
        updateIconPreview();
    });

    function saveSite() {
        const name = $('editSiteName').value.trim();
        const url = $('editSiteUrl').value.trim();
        const desc = $('editSiteDesc').value.trim();
        const category = $('editSiteCategory').value;
        const color = /^#[0-9a-fA-F]{6}$/.test($('editSiteColorText').value.trim())
            ? $('editSiteColorText').value.trim() : '#6366f1';
        const icon = $('editSiteIcon').value.trim().slice(0, 2) || name.charAt(0).toUpperCase();
        const autoIcon = $('editSiteAutoIcon').checked;

        if (!name) { toast('请输入站点名称', 'error'); return; }
        if (!url) { toast('请输入链接地址', 'error'); return; }
        if (!/^https?:\/\/.+/.test(url)) { toast('链接需以 http:// 或 https:// 开头', 'error'); return; }

        const data = NavData.getData();
        const sites = [...data.sites];

        if (editingSiteIndex >= 0 && sites[editingSiteIndex]) {
            sites[editingSiteIndex] = { ...sites[editingSiteIndex], name, url, desc, category, color, icon, autoIcon };
            toast('站点已更新 ✅');
        } else {
            sites.push({ name, url, desc, category, color, icon, autoIcon });
            toast('站点已添加 ✅');
        }

        NavData.save({ ...data, sites });
        hideModal(siteModal);
        renderSiteManageList();
    }

    function deleteSite(site) {
        if (!confirm(`确定删除站点「${site.name}」吗？`)) return;
        const data = NavData.getData();
        const sites = data.sites.filter(s => !(s.url === site.url && s.name === site.name));
        NavData.save({ ...data, sites });
        renderSiteManageList();
        toast(`已删除「${site.name}」`, 'warning');
    }

    addSiteBtn.addEventListener('click', () => openSiteModal(null));
    $('siteModalSave').addEventListener('click', saveSite);
    $('siteModalCancel').addEventListener('click', () => hideModal(siteModal));
    $('siteModalClose').addEventListener('click', () => hideModal(siteModal));

    // 点击遮罩关闭
    siteModal.addEventListener('click', (e) => {
        if (e.target === siteModal) hideModal(siteModal);
    });

    siteFilter.addEventListener('change', renderSiteManageList);
    siteSearch.addEventListener('input', renderSiteManageList);

    // ============================================================
    // 分类管理
    // ============================================================
    let editingCategoryIndex = -1;

    function renderCategoryManageList() {
        const cats = NavData.getCategories();
        const sites = NavData.getSites();

        if (cats.length === 0) {
            categoryManageList.innerHTML = '<div class="empty-admin">暂无分类，点击"新增分类"开始添加</div>';
            return;
        }

        let html = '';
        cats.forEach((cat, idx) => {
            const count = sites.filter(s => s.category === cat.id).length;
            html += `
                <div class="category-manage-item">
                    <div class="category-emoji">${esc(cat.emoji || '📁')}</div>
                    <div class="category-info">
                        <div class="category-name">${esc(cat.name)}</div>
                        <div class="category-id">ID: ${esc(cat.id)}</div>
                    </div>
                    <span class="category-count">${count} 个站点</span>
                    <div class="site-manage-actions">
                        <button class="icon-btn" title="上移" data-action="up" data-idx="${idx}" ${idx === 0 ? 'disabled' : ''}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                        </button>
                        <button class="icon-btn" title="下移" data-action="down" data-idx="${idx}" ${idx === cats.length - 1 ? 'disabled' : ''}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                        </button>
                        <button class="icon-btn" title="编辑" data-action="edit" data-idx="${idx}">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                        </button>
                        <button class="icon-btn danger" title="删除" data-action="delete" data-idx="${idx}">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </div>
                </div>
            `;
        });
        categoryManageList.innerHTML = html;

        categoryManageList.querySelectorAll('.icon-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                const idx = parseInt(btn.dataset.idx, 10);
                handleCategoryAction(action, idx);
            });
        });
    }

    function handleCategoryAction(action, idx) {
        const data = NavData.getData();
        const cats = [...data.categories];

        switch (action) {
            case 'up':
                if (idx > 0) {
                    [cats[idx - 1], cats[idx]] = [cats[idx], cats[idx - 1]];
                    NavData.save({ ...data, categories: cats });
                    toast('分类顺序已更新');
                }
                break;
            case 'down':
                if (idx < cats.length - 1) {
                    [cats[idx + 1], cats[idx]] = [cats[idx], cats[idx + 1]];
                    NavData.save({ ...data, categories: cats });
                    toast('分类顺序已更新');
                }
                break;
            case 'edit': {
                const cat = cats[idx];
                editingCategoryIndex = idx;
                $('categoryModalTitle').textContent = '编辑分类';
                $('editCategoryName').value = cat.name;
                $('editCategoryEmoji').value = cat.emoji || '';
                showModal(categoryModal);
                break;
            }
            case 'delete': {
                const cat = cats[idx];
                const siteCount = data.sites.filter(s => s.category === cat.id).length;
                if (!confirm(`确定删除分类「${cat.name}」吗？${siteCount > 0 ? `\n该分类下有 ${siteCount} 个站点将变为"未分类"。` : ''}`)) return;
                const newCats = cats.filter((_, i) => i !== idx);
                const newSites = data.sites.map(s => s.category === cat.id ? { ...s, category: 'uncategorized' } : s);
                NavData.save({ ...data, categories: newCats, sites: newSites });
                refreshCategoryFilter();
                renderCategoryManageList();
                toast(`已删除分类「${cat.name}」`, 'warning');
                break;
            }
        }
    }

    function openCategoryModal() {
        editingCategoryIndex = -1;
        $('categoryModalTitle').textContent = '新增分类';
        $('editCategoryName').value = '';
        $('editCategoryEmoji').value = '';
        showModal(categoryModal);
        setTimeout(() => $('editCategoryName').focus(), 100);
    }

    function saveCategory() {
        const name = $('editCategoryName').value.trim();
        const emoji = $('editCategoryEmoji').value.trim();
        if (!name) { toast('请输入分类名称', 'error'); return; }

        const data = NavData.getData();
        const cats = [...data.categories];

        if (editingCategoryIndex >= 0 && cats[editingCategoryIndex]) {
            cats[editingCategoryIndex] = { ...cats[editingCategoryIndex], name, emoji };
            toast('分类已更新 ✅');
        } else {
            // 生成唯一 id
            let base = 'cat' + Date.now().toString(36);
            let id = base;
            let n = 1;
            while (cats.some(c => c.id === id)) {
                id = base + '_' + (n++);
            }
            cats.push({ id, name, emoji });
            toast('分类已添加 ✅');
        }

        NavData.save({ ...data, categories: cats });
        hideModal(categoryModal);
        refreshCategoryFilter();
        renderCategoryManageList();
    }

    function refreshCategoryFilter() {
        const cats = NavData.getCategories();
        const current = siteFilter.value;
        let html = '<option value="all">全部分类</option>';
        for (const cat of cats) {
            html += `<option value="${esc(cat.id)}" ${cat.id === current ? 'selected' : ''}>${esc(cat.name)}</option>`;
        }
        siteFilter.innerHTML = html;
    }

    addCategoryBtn.addEventListener('click', openCategoryModal);
    $('categoryModalSave').addEventListener('click', saveCategory);
    $('categoryModalCancel').addEventListener('click', () => hideModal(categoryModal));
    $('categoryModalClose').addEventListener('click', () => hideModal(categoryModal));
    categoryModal.addEventListener('click', (e) => {
        if (e.target === categoryModal) hideModal(categoryModal);
    });

    // ============================================================
    // 布局设置（滑块实时预览 + 保存）
    // ============================================================
    const layoutFields = ['gridMinWidth', 'gridGap', 'cardPadding', 'cardRadius', 'cardMinHeight', 'cardOpacity'];
    const layoutLabels = {
        gridMinWidth: 'px',
        gridGap: 'px',
        cardPadding: 'px',
        cardRadius: 'px',
        cardMinHeight: 'px',
        cardOpacity: '%'
    };

    // cardMinHeight 为 0 时显示"自动"
    function formatLayoutValue(field, value) {
        if (field === 'cardMinHeight' && Number(value) === 0) return '自动';
        return value + layoutLabels[field];
    }

    function loadLayoutSettings() {
        const s = NavData.getSettings();
        for (const field of layoutFields) {
            const slider = $('setting-' + field);
            const valueEl = $('value-' + field);
            if (slider && valueEl) {
                slider.value = s[field] ?? DEFAULT_SETTINGS[field];
                valueEl.textContent = formatLayoutValue(field, slider.value);
            }
        }
        $('setting-showDesc').checked = !!s.showDesc;
    }

    function applyLayoutPreview() {
        const root = document.documentElement;
        root.style.setProperty('--grid-min-width', $('setting-gridMinWidth').value + 'px');
        root.style.setProperty('--grid-gap', $('setting-gridGap').value + 'px');
        root.style.setProperty('--card-padding', $('setting-cardPadding').value + 'px');
        root.style.setProperty('--card-radius', $('setting-cardRadius').value + 'px');
        root.style.setProperty('--card-min-height', ($('setting-cardMinHeight').value || 0) + 'px');
        root.style.setProperty('--card-opacity', ($('setting-cardOpacity').value / 100));
        document.body.classList.toggle('hide-desc', !$('setting-showDesc').checked);
    }

    for (const field of layoutFields) {
        $('setting-' + field).addEventListener('input', (e) => {
            $('value-' + field).textContent = formatLayoutValue(field, e.target.value);
            applyLayoutPreview();
        });
    }
    $('setting-showDesc').addEventListener('change', applyLayoutPreview);

    $('saveLayoutBtn').addEventListener('click', () => {
        const data = NavData.getData();
        const s = { ...data.settings };
        for (const field of layoutFields) {
            s[field] = parseInt($('setting-' + field).value, 10);
        }
        s.showDesc = $('setting-showDesc').checked;
        NavData.save({ ...data, settings: s });
        toast('布局设置已保存 ✅');
    });

    // ============================================================
    // 颜色设置
    // ============================================================
    const colorFields = ['accentColor', 'accentColor2', 'blobColor1', 'blobColor2', 'blobColor3'];

    function loadColorSettings() {
        const s = NavData.getSettings();
        for (const field of colorFields) {
            const picker = $('setting-' + field);
            const valueEl = $('value-' + field);
            const val = s[field] ?? DEFAULT_SETTINGS[field];
            if (picker && valueEl) {
                picker.value = val;
                valueEl.textContent = val;
            }
        }
    }

    function applyColorPreview() {
        const root = document.documentElement;
        const accent = $('setting-accentColor').value;
        const accent2 = $('setting-accentColor2').value;
        root.style.setProperty('--accent', accent);
        root.style.setProperty('--accent-light', accent);
        root.style.setProperty('--chip-active-bg', accent);
        root.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${accent}, ${accent2})`);
        root.style.setProperty('--blob-1', $('setting-blobColor1').value);
        root.style.setProperty('--blob-2', $('setting-blobColor2').value);
        root.style.setProperty('--blob-3', $('setting-blobColor3').value);
    }

    for (const field of colorFields) {
        $('setting-' + field).addEventListener('input', (e) => {
            $('value-' + field).textContent = e.target.value;
            applyColorPreview();
        });
    }

    $('saveColorBtn').addEventListener('click', () => {
        const data = NavData.getData();
        const s = { ...data.settings };
        for (const field of colorFields) {
            s[field] = $('setting-' + field).value;
        }
        NavData.save({ ...data, settings: s });
        toast('颜色设置已保存 ✅');
    });

    // ============================================================
    // 内容设置
    // ============================================================
    const contentFields = ['logoText', 'siteTitle', 'siteSubtitle', 'footerText'];

    function loadContentSettings() {
        const s = NavData.getSettings();
        for (const field of contentFields) {
            $('setting-' + field).value = s[field] ?? DEFAULT_SETTINGS[field];
        }
        loadFaviconService();
        loadLogoIconSettings();
    }

    // ----- Logo 图标设置（默认图形 / Emoji / 图片） -----
    function loadLogoIconSettings() {
        const li = NavData.getSettings().logoIcon || {};
        $('setting-logoIconType').value = li.type || 'default';
        $('setting-logoIconEmoji').value = li.emoji || '';
        $('setting-logoIconImage').value = li.image || '';
        updateLogoIconFields();
    }

    function updateLogoIconFields() {
        const type = $('setting-logoIconType').value;
        $('setting-logoIconEmoji').style.display = type === 'emoji' ? '' : 'none';
        $('setting-logoIconImage').style.display = type === 'image' ? '' : 'none';
    }

    $('setting-logoIconType').addEventListener('change', updateLogoIconFields);

    // ----- 站点图标识别服务下拉 -----
    function loadFaviconService() {
        const s = NavData.getSettings();
        const current = s.faviconService || 'faviconim';
        $('setting-faviconService').innerHTML = Object.entries(NavData.FAVICON_SERVICES).map(([k, v]) =>
            `<option value="${k}" ${k === current ? 'selected' : ''}>${esc(v.label)}</option>`
        ).join('');
    }

    $('saveContentBtn').addEventListener('click', () => {
        const data = NavData.getData();
        const s = { ...data.settings };
        for (const field of contentFields) {
            s[field] = $('setting-' + field).value.trim();
        }
        s.faviconService = $('setting-faviconService').value;
        s.logoIcon = {
            type: $('setting-logoIconType').value,
            emoji: $('setting-logoIconEmoji').value.trim(),
            image: $('setting-logoIconImage').value.trim()
        };
        if (!s.siteTitle) { toast('主标题不能为空', 'error'); return; }
        NavData.save({ ...data, settings: s });
        renderSiteManageList();
        toast('内容设置已保存 ✅');
    });

    // ============================================================
    // 背景图片设置
    // ============================================================
    const bgPreviewBox = $('bgPreviewBox');

    function loadBackgroundSettings() {
        const s = NavData.getSettings();
        const bg = s.backgroundImage || {};
        $('setting-bgEnabled').checked = !!bg.enabled;
        $('setting-bgUrl').value = bg.url || '';
        $('setting-bgOpacity').value = Math.round((bg.opacity ?? 0.9) * 100);
        $('value-bgOpacity').textContent = $('setting-bgOpacity').value + '%';
        $('setting-bgBlur').value = bg.blur || 0;
        $('value-bgBlur').textContent = $('setting-bgBlur').value + 'px';
        $('setting-bgOverlay').value = Math.round((bg.overlayOpacity ?? 0.55) * 100);
        $('value-bgOverlay').textContent = $('setting-bgOverlay').value + '%';
        $('setting-bgOverlayColor').value = bg.overlayColor || '#000000';
        $('bgOverlayClearBtn').dataset.custom = bg.overlayColor ? '1' : '0';
        applyBgPreview();
    }

    function applyBgPreview() {
        const enabled = $('setting-bgEnabled').checked;
        const url = $('setting-bgUrl').value.trim();
        const root = document.documentElement;
        const box = bgPreviewBox;
        const text = $('bgPreviewText');

        if (enabled && url) {
            box.classList.add('pv-active');
            root.style.setProperty('--bg-pv-url', `url("${url.replace(/"/g, '\\"')}")`);
            root.style.setProperty('--bg-pv-img-opacity', ($('setting-bgOpacity').value / 100).toFixed(2));
            root.style.setProperty('--bg-pv-blur', $('setting-bgBlur').value + 'px');
            root.style.setProperty('--bg-pv-opacity', ($('setting-bgOverlay').value / 100).toFixed(2));
            if ($('bgOverlayClearBtn').dataset.custom === '1') {
                root.style.setProperty('--bg-pv-overlay', $('setting-bgOverlayColor').value);
            } else {
                root.style.removeProperty('--bg-pv-overlay');
            }
            text.innerHTML = '示例文字<br><small>实时预览中</small>';
        } else {
            box.classList.remove('pv-active');
            root.style.removeProperty('--bg-pv-url');
            root.style.removeProperty('--bg-pv-img-opacity');
            root.style.removeProperty('--bg-pv-blur');
            root.style.removeProperty('--bg-pv-opacity');
            root.style.removeProperty('--bg-pv-overlay');
            text.innerHTML = '示例文字<br><small>' + (enabled ? '请输入背景图片地址' : '背景图片未启用') + '</small>';
        }
    }

    ['setting-bgEnabled', 'setting-bgUrl'].forEach(id => {
        $(id).addEventListener('input', applyBgPreview);
    });
    $('setting-bgEnabled').addEventListener('change', applyBgPreview);
    $('bgPreviewBtn').addEventListener('click', () => {
        applyBgPreview();
        if ($('setting-bgEnabled').checked && $('setting-bgUrl').value.trim()) {
            toast('已应用预览 ✅');
        } else {
            toast('请先启用背景图并输入地址', 'error');
        }
    });
    $('setting-bgOpacity').addEventListener('input', (e) => {
        $('value-bgOpacity').textContent = e.target.value + '%';
        applyBgPreview();
    });
    $('setting-bgBlur').addEventListener('input', (e) => {
        $('value-bgBlur').textContent = e.target.value + 'px';
        applyBgPreview();
    });
    $('setting-bgOverlay').addEventListener('input', (e) => {
        $('value-bgOverlay').textContent = e.target.value + '%';
        applyBgPreview();
    });
    $('setting-bgOverlayColor').addEventListener('input', () => {
        $('bgOverlayClearBtn').dataset.custom = '1';
        applyBgPreview();
    });
    $('bgOverlayClearBtn').addEventListener('click', () => {
        $('bgOverlayClearBtn').dataset.custom = '0';
        applyBgPreview();
        toast('遮罩已跟随主题背景色');
    });

    $('saveBgBtn').addEventListener('click', () => {
        const data = NavData.getData();
        const s = { ...data.settings };
        s.backgroundImage = {
            enabled: $('setting-bgEnabled').checked,
            url: $('setting-bgUrl').value.trim(),
            opacity: parseInt($('setting-bgOpacity').value, 10) / 100,
            blur: parseInt($('setting-bgBlur').value, 10),
            overlayColor: $('bgOverlayClearBtn').dataset.custom === '1' ? $('setting-bgOverlayColor').value : '',
            overlayOpacity: parseInt($('setting-bgOverlay').value, 10) / 100
        };
        NavData.save({ ...data, settings: s });
        toast('背景设置已保存 ✅');
    });

    $('bgClearBtn').addEventListener('click', () => {
        $('setting-bgEnabled').checked = false;
        $('setting-bgUrl').value = '';
        applyBgPreview();
        const data = NavData.getData();
        const s = { ...data.settings };
        s.backgroundImage = { ...DEFAULT_SETTINGS.backgroundImage };
        NavData.save({ ...data, settings: s });
        toast('背景图已清除');
    });

    // ============================================================
    // 数据管理（导出 / 导入 / 重置）
    // ============================================================
    $('exportBtn').addEventListener('click', () => {
        const json = NavData.exportJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        const date = new Date();
        const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`;
        a.download = `navhub-backup-${stamp}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
        toast('数据已导出 ✅');
    });

    $('importBtn').addEventListener('click', () => $('importFile').click());
    $('importFile').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const result = NavData.importJSON(ev.target.result);
            if (result.ok) {
                toast('数据导入成功 ✅');
                refreshAll();
            } else {
                toast('导入失败：' + result.error, 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    });

    $('resetBtn').addEventListener('click', () => {
        if (!confirm('⚠️ 确定要恢复默认数据吗？\n当前所有修改将被覆盖，且无法撤销！\n建议先导出备份。')) return;
        if (!confirm('再次确认：真的要恢复默认吗？')) return;
        NavData.reset();
        refreshAll();
        toast('已恢复默认数据', 'warning');
    });

    // ============================================================
    // 初始化
    // ============================================================
    function refreshAll() {
        loadLayoutSettings();
        loadColorSettings();
        loadContentSettings();
        loadBackgroundSettings();
        refreshCategoryFilter();
        renderSiteManageList();
        renderCategoryManageList();
        // 将配置应用到后台自身页面（同步视觉）
        applyColorPreview();
        applyLayoutPreview();
    }

    function initAdmin() {
        refreshAll();
    }

    // ----- 启动流程（API 模式：先拉取云端配置，就绪后再初始化后台） -----
    NavData.initAsync().then(() => {
        // 同步后台自身的主题（亮/暗跟随主页存储）
        const savedTheme = localStorage.getItem('navhub-theme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
        }

        if (isAuthed()) {
            loginOverlay.style.display = 'none';
            adminShell.style.display = 'flex';
            initAdmin();
        } else {
            setTimeout(() => loginPassword.focus(), 300);
        }
    });
})();
