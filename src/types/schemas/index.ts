/**
 * スキーマ定義の統合エクスポートファイル
 * アプリケーション全体で使用するZodスキーマをエクスポートします
 */

// ベーススキーマとユーティリティ関数
export { 
  BaseSchema, 
  validateSchema, 
  validatePartialSchema, 
  getSchema,
  type BaseSchemaType,
  type SchemaRegistry,
} from './base.js';

// 市場概況スキーマ
export {
  MarketSummarySchema,
  MarketIndexSchema,
  StockOverviewSchema,
  marketSchemaRegistry,
  type MarketSummaryType,
  type MarketIndexType,
  type StockOverviewType,
} from './market.js';

// 株価分析スキーマ
export {
  TrendAnalysisSchema,
  SimpleForecastSchema,
  StockComparisonSchema,
  TechnicalAnalysisSchema,
  MovingAveragesSchema,
  MACDSchema,
  BollingerBandsSchema,
  TechnicalIndicatorsSchema,
  stockSchemaRegistry,
  type TrendAnalysisType,
  type SimpleForecastType,
  type StockComparisonType,
  type TechnicalAnalysisType,
  type MovingAveragesType,
  type MACDType,
  type BollingerBandsType,
  type TechnicalIndicatorsType,
} from './stock.js';

/**
 * 統合スキーマレジストリ
 * アプリケーション内の全てのスキーマを一つのオブジェクトにまとめます
 */
import { stockSchemaRegistry } from './stock.js';
import { marketSchemaRegistry } from './market.js';
import { type SchemaRegistry } from './base.js';

export const globalSchemaRegistry: SchemaRegistry = {
  ...stockSchemaRegistry,
  ...marketSchemaRegistry,
}; 