// 飞书审核机器人后台：@机器人 + 附件 → 自动出报告回群
require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const { getTenantAccessToken, getBotOpenId, downloadAttachment, sendMessage } = require('./feishu');
const AUDIT_PROMPT = require('./auditPrompt');

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const VERIFICATION_TOKEN = process.env.FEISHU_VERIFICATION_TOKEN || '';
const PORT = Number(process.env.PORT || 3000);
const CALLBACK_PATH = process.env.CALLBACK_PATH || '/feishu/event';
const LLM_API_BASE = process.env.LLM_API_BASE || 'https://api.openai.com/v1';
const LLM_API_KEY = process.env.LLM_API_KEY;
const LLM_MODEL = process.env.LLM_MODEL || 'gpt-4o-mini';
const AUDITOR_OPEN_ID = process.env.AUDITOR_OPEN_ID || '';

let botOpenId = null; // 本机器人的 open_id，用于判断“是否被 @”
const chatBuffer = {}; // 每个群暂存的附件，支持分批发送

const app = express();

// 保留原始 body 用于签名校验
app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf.toString('utf8'); },
}));

function verifySignature(timestamp, nonce, rawBody, signature) {
  if (!signature) return VERIFICATION_TOKEN ? false : true; // 没配签名则放行（仅校验 token）
  const stringToSign = timestamp + nonce + rawBody;
  const expected = crypto.createHmac('sha256', APP_SECRET).update(stringToSign).digest('base64');
  return expected === signature;
}

// ===== 飞书事件入口 =====
app.post(CALLBACK_PATH, async (req, res) => {
  const body = req.body;

  // 1) URL 验证（飞书事件订阅配置时发的一次性挑战）
  if (body && body.type === 'url_verification') {
    return res.json({ challenge: body.challenge });
  }

  // 2) 签名校验
  const ts = req.headers['x-lark-timestamp'];
  const nonce = req.headers['x-lark-nonce'];
  const sig = req.headers['x-lark-signature'];
  if (VERIFICATION_TOKEN && req.headers['x-lark-token'] && req.headers['x-lark-token'] !== VERIFICATION_TOKEN) {
    return res.status(401).send('verification token mismatch');
  }
  if (!verifySignature(ts, nonce, req.rawBody || '', sig)) {
    return res.status(401).send('signature mismatch');
  }

  // 3) 立刻回 200（飞书要求快速响应），后续异步处理
  res.status(200).send('ok');

  try {
    await handleEvent(body);
  } catch (e) {
    console.error('处理事件失败:', e.message);
  }
});

// ===== 事件处理 =====
async function handleEvent(payload) {
  const evt = payload && payload.event;
  if (!evt || !evt.message) return;
  const msg = evt.message;
  const chatId = msg.chat_id;

  // 仅当消息 @ 了本机器人时才响应
  const mentions = msg.mentions || [];
  if (!botOpenId) {
    const token = await getTenantAccessToken(APP_ID, APP_SECRET);
    botOpenId = await getBotOpenId(token);
  }
  const mentionedMe = mentions.some((m) => m.id === botOpenId);
  if (!mentionedMe) return;

  const senderOpenId = evt.sender && evt.sender.sender_id && evt.sender.sender_id.open_id;

  // 提取附件
  const attachments = await extractAttachments(msg);
  const text = extractText(msg);
  const wantNow = /审核|生成|出报告|report|audit/i.test(text);

  if (attachments.length === 0 && !wantNow) {
    await replyText(chatId, '请在 @ 我时附上「客户要求」和「设计方案」文件（可分批发送，凑齐 2 份或回复“生成”即出报告）。');
    return;
  }

  // 缓冲同群附件
  chatBuffer[chatId] = chatBuffer[chatId] || [];
  chatBuffer[chatId].push(...attachments);

  const ready = wantNow || chatBuffer[chatId].length >= 2;
  if (!ready) {
    await replyText(chatId, `已收到 ${chatBuffer[chatId].length} 份素材，请再发送另一份，或回复“生成”直接出报告。`);
    return;
  }

  const files = chatBuffer[chatId];
  chatBuffer[chatId] = [];

  await replyText(chatId, '收到，正在生成审核报告…');
  const report = await generateReport(files);
  await replyCard(chatId, report, senderOpenId);
}

function extractText(msg) {
  if (msg.message_type !== 'text') return '';
  try { return JSON.parse(msg.content).text || ''; } catch { return ''; }
}

async function extractAttachments(msg) {
  const type = msg.message_type;
  if (type === 'file' || type === 'image' || type === 'media') {
    const content = JSON.parse(msg.content);
    const key = content.file_key || content.image_key || content.media_key;
    if (!key) return [];
    const token = await getTenantAccessToken(APP_ID, APP_SECRET);
    const kind = type === 'image' ? 'image' : 'file';
    const file = await downloadAttachment(token, key, kind);
    return [file];
  }
  return [];
}

// ===== 调用大模型生成报告 =====
async function generateReport(files) {
  const texts = files.map((f) => `【文件：${f.name}】\n${toPlainText(f.data)}`).join('\n\n');
  const res = await fetch(`${LLM_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + LLM_API_KEY },
    body: JSON.stringify({
      model: LLM_MODEL,
      temperature: 0.3,
      messages: [
        { role: 'system', content: AUDIT_PROMPT },
        { role: 'user', content: '以下是客户要求与设计方案素材，请生成审核报告：\n\n' + texts },
      ],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error('LLM 错误: ' + JSON.stringify(data.error));
  return data.choices[0].message.content;
}

function toPlainText(buf) {
  let s = buf.toString('utf8');
  if (/<html|<body|<div/i.test(s)) {
    s = s.replace(/<style[\s\S]*?<\/style>/gi, ' ')
         .replace(/<script[\s\S]*?<\/script>/gi, ' ')
         .replace(/<[^>]+>/g, ' ');
  }
  return s.replace(/\s+/g, ' ').slice(0, 12000);
}

// ===== 回复 =====
async function replyText(chatId, text) {
  const token = await getTenantAccessToken(APP_ID, APP_SECRET);
  await sendMessage(token, chatId, 'text', { text });
}

async function replyCard(chatId, report, senderOpenId) {
  const token = await getTenantAccessToken(APP_ID, APP_SECRET);
  const atId = AUDITOR_OPEN_ID || senderOpenId;
  const card = {
    config: { wide_screen_mode: true },
    header: {
      template: 'blue',
      title: { tag: 'plain_text', content: '包装审核报告' },
    },
    elements: [
      { tag: 'div', text: { tag: 'lark_md', content: report.slice(0, 4000) } },
      { tag: 'hr' },
      {
        tag: 'note',
        elements: [
          { tag: 'at', user_id: atId },
          { tag: 'plain_text', content: ' 请跟进以上审核结论' },
        ],
      },
    ],
  };
  await sendMessage(token, chatId, 'interactive', card);
}

// 简单健康检查
app.get('/', (req, res) => res.send('feishu audit bot is running'));

app.listen(PORT, () => {
  console.log(`飞书审核机器人后台已启动: http://localhost:${PORT}${CALLBACK_PATH}`);
});
