# 🌐 ZTPanel 使用与部署说明

**ZTPanel** 是一个基于 **Cloudflare Worker** 和 **ZeroTier API** 的简洁管理面板，它可以帮助你快速查看和管理 ZeroTier 局域网设备。

---

## 🚀 主要功能

- 🌐 **查看所有 ZeroTier 网络及成员设备信息**
- 🔑 **授权/取消授权成员、编辑设备信息、实时在线状态**
- 💻 **控制客户端加入离开网络**
- 🔒 **纯静态页面不做任何存储，安全可控**

---

## 🛠️ 如何快速部署

### 1. 获取项目

```bash
git clone https://github.com/Zakkoree/ZTPanel.git
cd ztpanel
pnpm install
```

> 如未安装 pnpm，可先执行：`npm i -g pnpm`

### 2. 配置 Cloudflare Worker

- 若第一次使用 [Cloudflare Workers](https://developers.cloudflare.com/workers/)，请先注册账号并[安装 Wrangler](https://developers.cloudflare.com/workers/wrangler/get-started/)：

  ```bash
  npm i -g wrangler
  ```
  
- `wrangler.toml` 默认配置保持不变即可，特殊域名或自定义变量可直接编辑。

### 3. 部署

```bash
pnpm run deploy
```

- 若首次部署会自动引导 Cloudflare 认证
- 成功后会输出你的专属访问地址（如 `https://ztpanel.your_cloudflare_name.workers.dev`）

---

## 🧪 在线 DEMO

> **已禁用 Workers 日志，放心食用，建议部署自己的实例。**

- [ztpanel.zakkoree.workers.dev](https://ztpanel.zakkoree.workers.dev)
- [zau.cc.cd](https://zau.cc.cd)

---

## 📖 常见问题

**Q1：会不会泄露我的 ZeroTier Token？**  
A：仅使用 Token 调 ZeroTier API，不做任何存储。 <br> 
ps：使用url传参方式，你的浏览器浏览会有记录和开启Workers日志会有记录

**Q2：Token 怎么获取？**  
A：[ZeroTier 官网 Token 获取地址](https://my.zerotier.com/account#tokens)

---

## 📝 版权与免责声明

- 本项目遵循 [MIT License](LICENSE)。
- 本工具仅作学习与交流，请勿用于非法用途。
- ZeroTier 是 ZeroTier, Inc. 的注册商标，本项目为个人开发无商业关联。

---

**享受极简、安全、便捷的 ZeroTier 网络管理体验 😄**