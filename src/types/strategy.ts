export interface StrategyParam {
  [key: string]: string;
}

export interface Strategy {
  id?: number; // 策略ID字段
  default_params: string;
  name: string;
  description: string;
  params: string;
  category: string;
  strategy_code: string;
  source_code?: string; // 策略源代码字段
  load_error?: string; // 加载错误信息字段
  update_time?: string; // 更新时间字段
  comments?: string; // 评价字段
  available?: boolean; // 策略是否可用字段
  best_return?: number; // 最高收益率字段
}

export interface StrategyMap {
  [key: string]: Strategy;
}

export interface ParsedParams {
  [key: string]: any;
}