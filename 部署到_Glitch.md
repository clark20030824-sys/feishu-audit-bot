# 部署到 Glitch（免费 · 免信用卡）

适用：飞书审核机器人后台（`index.js` + Express，纯 Node 项目，无需 Docker）。
Glitch 免费层**不需要信用卡**，导入 GitHub 仓库即可运行，适合低频使用的飞书 webhook 机器人。

> 安全提示：本指南**不写入任何真实密钥**。下方环境变量里的 `FEISHU_APP_SECRET` 与 `LLM_API_KEY`
> 请填你**本地 `飞书审核后台/.env`** 中的真实值（仅填在 Glitch 网站的 .env 里，不要提交到公开仓库）。

> 注：Hugging Face Spaces 自 2026-07 起把 Docker/Gradio Spaces 改为必须 PRO 付费，已不可用于本项目的免费部署；故改选 Glitch。

---

## 0. 前置
- 已注册 glitch.com（用 GitHub 登录即可，**免卡**）
- 本仓库已推到 GitHub（公开）：`https://github.com/clark20030824-sys/feishu-audit-bot`
- 仓库根目录有 `package.json`，`start` 脚本为 `node index.js`，且代码已用 `process.env.PORT`（Glitch 会自动注入端口）

## 1. 导入仓库建项目
1. 登录 Glitch → 右上角 **New Project** → **Import from GitHub**
2. 授权 GitHub 后，选仓库 `clark20030824-sys / feishu-audit-bot`
3. Glitch 自动 `npm install` 并 `npm start`
4. 完成后拿到地址：`https://<你的项目名>.glitch.me`

> 若不想连 GitHub，也可 New Project → hello-express 模板，再把仓库文件复制进去（或 `git` 拉取）。

## 2. 配置环境变量（.env）
Glitch 的 `.env` 是私有的（不会公开，也不进 GitHub）：
1. 在项目编辑器里点左下角 **Tools → .env**（或直接在文件树新建 `.env`）
2. 逐项添加以下 9 个变量。**其中带 `< >` 的两项填你本地 `.env` 里的真实值**：

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

> `PORT` 填 `3000` 即可（Glitch 内部会做端口映射；代码里 `process.env.PORT||3000` 会读到）。
> 保存后 Glitch 会自动重启服务。

## 3. 保活（防止免费版休眠）
Glitch 免费版约 **5 分钟无 HTTP 请求会休眠**（首次唤醒有 1–3 秒冷启动）。飞书事件回调需要秒级响应，所以加一个保活监控：

1. 注册 uptimerobot.com（免费）
2. **Add New Monitor** → Type: **HTTP(s)**，URL: `https://<你的项目名>.glitch.me/`（注意结尾 `/`）
3. Monitoring Interval: **Every 5 minutes**
4. 保存

这样服务基本常驻；即便偶发冷启动，飞书事件投递有重试机制，通常会自动补发，不影响最终出报告。

## 4. 飞书开放平台配置
在 open.feishu.cn 你的自建应用里：
1. **权限管理**开通：`im:message`、`im:message:send_as_bot`、`im:resource:attach:download`
2. **事件订阅** → 请求网址 URL 填：`https://<你的项目名>.glitch.me/feishu/event`
   - 保存时飞书会发 `url_verification` challenge，后台已自动回 `challenge` 通过验证
3. 添加事件：**`im.message.receive_v1`**
4. 把机器人加进审核群 → **发布应用**（建版本 + 发布）

## 5. 测试
在审核群里 **@机器人** 并发送「客户要求」+「设计方案」文件（可分两次发，凑齐 2 份或回复"生成"即出报告）→ 机器人应自动回「正在生成…」并随后发审核报告卡片，@ 审核人。

## 限制与备选
- Glitch 免费版：512MB RAM、约 5 分钟休眠、12 小时自动停、约 4000 请求/小时。本 bot 很轻量，完全够用。
- 项目源码默认公开（不含 .env 密钥），可接受；若要私有需升级 Pro。
- 若未来 Glitch 也改为收费，备选：**Koyeb**（免卡但部分地区需绑卡）/ **Serv00**（真·免费 VPS，需 SSH 维护）。
