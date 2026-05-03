import type {Context} from 'hono'
import {Hono} from 'hono'

/** 按 Cloudflare Pages/Workers 推荐模式设置全局 CORS 头 */
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
}

// CORS 预检响应
const corsPreflight = () =>
    new Response(null, {status: 204, headers: CORS_HEADERS})

/** 通用 ZeroTier proxy API Handler */
async function handleApi(c: Context) {
    // 预检请求
    if (c.req.method.toUpperCase() === 'OPTIONS') {
        return corsPreflight()
    }

    const token = c.req.query('token')
    const path = c.req.query('path')
    const server = c.req.query('server')

    // 参数检查
    if (!token || !path) {
        return c.json({error: 'missing token or path parameter'}, 400, CORS_HEADERS)
    }
    if (!path.startsWith('/')) {
        return c.json({error: 'path must start with "/"'}, 400, CORS_HEADERS)
    }

    // 构建 ZeroTier API 请求
    const apiUrl = server ? `http://${server}${path}` : `https://api.zerotier.com/api/v1${path}`
    const method = c.req.method.toUpperCase()
    const headers: Record<string, string> = server ? {'X-ZT1-Auth': token} : {
        'Authorization': `token ${token}`
    }
    // 只转发 content-type，如果存在
    const contentType = c.req.header('content-type')
    if (contentType) headers['Content-Type'] = contentType

    // 处理 body
    let body: ArrayBuffer | undefined = undefined
    if (!['GET', 'HEAD'].includes(method)) {
        try {
            const arr = await c.req.arrayBuffer()
            if (arr && arr.byteLength > 0) body = arr
        } catch { /* ignore */
        }
    }

    // 代理请求
    try {
        const resp = await fetch(apiUrl, {
            method,
            headers,
            body
        })
        const respType = resp.headers.get('content-type') || ''
        // 仅当内容类型为 JSON 时解析，否则作为文本/二进制返还
        if (respType.includes('application/json')) {
            const json = await resp.json();
            return c.json(json as any, resp.status as any, {
                ...CORS_HEADERS,
                'Content-Type': 'application/json'
            });
        }
        // 其它内容类型（如 text/html, image/jpeg, etc），用原生 resp.body
        return new Response(await resp.arrayBuffer(), {
            status: resp.status,
            headers: {
                ...CORS_HEADERS,
                'Content-Type': respType || 'application/octet-stream'
            }
        })
    } catch (error: any) {
        return c.json({error: error?.message || String(error)}, 500, CORS_HEADERS)
    }
}

// Hono router setup
const app = new Hono()

app.all('/api', handleApi)

// 其它路径代理到 ASSETS
app.all('*', async (c: Context) => {
    // wrangler.toml 需配置
    // [site]
    // bucket = "./dist"
    // name = "ASSETS"
    // 这里假定 c.env.ASSETS fetch 可用
    // 可根据需要做 404 fallback 处理
    // 静态资源处理
    const assets = await c.env.ASSETS.fetch(c.req.raw)
    // 如果静态资源不为 404，直接返回
    if (assets.status !== 404) return assets
    // 否则返回首页
    return await c.env.ASSETS.fetch(new Request(new URL('/index.html', c.req.url), c.req.raw))
})

export default app