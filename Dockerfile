# 飞书审核机器人 -> Hugging Face Spaces (Docker SDK)
FROM node:18-alpine

WORKDIR /app

# 先装依赖（利用构建缓存）
COPY package*.json ./
RUN npm install --omit=dev

# 再拷源码
COPY . .

# Hugging Face Spaces 默认把流量路由到 7860 端口
ENV PORT=7860
EXPOSE 7860

CMD ["npm", "start"]
