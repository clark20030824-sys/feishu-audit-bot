# 部署到 Koyeb（免费 · 免信用卡 · 推荐）

适用：飞书审核机器人后台（`index.js` + Express，纯 Node 项目，无需 Docker）。
Koyeb 的 **Hobby 免费计划**：1 个免费 Web 服务（512MB / 0.1 vCPU）、**不需要信用卡**、永不过期、
支持从 GitHub 导入、空闲自动缩容、来流量自动唤醒。截至 2026-08 这是本项目最稳的免费部署目标。

> 安全提示：本指南**不写入任何真实密钥**。下方环境变量里的 `FEISHU_APP_SECRET` 与 `LLM_API_KEY`
> 请填你**本地 `飞书审核后台/.env`** 中的真实值（仅填在 Koyeb 网站的环境变量里，不要提交到公开仓库）。
> 若你还没轮换之前泄露的旧密钥，请先去飞书开放平台 / SiliconFlow 重新生成，再用新值。

> 历史：Hugging Face Spaces 自 2026-07 起 Docker 必须 PRO 付费；Glitch 已于 2026-01 彻底关停。
> 两者均不可用，故改选 Koyeb。

---

## 0. 前置
- 已注册 koyeb.com（用 GitHub 登录即可，**免卡**）
- 本仓库已推到 GitHub（公开）：`https://github.com/clark20030824-sys/feishu-audit-bot`
- 仓库根目录有 `package.json`，`start` 脚本为 `node index.js`，代码已用 `process.env.PORT`（Koyeb 自动注入）

## 1. 导入仓库建服务
1. 登录 Koyeb → 右上角 **Create App**（或 "Deploy an app"）
2. 选择 **GitHub** 来源 → 授权后选仓库 `clark20030824-sys / feishu-audit-bot`
3. **Builder** 选 **Buildpacks**（原生 Node 构建；仓库里已无 Dockerfile，不会误用 Docker）
4. **Instance type / Plan** 选 **Free（Hobby）** —— 512MB / 0.1 vCPU，免费
5. **Port** 留空（代码读 `process.env.PORT`，Koyeb 自动注入；默认 3000 也可）
6. **Start command** 留空（用 package.json 的 `npm start`）
7. 先不要点 Deploy —— 下一节填完环境变量再部署

## 2. 配置环境变量（9 个）
在部署设置里找到 **Environment variables**，逐项添加。**带 `< >` 的两项填你本地 `.env` 里的真实值**：

```
FEISHU_APP_ID=cli_aa0fbbb08938dbd5
FEISHU_APP_SECRET=<你的飞书 App Secret，取自本地 .env>
FEISHU_VERIFICATION_TOKEN=
CALLBACK_PATH=/feishu/event
LLM_API_BASE=https://api.siliconflow.cn/v1
LLM_API_KEY=<你的 SiliconFlow API Key，取自本地 .env>
LLM_MODEL=Qwen/Qwen2.5-7B-Instruct
AUDITOR_OPEN_ID=ou_ffa741dd83eb41ea4da3adaefd9a6bc8
PORT=3000
```

> `PORT` 可填 `3000`；代码 `process.env.PORT||3000` 会正确读取。其余变量见本地 `.env`。

## 3. 部署并拿到地址
1. 点 **Deploy** → Koyeb 自动 `npm install` + `npm start`
2. 完成后在 App 概览拿到地址，形如：
   `https://<你的服务名>-<随机串>.koyeb.app`
3. 在浏览器访问 `https://<地址>/` 应显示 `running`（代码里 GET / 返回 running）

## 4. 保活（防止免费版休眠）
Koyeb 免费实例空闲约 **1 小时会缩容到零**（下次请求自动唤醒，冷启动 <1s）。为保证飞书回调秒级响应，加保活：

1. 注册 uptimerobot.com（免费）
2. **Add New Monitor** → Type: **HTTP(s)**，URL: `https://<你的地址>/`（结尾带 `/`）
3. Monitoring Interval: **Every 5 minutes** → 保存

> 即便偶发冷启动，飞书事件投递有重试机制，通常会自动补发，不影响最终出报告。

## 5. 飞书开放平台配置
在 open.feishu.cn 你的自建应用里：
1. **权限管理**开通：`im:message`、`im:message:send_as_bot`、`im:resource:attach:download`
2. **事件订阅** → 请求网址 URL 填：`https://<你的地址>/feishu/event`
   - 保存时飞书会发 `url_verification` challenge，后台已自动回 `challenge` 通过验证
3. 添加事件：**`im.message.receive_v1`**
4. 把机器人加进审核群 → **发布应用**（建版本 + 发布）

## 6. 测试
在审核群里 **@机器人** 并发送「客户要求」+「设计方案」文件（凑齐 2 份或回复"生成"即出报告）
→ 机器人应自动回「正在生成…」并随后发审核报告卡片，@ 审核人。

## 限制与备选
- Koyeb 免费 Hobby：512MB RAM / 0.1 vCPU，官方标注"非生产级"，但本 bot 很轻量，完全够用。
- 免费实例有缩容到零的行为，靠 UptimeRobot 每 5 分钟 ping 保活即可常驻。
- 若 Koyeb 将来变动：备选 **Replit**（免卡、免费层 1 个已发布应用、约 5 分钟休眠）或 **Render**（免费但注册可能要绑卡）。
