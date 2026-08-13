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
