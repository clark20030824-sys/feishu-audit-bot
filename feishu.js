// 飞书 API 封装：鉴权、下载附件、发消息
const TOKEN_URL = 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal';
const BOT_INFO_URL = 'https://open.feishu.cn/open-apis/bot/v3/info';
const SEND_URL = 'https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id';

let tokenCache = { token: null, expire: 0 };

async function getTenantAccessToken(appId, appSecret) {
  const now = Date.now();
  if (tokenCache.token && tokenCache.expire > now + 60_000) return tokenCache.token;
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error('获取 tenant_access_token 失败: ' + JSON.stringify(data));
  tokenCache.token = data.tenant_access_token;
  tokenCache.expire = now + (data.expire - 60) * 1000;
  return tokenCache.token;
}

async function getBotOpenId(token) {
  const res = await fetch(BOT_INFO_URL, { headers: { Authorization: 'Bearer ' + token } });
  const data = await res.json();
  if (data.code !== 0) throw new Error('获取机器人信息失败: ' + JSON.stringify(data));
  return data.bot.open_id;
}

// 下载消息里的附件（file / image / media 都走 stream 接口）
async function downloadAttachment(token, key, kind = 'file') {
  const endpoint = kind === 'image' ? 'images' : 'files';
  const res = await fetch(`https://open.feishu.cn/open-apis/im/v1/${endpoint}/${key}?type=stream`, {
    headers: { Authorization: 'Bearer ' + token },
  });
  if (!res.ok) throw new Error(`下载附件失败 ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const disposition = res.headers.get('content-disposition') || '';
  const nameMatch = disposition.match(/filename="?([^";]+)"?/);
  const name = nameMatch ? decodeURIComponent(nameMatch[1]) : (kind === 'image' ? 'image.png' : 'file.bin');
  return { name, data: buf };
}

// 以机器人身份发消息（msgType: text / post / interactive）
async function sendMessage(token, chatId, msgType, contentObj) {
  const res = await fetch(SEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ receive_id: chatId, msg_type: msgType, content: JSON.stringify(contentObj) }),
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error('发送消息失败: ' + JSON.stringify(data));
  return data;
}

module.exports = { getTenantAccessToken, getBotOpenId, downloadAttachment, sendMessage };
