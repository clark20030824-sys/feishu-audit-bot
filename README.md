# 飞书审核机器人后台（@ 触发自动出报告）

群里 `@机器人` 并发送「客户要求」「设计方案」文件 → 机器人自动读取素材 → 调大模型生成审核报告 → 以机器人身份回群并 `@` 负责人。

## 一、飞书开放平台配置

1. 打开 `https://open.feishu.cn` → 创建**企业自建应用**，拿到 `App ID` / `App Secret`。
2. **权限**：开通
   - `im:message`（接收消息）
   - `im:message:send_as_bot`（以机器人身份发消息）
   - `im:resource`（读取图片/文件）
   - `contact:user.id:readonly`（解析 @ 成员）
3. **事件订阅**：开启事件 `im.message.receive_v1`（接收消息），把请求地址填成 `https://你的公网域名/feishu/event`（路径与 `.env` 的 `CALLBACK_PATH` 一致）。
4. 把该自建应用的**机器人**加进你的审核群，然后**发布应用**（通常需管理员审批）。

## 二、本地运行

```bash
cd 飞书审核后台
cp .env.example .env      # 填入 App ID / Secret / LLM 密钥
npm install
npm start                 # 默认监听 3000
```

### 本地调试（无公网）
用 ngrok 把本地暴露出去，再把 ngrok 地址配到飞书事件订阅：
```bash
ngrok http 3000
# 复制 https://xxxx.ngrok-free.app ，在飞书填 https://xxxx.ngrok-free.app/feishu/event
```

## 三、使用方式
在审核群里：
1. `@机器人` 并发送「客户要求」文件；
2. 再 `@机器人` 并发送「设计方案」文件（或直接一次性发两份）；
3. 机器人回“正在生成…”，随后发出**审核报告卡片**并 `@` 负责人。

> 也可在 `@机器人` 时只发一条消息并带关键词「生成 / 审核 / 出报告」+ 附件，立即出报告。

## 四、可改点
- `auditPrompt.js`：审核口径（价格 / 可量产 / 交期 / 结论 / 指派）。
- `.env` 的 `LLM_API_BASE`：换成你的 UPP/antpkg 或任意 OpenAI 兼容服务。
- `.env` 的 `AUDITOR_OPEN_ID`：固定 `@` 某位审核负责人；留空则 `@` 触发消息的发送人。

## 五、接口说明（供对接/排错）
- 事件校验：`x-lark-signature = base64(HmacSHA256(timestamp + nonce + body, AppSecret))`
- 取 token：`POST /auth/v3/tenant_access_token/internal`
- 取机器人 open_id：`GET /bot/v3/info`
- 下载附件：`GET /im/v1/files/:file_key?type=stream`（图片用 `/im/v1/images/:image_key`）
- 回消息：`POST /im/v1/messages?receive_id_type=chat_id`，`msg_type=interactive`，卡片里用 `{"tag":"at","user_id":"ou_xxx"}` @人
