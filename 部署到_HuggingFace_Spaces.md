# 部署到 Hugging Face Spaces（免费 · 免信用卡）

适用：飞书审核机器人后台（`index.js` + Express）。
HF Spaces 免费版**不需要信用卡**，给固定 HTTPS 公网 URL，飞书事件回调可直接用。

---

## 0. 前置
- 已注册 huggingface.co（可用 GitHub / Google 登录，免卡）
- 本仓库已推到 GitHub：`https://github.com/clark20030824-sys/feishu-audit-bot`
- 内含 `Dockerfile`（监听 7860 端口，HF 用 Docker SDK 构建）

## 1. 新建 Space
1. 右上角头像 → **New Space**
2. 填 Space 名称（如 `feishu-audit-bot`）
3. **SDK** 选 **Docker**
4. **Visibility** 选 **Public**
5. 勾选 **Import from GitHub repo**，填 `clark20030824-sys/feishu-audit-bot`
6. 创建后会自动从仓库的 `Dockerfile` 构建

> 构建日志在 Space 页面的 Logs / Building 标签可见，约 1–3 分钟。
> 构建完成后拿到地址：`https://<你的HF用户名>-<空间名>.hf.space`

## 2. 配置环境变量（Secrets / Variables）
进入 Space → **Settings → Variables and secrets**，逐项添加：

| 名称 | 值 |
|---|---|
| `FEISHU_APP_ID` | `cli_aa0fbbb08938dbd5` |
| `FEISHU_APP_SECRET` | `qstY7O4C8SX2NnFEypp8je5ZLvRhPn6D` |
| `FEISHU_VERIFICATION_TOKEN` | （留空） |
| `CALLBACK_PATH` | `/feishu/event` |
| `LLM_API_BASE` | `https://api.siliconflow.cn/v1` |
| `LLM_API_KEY` | `sk-jofxgumskqibgsxyncvlxasrrofbxhxyiwwnucgmzcoyzdte` |
| `LLM_MODEL` | `Qwen/Qwen2.5-7B-Instruct` |
| `AUDITOR_OPEN_ID` | `ou_ffa741dd83eb41ea4da3adaefd9a6bc8` |
| `PORT` | 不填（HF 自己注入 7860） |

保存后 Space 会自动重启。

## 3. 保活（防止免费版休眠）
HF 免费版约 48 小时无请求会休眠，首次唤醒有冷启动延迟。飞书回调需要秒级响应，所以用 UptimeRobot 定时 ping：

1. 注册 uptimerobot.com（免费）
2. **Add New Monitor** → Monitor Type: **HTTP(s)**
3. URL: `https://<你的HF用户名>-<空间名>.hf.space/`（注意结尾 `/`）
4. Monitoring Interval: **Every 5 minutes**
5. 保存

这样服务始终被"保活"，飞书回调不会踩到冷启动。

## 4. 飞书开放平台配置
在 open.feishu.cn 你的自建应用里：
1. **权限管理**开通：`im:message`、`im:message:send_as_bot`、`im:resource:attach:download`
2. **事件订阅** → 请求网址 URL 填：`https://<你的HF用户名>-<空间名>.hf.space/feishu/event`
   - 保存时飞书会发 `url_verification` challenge，后台已自动回 `challenge` 通过验证
3. 添加事件：**`im.message.receive_v1`**
4. 把机器人加进审核群 → **发布应用**（建版本 + 发布）

## 5. 测试
在审核群里 **@机器人** 并发送「客户要求」+「设计方案」文件（可分两次发，凑齐 2 份或回复"生成"即出报告）→ 机器人应自动回「正在生成…」并随后发审核报告卡片，@ 审核人。

## 排错
- 飞书保存回调 URL 报"验证失败"：看 Space Logs 是否启动成功；确认 `/feishu/event` 路径与 `CALLBACK_PATH` 一致。
- 收不到回复：确认已开通 `im.message.receive_v1` 且机器人已加群并发布；看 Space Logs 有无报错。
- 报告内容为空/报错：检查 `LLM_API_KEY` 与 SiliconFlow 额度。
