export interface StrategyParam {
  [key: string]: string;
}

export interface Strategy {
  default_params: string;
  name: string;
  description: string;
  params: string;
  category: string;
  strategy_code: string;
  update_time?: string; // 更新时间字段
  comments?: string; // 评价字段
}

export interface StrategyMap {
  [key: string]: Strategy;
}

export interface ParsedParams {
  [key: string]: any;
}