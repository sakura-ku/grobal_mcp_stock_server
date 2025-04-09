import { z } from 'zod';
import { BaseSchema } from './base.js';

/**
 * 移動平均指標のスキーマ
 */
export const MovingAveragesSchema = z.object({
  sma50: z.number().describe('50日単純移動平均'),
  sma200: z.number().describe('200日単純移動平均'),
  ema12: z.number().describe('12日指数移動平均'),
  ema26: z.number().describe('26日指数移動平均'),
});

export type MovingAveragesType = z.infer<typeof MovingAveragesSchema>;

/**
 * MACDインジケータのスキーマ
 */
export const MACDSchema = z.object({
  line: z.number().describe('MACDライン'),
  signal: z.number().describe('シグナルライン'),
  histogram: z.number().describe('MACDヒストグラム'),
});

export type MACDType = z.infer<typeof MACDSchema>;

/**
 * ボリンジャーバンドのスキーマ
 */
export const BollingerBandsSchema = z.object({
  upper: z.number().describe('上限バンド'),
  middle: z.number().describe('中央バンド（移動平均）'),
  lower: z.number().describe('下限バンド'),
  width: z.number().describe('バンド幅'),
});

export type BollingerBandsType = z.infer<typeof BollingerBandsSchema>;

/**
 * テクニカル指標のスキーマ
 */
export const TechnicalIndicatorsSchema = z.object({
  movingAverages: MovingAveragesSchema.describe('移動平均指標'),
  rsi: z.number().min(0).max(100).describe('相対力指数（RSI）'),
  macd: MACDSchema.describe('MACD（Moving Average Convergence Divergence）'),
  bollingerBands: BollingerBandsSchema.describe('ボリンジャーバンド'),
});

export type TechnicalIndicatorsType = z.infer<typeof TechnicalIndicatorsSchema>;

/**
 * 株価トレンド分析のスキーマ
 */
export const TrendAnalysisSchema = BaseSchema.extend({
  symbol: z.string().min(1).describe('株式銘柄コード'),
  name: z.string().describe('会社名'),
  
  // トレンド情報
  trend: z.enum(['bullish', 'bearish', 'neutral']).describe('トレンド方向'),
  strengthScore: z.number().min(0).max(100).describe('トレンド強度スコア（0-100）'),
  timeframe: z.enum(['short', 'medium', 'long']).describe('時間枠'),
  
  // テクニカル指標
  technicalIndicators: TechnicalIndicatorsSchema.describe('テクニカル指標'),
  
  // サポートとレジスタンスレベル
  supportLevels: z.array(z.number()).describe('サポートレベル'),
  resistanceLevels: z.array(z.number()).describe('レジスタンスレベル'),
  
  // 投資判断
  recommendedAction: z.enum(['buy', 'sell', 'hold']).describe('推奨アクション'),
  confidenceLevel: z.enum(['low', 'medium', 'high']).describe('信頼度'),
  
  // 分析日時
  analysisDate: z.string().describe('分析日時（ISO形式）'),
});

export type TrendAnalysisType = z.infer<typeof TrendAnalysisSchema>;

/**
 * 株価予測のスキーマ
 */
export const SimpleForecastSchema = BaseSchema.extend({
  symbol: z.string().min(1).describe('株式銘柄コード'),
  name: z.string().describe('会社名'),
  currentPrice: z.number().describe('現在の株価'),
  
  // 予測期間
  forecastPeriod: z.enum(['1d', '1w', '1m', '3m', '6m', '1y']).describe('予測期間'),
  
  // 予測値
  predictedPrice: z.number().describe('予測株価'),
  priceRange: z.object({
    low: z.number().describe('予測範囲の下限'),
    high: z.number().describe('予測範囲の上限'),
  }).describe('予測価格範囲'),
  
  // 確率と信頼度
  probabilityUp: z.number().min(0).max(100).describe('上昇確率（%）'),
  confidenceScore: z.number().min(0).max(100).describe('予測信頼度スコア（0-100）'),
  
  // 予測理由
  keyFactors: z.array(z.string()).describe('予測に影響を与える主要因子'),
  
  // メタデータ
  forecastDate: z.string().describe('予測作成日（ISO形式）'),
  methodology: z.string().describe('使用した予測手法'),
  disclaimer: z.string().optional().describe('免責事項'),
});

export type SimpleForecastType = z.infer<typeof SimpleForecastSchema>;

/**
 * 株式比較分析のスキーマ
 */
