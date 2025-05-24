# CryptoQuantX

CryptoQuantX是一个专注于加密货币量化交易的平台，提供专业的K线图表展示、回测和实盘交易功能。

## 功能特点

- 专业K线图表展示，支持多种技术指标
- 实时市场数据查询和历史数据加载
- 交易对和时间周期自由切换
- 量化交易策略开发和回测
- 实盘交易接口集成

## 技术栈

- React + TypeScript
- Redux 状态管理
- Lightweight Charts 图表库
- RESTful API 集成

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm start
```

### 构建生产版本

```bash
npm run build
```

## API 接口

系统集成了以下API接口：

- `/api/market/query_saved_history` - 查询已保存的历史K线数据
- `/api/market/fetch_history_with_integrity_check` - 获取并检查历史数据完整性

## 项目结构

```
src/
  ├── components/      # UI组件
  │   ├── Chart/       # 图表相关组件
  │   ├── DataLoadModal/ # 数据加载弹窗
  │   └── ...
  ├── services/        # API服务
  ├── store/           # Redux状态管理
  └── ...
```

## 贡献指南

欢迎提交问题和功能请求。对于重大更改，请先打开一个issue讨论您想要更改的内容。

## 许可证

[MIT](https://choosealicense.com/licenses/mit/)
