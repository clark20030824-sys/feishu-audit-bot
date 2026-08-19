@echo off
REM 本地联调隧道：先启动后台，再用 ngrok 把 3000 端口暴露到公网
REM 前提：已 npm install；ngrok 已加入 PATH（https://ngrok.com/download）
cd /d %~dp0

echo 1) 启动飞书审核后台...
start "feishu-audit-bot" cmd /k "node index.js"

echo 2) 启动 ngrok 隧道（默认 3000 端口）...
start "ngrok" cmd /k "ngrok http 3000"

echo.
echo === 接下来 ===
echo a) 打开 ngrok 窗口，复制 Forwarding 里的 https 地址（形如 https://xxxx.ngrok-free.app）
echo b) 拼上 /feishu/event ，即 https://xxxx.ngrok-free.app/feishu/event
echo c) 把这个完整地址填到飞书开放平台「事件订阅」的 Request URL，点保存时会自动触发 URL 验证
echo d) 群里 @ 机器人 + 发「客户要求」「设计方案」两份文件，看是否自动回报告
pause