export const StockComparisonSchema = BaseSchema.extend({
  stocks: z.array(
    z.object({
      symbol: z.string().min(1).describe('株式銘柄コード'),
      name: z.string().describe('会社名'),
      currentPrice: z.number().describe('現在の株価'),
      priceChange: z.number().describe('価格変動'),
      percentChange: z.number().describe('変動率（%）'),
      marketCap: z.number().optional().describe('時価総額'),
      peRatio: z.number().optional().describe('PER（株価収益率）'),
      eps: z.number().optional().describe('EPS（1株当たり利益）'),
      dividend: z.number().optional().describe('配当利回り（%）'),
      volume: z.number().optional().describe('出来高'),
      averageVolume: z.number().optional().describe('平均出来高'),
      yearHigh: z.number().optional().describe('年初来高値'),
      yearLow: z.number().optional().describe('年初来安値'),
    })
  ).min(2).describe('比較対象の株式リスト'),
  
  // 比較メトリクス
  comparisonMetrics: z.object({
    relativeStrength: z.record(z.string(), z.number()).describe('相対的な強さ（各銘柄の相対比）'),
    correlationMatrix: z.array(z.array(z.number())).optional().describe('銘柄間の相関行列'),
    sectorPerformance: z.record(z.string(), z.number()).optional().describe('セクターパフォーマンス比較'),
  }).describe('比較メトリクス'),
  
  // 比較分析
  analysis: z.object({
    summary: z.string().describe('比較分析の要約'),
    recommendations: z.array(
      z.object({
        symbol: z.string().describe('銘柄コード'),
        action: z.enum(['buy', 'sell', 'hold']).describe('推奨アクション'),
        reason: z.string().describe('理由'),
      })
    ).describe('銘柄ごとの推奨事項'),
  }).describe('比較分析'),
  
  // メタデータ
  comparisonDate: z.string().describe('比較分析日（ISO形式）'),
  timeframe: z.enum(['1d', '1w', '1m', '3m', '6m', '1y', 'ytd']).describe('比較期間'),
});

export type StockComparisonType = z.infer<typeof StockComparisonSchema>;

/**
 * テクニカル分析のスキーマ
 */
export const TechnicalAnalysisSchema = BaseSchema.extend({
  symbol: z.string().min(1).describe('株式銘柄コード'),
  name: z.string().describe('会社名'),
  
  // 基本情報
  price: z.number().describe('現在の株価'),
  timeframe: z.enum(['daily', 'weekly', 'monthly']).describe('分析期間'),
  
  // 基本テクニカル指標
  indicators: z.object({
    // 価格関連
    movingAverages: MovingAveragesSchema.describe('移動平均'),
    bollingerBands: BollingerBandsSchema.describe('ボリンジャーバンド'),
    
    // モメンタム
    rsi: z.number().min(0).max(100).describe('RSI'),
    stochasticOscillator: z.object({
      k: z.number().min(0).max(100).describe('ストキャスティクスK'),
      d: z.number().min(0).max(100).describe('ストキャスティクスD'),
    }).describe('ストキャスティクス・オシレーター'),
    
    // トレンド
    macd: MACDSchema.describe('MACD'),
    adx: z.number().min(0).max(100).optional().describe('平均方向性指数（ADX）'),
    
    // ボリューム
    obv: z.number().optional().describe('オンバランスボリューム（OBV）'),
    volumeAverage: z.number().optional().describe('平均出来高'),
  }).describe('テクニカル指標'),
  
  // シグナル分析
  signals: z.object({
    trendSignals: z.array(
      z.object({
        indicator: z.string().describe('指標名'),
        signal: z.enum(['bullish', 'bearish', 'neutral']).describe('シグナル'),
        strength: z.enum(['weak', 'moderate', 'strong']).describe('シグナル強度'),
        description: z.string().describe('シグナルの説明'),
      })
    ).describe('トレンドシグナル'),
    
    reversalPatterns: z.array(
      z.object({
        pattern: z.string().describe('パターン名'),
        direction: z.enum(['bullish', 'bearish']).describe('反転方向'),
        probability: z.number().min(0).max(100).describe('確率（%）'),
        description: z.string().describe('パターンの説明'),
      })
    ).optional().describe('反転パターン'),
    
    supportResistance: z.object({
      supports: z.array(z.number()).describe('サポートレベル'),
      resistances: z.array(z.number()).describe('レジスタンスレベル'),
      keyLevel: z.number().optional().describe('主要レベル'),
    }).describe('サポートとレジスタンス'),
  }).describe('テクニカルシグナル'),
  
  // 総合評価
  assessment: z.object({
    trendDirection: z.enum(['uptrend', 'downtrend', 'sideways']).describe('トレンド方向'),
    trendStrength: z.enum(['weak', 'moderate', 'strong']).describe('トレンド強度'),
    summary: z.string().describe('総合評価の要約'),
    outlook: z.enum(['bullish', 'bearish', 'neutral']).describe('見通し'),
    riskLevel: z.enum(['low', 'medium', 'high']).describe('リスクレベル'),
  }).describe('総合評価'),
  
  // メタデータ
  analysisDate: z.string().describe('分析日（ISO形式）'),
});

export type TechnicalAnalysisType = z.infer<typeof TechnicalAnalysisSchema>;

/**
 * 株式スキーマのレジストリ
 * アプリケーション内で使用可能な全ての株式関連スキーマをマッピングします
 */
export const stockSchemaRegistry = {
  'TrendAnalysisSchema': TrendAnalysisSchema,
  'SimpleForecastSchema': SimpleForecastSchema,
  'StockComparisonSchema': StockComparisonSchema,
  'TechnicalAnalysisSchema': TechnicalAnalysisSchema,
  'MovingAveragesSchema': MovingAveragesSchema,
  'MACDSchema': MACDSchema,
  'BollingerBandsSchema': BollingerBandsSchema,
  'TechnicalIndicatorsSchema': TechnicalIndicatorsSchema,
}; 