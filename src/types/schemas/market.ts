import { z } from 'zod';
import { BaseSchema } from './base.js';

/**
 * 市場指数（インデックス）のスキーマ
 */
export const MarketIndexSchema = z.object({
  name: z.string().min(1).describe('市場指数の名前'),
  symbol: z.string().min(1).describe('市場指数のシンボル'),
  value: z.number().describe('市場指数の値'),
  change: z.number().describe('市場指数の変化量'),
  percentChange: z.number().describe('市場指数の変化率（%）'),
  currency: z.string().optional().describe('通貨コード'),
});

export type MarketIndexType = z.infer<typeof MarketIndexSchema>;

/**
 * 銘柄概要のスキーマ
 */
export const StockOverviewSchema = z.object({
  symbol: z.string().min(1).describe('株式銘柄コード'),
  name: z.string().describe('会社名'),
  price: z.number().describe('現在の株価'),
  change: z.number().describe('前日比変化量'),
  percentChange: z.number().describe('前日比変化率（%）'),
  volume: z.number().optional().describe('取引量'),
  marketCap: z.number().optional().describe('時価総額'),
  sector: z.string().optional().describe('セクター'),
  industry: z.string().optional().describe('業種'),
});

export type StockOverviewType = z.infer<typeof StockOverviewSchema>;

/**
 * 市場概況のスキーマ
 * 市場の全体的な状況、主要指数、注目銘柄などを含む
 */
export const MarketSummarySchema = BaseSchema.extend({
  date: z.string().describe('市場データの日付'),
  marketStatus: z.enum(['open', 'closed', 'pre-market', 'after-hours']).describe('市場の状態'),
  timestamp: z.string().describe('データのタイムスタンプ（ISO形式）'),
  
  // 主要な市場指数のリスト
  indices: z.array(MarketIndexSchema).describe('主要な市場指数のリスト'),
  
  // 値上がり/値下がり銘柄
  topGainers: z.array(StockOverviewSchema).optional().describe('値上がり上位銘柄'),
  topLosers: z.array(StockOverviewSchema).optional().describe('値下がり上位銘柄'),
  mostActive: z.array(StockOverviewSchema).optional().describe('出来高上位銘柄'),
  
  // 市場の全体的なセンチメントとトレンド
  marketSentiment: z.enum(['bullish', 'bearish', 'neutral']).describe('市場センチメント'),
  marketTrend: z.string().describe('市場トレンドの説明'),
  
  // 主要なニュースヘッドライン（オプショナル）
  newsHeadlines: z.array(
    z.object({
      title: z.string().describe('ニュース見出し'),
      url: z.string().url().describe('ニュースのURL'),
      source: z.string().describe('ニュースソース'),
      timestamp: z.string().describe('ニュースのタイムスタンプ')
    })
  ).optional().describe('主要な市場関連ニュース'),
  
  // 追加の統計情報（オプショナル）
  statistics: z.object({
    advancingStocks: z.number().optional().describe('上昇銘柄数'),
    decliningStocks: z.number().optional().describe('下落銘柄数'),
    unchangedStocks: z.number().optional().describe('変動なし銘柄数'),
    newHighs: z.number().optional().describe('新高値銘柄数'),
    newLows: z.number().optional().describe('新安値銘柄数'),
    totalVolume: z.number().optional().describe('総出来高'),
  }).optional().describe('市場統計情報'),
  
  // 地域や言語などのメタデータ
  region: z.string().describe('市場の地域（例: us, jp, global）'),
  language: z.string().default('ja').describe('データの言語'),
  
  // データソース情報
  source: z.string().describe('データの出所'),
  disclaimer: z.string().optional().describe('免責事項'),
});

export type MarketSummaryType = z.infer<typeof MarketSummarySchema>;

/**
 * 市場スキーマのレジストリ
 * アプリケーション内で使用可能な全ての市場関連スキーマをマッピングします
 */
export const marketSchemaRegistry = {
  'MarketSummarySchema': MarketSummarySchema,
  'MarketIndexSchema': MarketIndexSchema,
  'StockOverviewSchema': StockOverviewSchema,
}; 