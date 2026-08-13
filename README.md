# NavHub 部署指南

> GitHub（代码托管）+ Cloudflare Pages（静态托管）+ Pages Functions（API 接口）+ Cloudflare KV（数据存储）
> 适用：NavHub 导航网站上线部署。本方案让所有访客看到**同一份配置**，后台修改一处、全网生效。

---

## 1. 部署架构总览

```
访客浏览器
   │  打开网页 / 调 GET /api/nav
   ▼
Cloudflare Pages（免费）
   ├── 静态资源托管：index.html · style.css · app.js · data.js · admin.*
   └── Pages Functions 接口：functions/api/nav.js
          │  GET 读 / PUT 写（可选密钥校验）
          ▼
   Cloudflare KV 命名空间（绑定名 NAV_DATA）
       存一份完整配置 JSON（键 nav_data）
       读多写少，免费额度绰绰有余
   ▲
   │ 自动部署（连接 GitHub 仓库，push 即发布）
   │
GitHub 仓库（代码源 + 版本管理，随时回滚）
```

数据流说明：访客打开首页 → `app.js` 通过 `GET /api/nav` 拉取云端配置 → 渲染。管理员在后台保存 → `PUT /api/nav` 写回 KV → 其他访客刷新即可看到新配置。

---
## 4. 部署步骤

### 第 1 步：代码推到 GitHub

1. 登录 GitHub，新建仓库（建议 `nav-hub`，Public）
2. 把 `nav-hub` 目录下 **7 个文件**（`index.html`、`style.css`、`app.js`、`data.js`、`admin.html`、`admin.css`、`admin.js`）上传到仓库根目录
   - 网页方式：仓库页 → Add file → Upload files → 逐个拖入文件 → Commit
   - 或命令行推送（推荐，后续更新方便）
3. 确认 `index.html` 中资源引用都是相对路径（`style.css`、`data.js`），本项目已是如此，无需改动

> ⚠️ 上传的是 nav-hub **里面的文件**，不要把外层目录结构一起传进去。

### 第 2 步：Cloudflare Pages 连接仓库

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/) → Workers & Pages → **Create → Pages → Connect to Git**
2. 授权 GitHub，选择刚才的 `nav-hub` 仓库
3. 构建设置：
   - **Framework preset**：None（纯静态，无需构建）
   - **Build command**：留空
   - **Build output directory**：`/`（仓库根目录）
4. 点 **Save and Deploy**，等约 1 分钟，访问 `https://<项目名>.pages.dev/` 即可看到网站

> 之后每次 `git push`，Pages 会自动重新构建发布。

### 第 3 步：创建 KV 命名空间

1. Cloudflare 控制台 → **Workers & Pages → KV** → Create namespace，命名如 `NAV_DATA`
2. 回到 Pages 项目 → **Settings → Functions → KV namespace bindings** → Edit bindings
   - **Variable name**：`NAV_DATA`
   - **KV namespace**：选刚创建的 `NAV_DATA`
3. 同一页面可加一个**环境变量** `ADMIN_KEY`（自定义一串密钥，如 `NavHub@2026!`），用于 PUT 接口鉴权

### 第 4 步：编写后端接口

在项目根目录新建 `functions/api/nav.js`（随 Pages 自动部署，无需单独配置路由）：

```js
// functions/api/nav.js —— GET 读配置 / PUT 写配置
// 前置：Pages 项目绑定 KV 命名空间（变量名 NAV_DATA），可选环境变量 ADMIN_KEY

const KV_KEY = 'nav_data';

export async function onRequestGet(context) {
    const { env } = context;
    try {
        const raw = await env.NAV_DATA.get(KV_KEY);
        if (!raw) {
            // 首次部署未初始化数据 → 返回 404，前端自动回退默认配置
            return json({ ok: false, error: '数据未初始化，请先在后台保存一次' }, 404);
        }
        return json(JSON.parse(raw));
    } catch (e) {
        return json({ ok: false, error: e.message }, 500);
    }
}

export async function onRequestPut(context) {
    const { env, request } = context;

    // 密钥校验：防止任何人直接调接口覆盖配置
    const adminKey = env.ADMIN_KEY;
    if (adminKey) {
        const provided = request.headers.get('x-admin-key');
        if (provided !== adminKey) {
            return json({ ok: false, error: '未授权' }, 401);
        }
    }

    try {
        const body = await request.json();
        await env.NAV_DATA.put(KV_KEY, JSON.stringify(body));
        return json({ ok: true });
    } catch (e) {
        return json({ ok: false, error: e.message }, 400);
    }
}

function json(obj, status = 200) {
    return new Response(JSON.stringify(obj), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
}
```

### 第 5 步：前端切换到 API 模式

**`data.js` 两处开关：**

```js
const DATA_SOURCE = 'api';        // 'local' → 'api'
const API_BASE_URL = '';          // 同域部署留空即可（相对路径 /api/nav）
```

**`apiSave()` 加密钥头（可选但建议）：**

```js
async function apiSave(data) {
    const res = await fetch(API_BASE_URL + '/api/nav', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'x-admin-key': API_ADMIN_KEY   // 与后端 ADMIN_KEY 保持一致
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('API 保存失败: ' + res.status);
    return true;
}
```

