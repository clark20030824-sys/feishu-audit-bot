# 部署到免费云主机（Render）— 你电脑全程可关机

> 目标：把 `飞书审核后台` 跑在 Render 云端。飞书事件推到云端 bot，大模型跑在 SiliconFlow 云端。
> 你电脑无需开机、无任何本地算力负担，审核提示词/报告格式仍用我们写的那套。

---

## 一、你需要准备的账号（都免费）
1. **GitHub**（托管代码）：https://github.com
2. **Render**（跑 bot）：https://render.com （可用 GitHub 登录）
3. **SiliconFlow**（大模型，base 已在配置里）：https://siliconflow.cn → 注册拿 `sk-` 开头的 API Key

---

## 二、把代码推到 GitHub
在本机 `飞书审核后台/` 目录执行一次即可（之后 bot 在云端跑，本机不用再开）：
```bash
git init
git add .
git commit -m "feishu audit bot"
# 然后在 GitHub 网页新建一个仓库，比如 feishu-audit-bot，再执行：
git remote add origin https://github.com/你的用户名/feishu-audit-bot.git
git push -u origin main
```
> 注意：`.env` 已被 `.gitignore` 排除，不会上传你的密钥。

---

## 三、Render 部署
1. 登录 Render → **New → Web Service** → 连 GitHub 选 `feishu-audit-bot`
2. 设置：
   - Runtime: **Node**
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Plan: **Free**
   - （仓库根目录已带 `render.yaml`，Render 会自动套用上面的配置，可不用手填）
3. 切到 **Environment**，把下面变量填进去（`sync:false` 的项务必填真实值）：

   | 变量 | 值 |
   |---|---|
   | `FEISHU_APP_ID` | `cli_aa0fbbb08938dbd5` |
   | `FEISHU_APP_SECRET` | `qstY7O4C8SX2NnFEypp8je5ZLvRhPn6D` |
   | `FEISHU_VERIFICATION_TOKEN` | （留空） |
   | `PORT` | `3000` |
   | `CALLBACK_PATH` | `/feishu/event` |
   | `LLM_API_BASE` | `https://api.siliconflow.cn/v1` |
   | `LLM_API_KEY` | `sk-你的SiliconFlowKey` |
   | `LLM_MODEL` | `Qwen/Qwen2.5-7B-Instruct` |
   | `AUDITOR_OPEN_ID` | `ou_ffa741dd83eb41ea4da3adaefd9a6bc8` |

4. 点 **Deploy** → 等 1–2 分钟，拿到地址如 `https://feishu-audit-bot.onrender.com`

---

## 四、接回飞书
1. 飞书开放平台 → 你的自建应用 → **事件与回调 → 事件配置** → 请求网址填：
   `https://feishu-audit-bot.onrender.com/feishu/event`
2. 飞书会发一次 `url_verification` 挑战，云端 bot 立刻回 `challenge` 即通过。
3. 确认机器人已在审核群、应用已**发布**。

---

## 五、防止免费版休眠（重要）
Render 免费版 15 分钟无请求会休眠，首个 webhook 可能卡在冷启动。用 **UptimeRobot**（免费）每 5 分钟 ping 一下：
`https://feishu-audit-bot.onrender.com/`
这样 bot 常驻，@ 触发即时响应。

---

## 六、验证
群里 `@机器人` + 发「客户要求」「设计方案」两份文件 → 云端自动出审核报告回群并 @你。

---

## 备选云主机
- **Railway**（https://railway.app）：不休眠，$5 试用额度，步骤同上（连 GitHub → Deploy）。
- **Vercel**：免休眠但函数有超时限制，大模型处理易超时，本场景不推荐。

## 本地调试仍可用
`.env` 保留本地配置；本机 `npm start` + ngrok（见 `start-tunnel.bat`）也能跑。云部署完成后，本地可不再使用。
