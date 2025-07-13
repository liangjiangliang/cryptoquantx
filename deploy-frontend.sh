 #!/bin/bash

# 设置变量
REMOTE_HOST="8.210.141.61"  # 替换为你的远程服务器IP或域名
REMOTE_USER="root"         # 替换为你的远程服务器用户名
REMOTE_DIR="/opt/cryptoquantx"  # 远程服务器上的部署目录
APP_NAME="cryptoquantx"
BACKEND_API_URL="http://8.210.141.61:8088" # 使用实际IP地址而不是localhost

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}===== 开始部署前端服务 =====${NC}"

# 检查是否安装了Node.js和npm
if ! command -v node > /dev/null || ! command -v npm > /dev/null; then
  echo -e "${RED}请先安装Node.js和npm${NC}"
  exit 1
fi

# 创建临时环境配置文件
echo -e "${BLUE}创建生产环境配置文件...${NC}"
cat > .env.production << EOF
REACT_APP_API_URL=${BACKEND_API_URL}
REACT_APP_ENV=production
EOF

# 安装依赖和构建项目
echo -e "${BLUE}安装依赖...${NC}"
npm install

echo -e "${BLUE}构建项目...${NC}"
npm run build

# 检查构建是否成功
if [ ! -d "build" ]; then
  echo -e "${RED}构建失败，build目录不存在${NC}"
  exit 1
fi

echo -e "${GREEN}构建成功${NC}"

# 准备nginx配置文件
echo -e "${BLUE}准备Nginx配置文件...${NC}"
TEMP_DIR="deploy_temp"
mkdir -p $TEMP_DIR

# 拷贝构建产物和配置文件到临时目录
cp -r build $TEMP_DIR/
cp logrotate-config $TEMP_DIR/

# 创建nginx配置文件
cat > $TEMP_DIR/nginx.conf << EOF
server {
    listen 3000;
    server_name localhost;
    charset utf-8;

    root /opt/cryptoquantx/build;
    index index.html;

    # 静态资源缓存配置
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        expires 30d;
    }

    # API请求转发到后端
    location /api/ {
        proxy_pass ${BACKEND_API_URL};
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # 增加超时设置
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
        proxy_buffer_size 16k;
        proxy_buffers 4 16k;
        
        # 显式设置HTTP版本，避免协议不匹配
        proxy_http_version 1.1;
        
        # 启用WebSocket支持
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # API请求日志，记录详细信息
        access_log /opt/cryptoquantx/logs/api-access.log;
        
        # 记录详细的错误日志
        error_log /opt/cryptoquantx/logs/api-error.log warn;
    }

    # 所有其他请求都转发到index.html，支持前端路由
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # 详细的错误日志配置
    error_log  /opt/cryptoquantx/logs/error.log warn;
    # 访问日志配置 - 使用自定义日志格式记录更多信息
    access_log /opt/cryptoquantx/logs/access.log combined;
}
EOF

# 创建部署脚本
cat > $TEMP_DIR/deploy.sh << 'EOF'
#!/bin/bash
# 前端部署脚本

# 检查Nginx是否安装
if ! command -v nginx > /dev/null; then
  echo "请先安装Nginx"
  exit 1
fi

# 创建日志目录
echo "创建日志目录..."
sudo mkdir -p /opt/cryptoquantx/logs
sudo chmod 755 /opt/cryptoquantx/logs

# 复制Nginx配置文件
sudo cp nginx.conf /etc/nginx/conf.d/cryptoquantx.conf

# 设置日志轮转
echo "配置日志轮转..."
sudo cp logrotate-config /etc/logrotate.d/cryptoquantx
sudo chmod 644 /etc/logrotate.d/cryptoquantx

# 检查Nginx配置语法
echo "检查Nginx配置..."
sudo nginx -t
if [ $? -ne 0 ]; then
  echo "Nginx配置有误，请检查配置文件"
  exit 1
fi

# 检查Nginx是否在运行
if systemctl is-active --quiet nginx; then
  echo "Nginx服务正在运行，重新加载配置..."
  sudo systemctl reload nginx
else
  echo "Nginx服务未运行，正在启动..."
  sudo systemctl start nginx
  # 设置开机自启动
  sudo systemctl enable nginx
fi

# 确保Nginx正在运行
if systemctl is-active --quiet nginx; then
  echo "Nginx服务已成功启动/重载"
else
  echo "Nginx服务启动失败，请检查日志"
  sudo systemctl status nginx
  exit 1
fi

# 设置定时任务，确保日志轮转
sudo logrotate -d /etc/logrotate.d/cryptoquantx
echo "日志轮转测试完成"

echo "前端服务已部署完成！"
EOF

# 设置脚本执行权限
chmod +x $TEMP_DIR/deploy.sh

echo -e "${BLUE}正在连接到远程服务器...${NC}"

# 检查远程目录是否存在，不存在则创建
ssh $REMOTE_USER@$REMOTE_HOST "mkdir -p $REMOTE_DIR"

# 上传文件到远程服务器
echo -e "${BLUE}上传文件到远程服务器...${NC}"
scp -r $TEMP_DIR/* $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/

# 部署前端应用
echo -e "${BLUE}部署前端应用...${NC}"
ssh $REMOTE_USER@$REMOTE_HOST "cd $REMOTE_DIR && bash deploy.sh"

# 检查部署是否成功
echo -e "${BLUE}检查前端部署状态...${NC}"
ssh $REMOTE_USER@$REMOTE_HOST "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000"
if [ $? -ne 0 ]; then
  echo -e "${RED}前端应用可能未成功启动，请检查Nginx日志${NC}"
  ssh $REMOTE_USER@$REMOTE_HOST "cat /opt/cryptoquantx/logs/error.log"
else
  echo -e "${GREEN}前端应用已成功启动${NC}"
fi

# 检查后端API是否可访问
echo -e "${BLUE}检查后端API连接状态...${NC}"
ssh $REMOTE_USER@$REMOTE_HOST "curl -s -o /dev/null -w '%{http_code}' ${BACKEND_API_URL}/api/health || echo 'Connection failed'"
if [ $? -ne 0 ]; then
  echo -e "${RED}无法连接到后端API，请检查后端服务是否运行${NC}"
  echo -e "${YELLOW}尝试从前端Nginx代理访问后端服务...${NC}"
  ssh $REMOTE_USER@$REMOTE_HOST "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/health || echo 'Proxy connection failed'"
  echo -e "${RED}请检查后端API地址配置和防火墙设置${NC}"
  ssh $REMOTE_USER@$REMOTE_HOST "cat /opt/cryptoquantx/logs/api-error.log"
else
  echo -e "${GREEN}成功连接到后端API${NC}"
fi

# 清理临时文件
echo -e "${BLUE}清理临时文件...${NC}"
rm -rf $TEMP_DIR

echo -e "${GREEN}===== 前端服务部署完成 =====${NC}"
echo -e "${GREEN}服务已部署到 $REMOTE_HOST:$REMOTE_DIR${NC}"
echo -e "${GREEN}可通过 http://$REMOTE_HOST:3000 访问前端应用${NC}"