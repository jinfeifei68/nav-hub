// functions/api/nav.js —— GET 读配置 / PUT 写配置
// 前置：Pages 项目绑定 KV 命名空间（变量名 NAV_DATA），环境变量 ADMIN_KEY
//
// 安全设计（前端零密码）：
//   - 前端代码不含任何密码明文
//   - 管理员登录后台时输入的密码作为 x-admin-key 请求头发出
//   - 本接口对照环境变量 ADMIN_KEY 校验（密码只存在 Cloudflare 控制台）
//   - GET：带 key 且正确 → 200（认证通过）；带 key 错误 → 401；不带 key → 放行（访客读取）
//   - PUT：必须带正确 key，否则 401

const KV_KEY = 'nav_data';

export async function onRequestGet(context) {
    const { env, request } = context;

    // 可选校验：请求带 x-admin-key 头时进行校验（后台登录验证用）
    const adminKey = env.ADMIN_KEY;
    const provided = request.headers.get('x-admin-key');
    if (provided && adminKey && provided !== adminKey) {
        return json({ ok: false, error: '未授权' }, 401);
    }
    // 是否携带了正确的管理密钥（用于区分"管理员"与"访客"）
    const authed = !!(provided && adminKey && provided === adminKey);

    try {
        const raw = await env.NAV_DATA.get(KV_KEY);
        if (!raw) {
            // 数据未初始化：
            //  - 管理员（key 正确）→ 返回 200，表示认证通过、数据待初始化
            //  - 访客 → 返回 404，前端自动回退默认配置
            if (authed) {
                return json({ ok: true, data: null, initialized: false });
            }
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
