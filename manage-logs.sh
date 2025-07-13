#!/bin/bash

# 日志管理脚本
# 用于查看、清理和维护前端应用日志

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 远程服务器配置
REMOTE_HOST="8.210.141.61"
REMOTE_USER="root"
LOG_DIR="/opt/cryptoquantx/logs"

# 显示帮助信息
show_help() {
    echo -e "${BLUE}前端日志管理工具${NC}"
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  view [类型]     查看指定类型的日志 (access/error/api)"
    echo "  tail [类型]     实时查看指定类型的日志"
    echo "  rotate          手动执行日志轮转"
    echo "  clean [天数]    清理指定天数之前的日志 (默认: 3)"
    echo "  stats           显示日志统计信息"
    echo "  help            显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 view access  - 查看访问日志"
    echo "  $0 tail error   - 实时跟踪错误日志"
    echo "  $0 rotate       - 手动执行日志轮转"
    echo "  $0 clean 5      - 清理5天前的日志"
    echo "  $0 stats        - 显示日志统计信息"
}

# 检查SSH连接
check_connection() {
    echo -e "${BLUE}正在连接远程服务器...${NC}"
    if ! ssh -q $REMOTE_USER@$REMOTE_HOST exit; then
        echo -e "${RED}无法连接到远程服务器${NC}"
        exit 1
    fi
}

# 查看日志
view_log() {
    local log_type=$1
    local log_file=""
    
    case $log_type in
        access)
            log_file="access.log"
            ;;
        error)
            log_file="error.log"
            ;;
        api)
            log_file="api-access.log"
            ;;
        *)
            echo -e "${RED}未知的日志类型: $log_type${NC}"
            echo "可用类型: access, error, api"
            exit 1
            ;;
    esac
    
    echo -e "${BLUE}查看 $log_type 日志:${NC}"
    ssh $REMOTE_USER@$REMOTE_HOST "cat $LOG_DIR/$log_file | less"
}

# 实时查看日志
tail_log() {
    local log_type=$1
    local log_file=""
    
    case $log_type in
        access)
            log_file="access.log"
            ;;
        error)
            log_file="error.log"
            ;;
        api)
            log_file="api-access.log"
            ;;
        *)
            echo -e "${RED}未知的日志类型: $log_type${NC}"
            echo "可用类型: access, error, api"
            exit 1
            ;;
    esac
    
    echo -e "${BLUE}实时查看 $log_type 日志 (按 Ctrl+C 退出):${NC}"
    ssh $REMOTE_USER@$REMOTE_HOST "tail -f $LOG_DIR/$log_file"
}

# 手动执行日志轮转
rotate_logs() {
    echo -e "${BLUE}执行日志轮转...${NC}"
    ssh $REMOTE_USER@$REMOTE_HOST "sudo logrotate -f /etc/logrotate.d/cryptoquantx"
    echo -e "${GREEN}日志轮转完成${NC}"
}

# 清理指定天数之前的日志
clean_logs() {
    local days=$1
    
    if [ -z "$days" ]; then
        days=3
    fi
    
    echo -e "${YELLOW}清理 $days 天前的日志...${NC}"
    ssh $REMOTE_USER@$REMOTE_HOST "find $LOG_DIR -name '*.log.*' -type f -mtime +$days -exec rm {} \;"
    echo -e "${GREEN}日志清理完成${NC}"
}

# 显示日志统计信息
show_stats() {
    echo -e "${BLUE}日志统计信息:${NC}"
    ssh $REMOTE_USER@$REMOTE_HOST "echo '日志文件大小:'; du -h $LOG_DIR/*.log*; echo ''; echo '日志文件数量:'; ls -la $LOG_DIR/*.log* | wc -l; echo ''; echo '最近的日志文件:'; ls -la $LOG_DIR/*.log* | head -5"
}

# 主函数
main() {
    local command=$1
    local param=$2
    
    check_connection
    
    case $command in
        view)
            view_log $param
            ;;
        tail)
            tail_log $param
            ;;
        rotate)
            rotate_logs
            ;;
        clean)
            clean_logs $param
            ;;
        stats)
            show_stats
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            echo -e "${RED}未知命令: $command${NC}"
            show_help
            exit 1
            ;;
    esac
}

# 如果没有参数，显示帮助
if [ $# -eq 0 ]; then
    show_help
    exit 0
fi

# 执行主函数
main "$@" 