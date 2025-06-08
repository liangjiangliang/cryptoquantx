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
}

export interface StrategyMap {
  [key: string]: Strategy;
}

export interface ParsedParams {
  [key: string]: any;
} 