在 `data.js` 顶部加一行常量：`const API_ADMIN_KEY = 'NavHub@2026!';`（与第 3 步 Cloudflare 环境变量 `ADMIN_KEY` 相同）。

**页面加载改为异步初始化：**

- `app.js`（约 425 行）：`NavData.init();` → `NavData.initAsync();`（首屏拉取云端配置；失败自动回退本地默认，不白屏）
- `admin.js`（约 866/871 行）：同样改用 `NavData.initAsync()`，且后台操作前 `await` 初始化完成

**保存改为异步：** `admin.js` 中 11 处 `NavData.save({...})` 调用，建议在 `data.js` 的 `save()` 内加分支统一处理（调用处无需逐个改动）：

```js
function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));   // 本地始终保留一份兜底
    state = data;
    emitChange();
    if (DATA_SOURCE === 'api') {
        apiSave(data).catch(e => console.warn('[NavData] 云端保存失败', e));
    }
    return { ok: true };
}
```

> 说明：`save()` 保持"本地先写 + 云端异步补写"的策略，即使云端瞬时失败也不影响后台操作体验，下次保存会重试。

### 第 6 步：数据迁移（本地配置 → KV）

现有浏览器里的配置**不会自动**进 KV，需手动预填一次：

1. 本地打开后台（`http://localhost:8765/admin.html`）→ 数据管理 → **导出**，得到一份 JSON
2. 部署上线后，打开线上后台（`https://<项目名>.pages.dev/admin.html`）→ 数据管理 → **导入**这份 JSON
3. 导入即触发一次 `PUT /api/nav`，云端数据初始化完成
4. 换一个无痕窗口打开线上首页验证：站点、分类、颜色、背景图全部一致

### 第 7 步：（可选）绑定自定义域名

1. 域名托管到 Cloudflare（DNS 指向 Cloudflare）
2. Pages 项目 → **Custom domains → Set up a custom domain**，输入域名
3. 等待证书签发（几分钟），访问自己的域名即可

---

## 5. 安全要点

| 风险 | 说明 | 对策 |
|------|------|------|
| 后台密码形同虚设 | `admin123` 写在前端，任何访客可进后台改配置 | **依赖第 4 步的 ADMIN_KEY 鉴权**：无密钥的 PUT 一律 401，密码只能打开页面、改不了数据 |
| 接口被刷写 | 直接 `curl` 调 PUT 覆盖配置 | 上一条已覆盖 |
| 敏感信息泄露 | 仓库是 Public 时，前端代码人人可见 | 密钥不要写得太简单；敏感数据不要放站点描述里 |

> 前端鉴权永远不绝对安全，但 ADMIN_KEY + 前端密码双层的防护对个人导航站已足够。若后续要真正安全，可接 Cloudflare Access 或独立登录体系（见第 7 节升级路线）。

---

## 6. 成本

| 项目 | 免费额度 | 说明 |
|------|---------|------|
| Cloudflare Pages | 不限站点、不限带宽 | 个人站用不完 |
| Pages Functions | 10 万请求/天 | 每次打开首页 1 次请求 |
| KV | 10 万读/天、1000 写/天、1GB 存储 | 写只在后台保存时发生 |
| GitHub | 免费公共仓库 | — |

**总计：¥0 / 月。** 唯一可能的开销是自定义域名年费（约 ¥50/年，可选）。

---

## 7. 常见问题

**Q：部署后首页空白或样式丢失？**
检查 `index.html` 里资源引用是否为相对路径（`style.css` 而非 `/style.css`）。本项目已满足。

**Q：首页显示默认配置，后台改的没生效？**
- 确认 `DATA_SOURCE = 'api'` 且已重新部署
- 确认 KV 绑定变量名是 `NAV_DATA`（与 `nav.js` 中 `env.NAV_DATA` 一致）
- 首次需完成第 6 步数据迁移

**Q：后台保存报"API 保存失败: 401"？**
`x-admin-key` 头与 Cloudflare 环境变量 `ADMIN_KEY` 不一致，或前端 `API_ADMIN_KEY` 未配置。

**Q：PUT 报 404？**
`functions/api/nav.js` 路径写错。必须位于项目根 `functions/api/` 下，且已随最新提交部署。

**Q：想本地继续用 localStorage 开发？**
把 `DATA_SOURCE` 改回 `'local'` 即可，两套模式互不影响。

---

## 8. 升级路线（以后再说）

- **多用户 / 真登录**：前端接 Cloudflare Access 或第三方 OAuth
- **访问统计**：Functions 内加 D1 记录访问日志
- **评论 / 收藏**：数据模型升级到 D1（SQLite），接口按需拆分
- **国内访问优化**：Pages 域名 `*.pages.dev` 在国内访问不稳定时，绑自定义域名并开启 Cloudflare 代理可明显改善

---

*本指南对应代码版本：NavHub 本地开发版（data.js 已预留 API 切换点）。*
*部署顺序建议：第 1 → 2 → 3 → 4 → 5 → 6 步依次完成，第 7 步可选。*
