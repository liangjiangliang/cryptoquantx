FROM node:16-alpine as build

WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制源代码
COPY . .

# 构建项目
RUN npm run build

# 第二阶段：使用nginx托管静态文件
FROM nginx:1.23-alpine

# 复制构建产物到nginx目录
COPY --from=build /app/build /usr/share/nginx/html

# 调试当前工作目录
RUN echo "当前工作目录:" && pwd && echo "目录内容:" && ls -la

# 复制nginx配置文件
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"] 