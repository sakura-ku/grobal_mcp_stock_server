import { z } from 'zod';
import yahooFinance from 'yahoo-finance2';
import { InvalidParameterError } from '../errors/index.js';
import type { 
  StockData, 
  StockHistoryData,
  StockTrendAnalysis,
  StockPrediction,
  TechnicalAnalysisResult
} from '../types/stock.js';
import { stockService } from './stockService.js';
import { logger } from '../utils/logger.js';
import { openaiService } from './openaiService.js';
import { dataAnalyzerService } from './dataAnalyzerService.js';

// パラメータのバリデーションスキーマ
export const trendAnalysisSchema = z.object({
  symbol: z.string().min(1).max(10).describe('株式銘柄コード'),
  period: z.number().min(10).max(365).optional().describe('分析期間（日数）')
});

export const stockPredictionSchema = z.object({
  symbol: z.string().min(1).max(10).describe('株式銘柄コード'),
  days: z.number().min(1).max(30).describe('予測日数'),
  history_period: z.string().optional().describe('履歴データ期間')
});

export const technicalAnalysisSchema = z.object({
  symbol: z.string().min(1).max(10).describe('株式銘柄コード'),
  interval: z.enum(['daily', 'weekly', 'monthly']).optional().describe('分析間隔'),
  indicators: z.array(z.string()).optional().describe('分析する指標のリスト')
});

/**
 * 株価分析関連のビジネスロジックを提供するサービスクラス
 */
class StockAnalysisService {
  /**
   * 株価のトレンド分析を行う
   * @param symbol 株式銘柄コード
   * @param period 分析期間（日数）
   * @returns トレンド分析結果
   */
  async analyzeStockTrend(symbol: string, period: number = 60): Promise<StockTrendAnalysis> {
    if (!symbol) {
      throw new InvalidParameterError('銘柄コードは必須です');
    }
    
    try {
      logger.info(`株価トレンド分析開始: ${symbol}, 期間: ${period}日`);
      
      // 基本株価データを取得
      const stockData = await stockService.getStockPrice(symbol);
      
      // 株価履歴を取得（日次データ）
      const historyData = await stockService.getStockHistory(symbol, 'daily', period <= 30 ? '1mo' : 
                                                            period <= 90 ? '3mo' : 
                                                            period <= 180 ? '6mo' : '1y');
      
      if (!historyData.data || historyData.data.length < 10) {
        throw new InvalidParameterError('分析に十分なデータがありません');
      }
      
      // 期間を制限
      const historyResult = historyData.data.slice(0, period);
      
      // 基本的な価格情報を計算
      const currentPrice = stockData.price;
      const priceChange = stockData.change;
      
      // 最近のデータの平均価格を計算
      const recentDataCount = Math.min(5, historyResult.length);
      const recentData = historyResult.slice(0, recentDataCount);
      const recentAverage = recentData.reduce((sum, item) => sum + item.close, 0) / recentDataCount;
      
      // トレンド強度の初期値
      let trendStrength = 0;
      
      if (historyResult.length > 10) {
        // 10日間の価格変化率をベースに強度を計算
        const oldPrice = historyResult[10].close;
        const newPrice = historyResult[0].close;
        trendStrength = (newPrice - oldPrice) / oldPrice;
        
        // -1.0 から 1.0 の範囲に収める
        trendStrength = Math.max(-1.0, Math.min(1.0, trendStrength));
      }
      
      // トレンド方向を判定
      let trend: 'bullish' | 'bearish' | 'neutral';
      if (trendStrength > 0.05) {
        trend = 'bullish';
      } else if (trendStrength < -0.05) {
        trend = 'bearish';
      } else {
        trend = 'neutral';
      }
      
      // ボラティリティを計算
      const prices = historyResult.map(item => item.close);
      const sumSquares = prices.reduce((sum, price) => {
        const diff = price - recentAverage;
        return sum + diff * diff;
      }, 0);
      const volatility = Math.sqrt(sumSquares / prices.length);
      
      // 信頼度を決定
      let confidenceLevel: 'high' | 'medium' | 'low' = 'medium';
      if (Math.abs(trendStrength) > 0.1) {
        confidenceLevel = 'high';
      } else if (Math.abs(trendStrength) < 0.03) {
        confidenceLevel = 'low';
      }
      
      // テクニカル指標を計算
      const technicalIndicators = this.calculateTechnicalIndicators(prices, historyResult);
      
      // サポートとレジスタンスレベルを決定
      const min = Math.min(...prices.slice(0, 20));
      const max = Math.max(...prices.slice(0, 20));
      
      // 分析結果を返す
      return {
        symbol: symbol.toUpperCase(),
        period,
        trend,
        strengthScore: Math.round(trendStrength * 100),
        currentPrice,
        priceChange,
        volatility,
        confidenceLevel,
        technicalIndicators,
        supportLevels: [min, min * 0.95],
        resistanceLevels: [max, max * 1.05],
        volumeAnalysis: {
          averageVolume: historyResult.slice(0, 20).reduce((sum, item) => sum + item.volume, 0) / 20,
          recentVolumeChange: (historyResult[0].volume / (historyResult.slice(0, 5).reduce((sum, item) => sum + item.volume, 0) / 5)) - 1
        },
        recommendedAction: trend === 'bullish' ? 'buy' : (trend === 'bearish' ? 'sell' : 'hold')
      };
    } catch (error) {
      logger.error('株価トレンド分析エラー:', error);
      throw error instanceof Error 
        ? error 
        : new InvalidParameterError('株価トレンド分析中にエラーが発生しました');
    }
  }

  /**
   * 株価予測を行う
   * @param symbol 株式銘柄コード
   * @param days 予測日数
   * @param historyPeriod 履歴データ期間
   * @returns 株価予測結果
   */
  async predictStockPrice(symbol: string, days: number = 7, historyPeriod: string = '1y'): Promise<StockPrediction> {
    if (!symbol) {
      throw new InvalidParameterError('銘柄コードは必須です');
    }
    
    if (days < 1 || days > 30) {
      throw new InvalidParameterError('予測日数は1〜30の範囲で指定してください');
    }
    
    try {
      logger.info(`株価予測開始: ${symbol}, 予測日数: ${days}`);
      
      // 基本株価データを取得
      const stockData = await stockService.getStockPrice(symbol);
      
      // 株価履歴を取得
      const historyData = await stockService.getStockHistory(symbol, 'daily', historyPeriod);
      
      if (!historyData.data || historyData.data.length < 30) {
        throw new InvalidParameterError('予測に十分なデータがありません');
      }
      
      // 価格配列とトレンド分析
      const prices = historyData.data.map(item => item.close);
      const dates = historyData.data.map(item => item.date);
      
      // トレンド分析
      const trendAnalysis = await this.analyzeStockTrend(symbol);
      
      // 単純な線形予測（実際のアプリケーションではより高度なモデルを使用）
      const recentPrices = prices.slice(0, Math.min(30, prices.length));
      const priceChanges = [];
      
      for (let i = 1; i < recentPrices.length; i++) {
        priceChanges.push((recentPrices[i-1] - recentPrices[i]) / recentPrices[i]);
      }
      
      // 平均変化率
      const avgChange = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
      
      // ボラティリティ（標準偏差）
      const varianceSum = priceChanges.reduce((sum, change) => sum + Math.pow(change - avgChange, 2), 0);
      const volatility = Math.sqrt(varianceSum / priceChanges.length);
      
      // 日々の予測値を計算
      const predictions = [];
      let predictedPrice = stockData.price;
      
      const lastDate = new Date(dates[0]);
      
      for (let i = 1; i <= days; i++) {
        // リスク考慮した変化率
        const predictedChange = trendAnalysis.trend === 'bullish' 
          ? avgChange + (Math.random() * volatility)
          : trendAnalysis.trend === 'bearish'
            ? avgChange - (Math.random() * volatility)
            : avgChange + ((Math.random() - 0.5) * volatility);
        
        // 予測価格を更新（前日比での予測）
        predictedPrice = predictedPrice * (1 + predictedChange);
        
        // 日付を1日進める
        const predictionDate = new Date(lastDate);
        predictionDate.setDate(lastDate.getDate() + i);
        
        // 予測範囲
        const rangeHigh = predictedPrice * (1 + volatility);
        const rangeLow = predictedPrice * (1 - volatility);
        
        predictions.push({
          date: predictionDate.toISOString().split('T')[0],
          price: predictedPrice,
          rangeHigh,
          rangeLow,
          confidence: trendAnalysis.trend === 'neutral' ? 'low' : 
                      trendAnalysis.strengthScore > 70 ? 'high' : 'medium'
        });
      }
      
      return {
        symbol: symbol.toUpperCase(),
        name: stockData.name,
        currentPrice: stockData.price,
        predictions,
        trend: trendAnalysis.trend,
        volatility: volatility,
        method: "混合予測モデル",
        confidenceScore: trendAnalysis.strengthScore,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      logger.error('株価予測エラー:', error);
      throw error instanceof Error 
        ? error 
        : new InvalidParameterError('株価予測中にエラーが発生しました');
    }
  }

  /**
   * テクニカル分析を行う
   * @param symbol 株式銘柄コード
   * @param interval 分析間隔
   * @param indicators 分析する指標のリスト（指定がない場合は全指標）
   * @returns テクニカル分析結果
   */
  async analyzeTechnical(
    symbol: string, 
    interval: 'daily' | 'weekly' | 'monthly' = 'daily',
    indicators?: string[]
  ): Promise<TechnicalAnalysisResult> {
    if (!symbol) {
      throw new InvalidParameterError('銘柄コードは必須です');
    }
    
    try {
      logger.info(`テクニカル分析開始: ${symbol}, インターバル: ${interval}`);
      
      // 基本株価データを取得
      const stockData = await stockService.getStockPrice(symbol);
      
      // 株価履歴を取得（6ヶ月分）
      const historyData = await stockService.getStockHistory(symbol, interval, '6mo');
      
      if (!historyData.data || historyData.data.length < 20) {
        throw new InvalidParameterError('分析に十分なデータがありません');
      }
      
      // 価格配列を作成
      const prices = historyData.data.map(item => item.close);
      const highPrices = historyData.data.map(item => item.high);
      const lowPrices = historyData.data.map(item => item.low);
      const volumes = historyData.data.map(item => item.volume);
      
      // 全てのテクニカル指標を計算
      const sma20 = this.calculateSMA(prices, 20);
      const sma50 = this.calculateSMA(prices, 50);
      const sma200 = this.calculateSMA(prices, Math.min(200, prices.length - 1));
      
      const ema12 = this.calculateEMA(prices, 12);
      const ema26 = this.calculateEMA(prices, 26);
      
      const rsi = this.calculateRSI(prices, 14);
      
      const macd = this.calculateMACD(prices);
      
      const bollingerBands = this.calculateBollingerBands(prices, 20, 2);
      
      // ストキャスティクスを計算
      const stochastic = this.calculateStochastic(highPrices, lowPrices, prices, 14, 3);
      
      // 分析結果を構築
      return {
        symbol: symbol.toUpperCase(),
        name: stockData.name,
        price: stockData.price,
        change: stockData.change,
        percentChange: stockData.percentChange,
        timeframe: interval,
        timestamp: new Date().toISOString(),
        analysis: {
          trend: prices[0] > sma50 && sma50 > sma200 ? 'bullish' : 
                prices[0] < sma50 && sma50 < sma200 ? 'bearish' : 'neutral',
          strength: rsi,
          indicators: {
            movingAverages: {
              sma: {
                sma20,
                sma50,
                sma200
              },
              ema: {
                ema12,
                ema26
              }
            },
            rsi,
            macd: {
              line: macd.line,
              signal: macd.signal,
              histogram: macd.histogram
            },
            bollingerBands: {
              upper: bollingerBands.upper,
              middle: bollingerBands.middle,
              lower: bollingerBands.lower,
              width: bollingerBands.width
            },
            stochasticOscillator: {
              k: stochastic.k,
              d: stochastic.d
            }
          },
          signals: this.generateTradingSignals(
            prices[0], sma50, sma200, rsi, macd.histogram, stochastic.k, stochastic.d
          )
        }
      };
    } catch (error) {
      logger.error('テクニカル分析エラー:', error);
      throw error instanceof Error 
        ? error 
        : new InvalidParameterError('テクニカル分析中にエラーが発生しました');
    }
  }

  /**
   * テクニカル指標を計算する
   * @param prices 価格配列
   * @param historyData 株価履歴データ
   * @returns テクニカル指標
   */
  private calculateTechnicalIndicators(prices: number[], historyData: any[]): any {
    // SMA計算
    const sma20 = this.calculateSMA(prices, 20);
    const sma50 = this.calculateSMA(prices, 50);
    
    // EMA計算
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    
    // RSI計算
    const rsi = this.calculateRSI(prices, 14);
    
    // MACD計算
    const macd = this.calculateMACD(prices);
    
    // ボリンジャーバンド計算
    const bollingerBands = this.calculateBollingerBands(prices, 20, 2);
    
    // ATRを計算（簡略化のためボリンジャーバンドの幅を使用）
    const atr = bollingerBands.width;
    
    return {
      sma: {
        sma20: [sma20],
        sma50: [sma50]
      },
      ema: {
        ema12: [ema12],
        ema26: [ema26]
      },
      rsi,
      macd: {
        line: macd.line,
        signal: macd.signal,
        histogram: macd.histogram
      },
      bollingerBands: {
        upper: bollingerBands.upper,
        middle: bollingerBands.middle,
        lower: bollingerBands.lower,
        width: bollingerBands.width
      },
      atr
    };
  }

  /**
   * トレーディングシグナルを生成
   */
  private generateTradingSignals(
    currentPrice: number, 
    sma50: number, 
    sma200: number, 
    rsi: number, 
    macdHistogram: number,
    stochasticK: number,
    stochasticD: number
  ): { [key: string]: string } {
    const signals: { [key: string]: string } = {};
    
    // 移動平均シグナル
    if (currentPrice > sma50 && sma50 > sma200) {
      signals.movingAverage = 'buy';
    } else if (currentPrice < sma50 && sma50 < sma200) {
      signals.movingAverage = 'sell';
    } else {
      signals.movingAverage = 'neutral';
    }
    
    // RSIシグナル
    if (rsi > 70) {
      signals.rsi = 'overbought';
    } else if (rsi < 30) {
      signals.rsi = 'oversold';
    } else {
      signals.rsi = 'neutral';
    }
    
    // MACDシグナル
    if (macdHistogram > 0) {
      signals.macd = 'bullish';
    } else {
      signals.macd = 'bearish';
    }
    
    // ストキャスティクスシグナル
    if (stochasticK > 80 && stochasticD > 80) {
      signals.stochastic = 'overbought';
    } else if (stochasticK < 20 && stochasticD < 20) {
      signals.stochastic = 'oversold';
    } else if (stochasticK > stochasticD) {
      signals.stochastic = 'bullish';
    } else {
      signals.stochastic = 'bearish';
    }
    
    // 総合シグナル
    let bullishSignals = 0;
    let bearishSignals = 0;
    
    if (signals.movingAverage === 'buy') bullishSignals++;
    if (signals.movingAverage === 'sell') bearishSignals++;
    
    if (signals.rsi === 'oversold') bullishSignals++;
    if (signals.rsi === 'overbought') bearishSignals++;
    
    if (signals.macd === 'bullish') bullishSignals++;
    if (signals.macd === 'bearish') bearishSignals++;
    
    if (signals.stochastic === 'oversold') bullishSignals++;
    if (signals.stochastic === 'overbought') bearishSignals++;
    
    if (bullishSignals > bearishSignals) {
      signals.overall = 'buy';
    } else if (bearishSignals > bullishSignals) {
      signals.overall = 'sell';
    } else {
      signals.overall = 'neutral';
    }
    
    return signals;
  }

  /**
   * 単純移動平均（SMA）を計算
   * @param prices 価格配列
   * @param period 期間
   * @returns SMA値
   */
  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) {
      return prices.reduce((sum, price) => sum + price, 0) / prices.length;
    }
    
    const slice = prices.slice(0, period);
    return slice.reduce((sum, price) => sum + price, 0) / period;
  }

  /**
   * 指数移動平均（EMA）を計算
   * @param prices 価格配列
   * @param period 期間
   * @returns EMA値
   */
  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) {
      return this.calculateSMA(prices, prices.length);
    }

    const k = 2 / (period + 1);
    // 最初のEMAはSMAから始める
    let ema = this.calculateSMA(prices.slice(0, period), period);
    
    // 残りの期間についてEMAを計算
    for (let i = period; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
    }
    
    return ema;
  }

  /**
   * 相対力指数（RSI）を計算
   * @param prices 価格配列
   * @param period 期間（通常14）
   * @returns RSI値（0-100）
   */
  private calculateRSI(prices: number[], period: number): number {
    if (prices.length <= period) {
      return 50; // データが不十分な場合はニュートラル値を返す
    }

    let gains = 0;
    let losses = 0;

    // 最初のRS計算のための平均利得と損失を計算
    for (let i = 1; i <= period; i++) {
      const change = prices[i - 1] - prices[i];
      if (change >= 0) {
        gains += change;
      } else {
        losses -= change; // 損失は正の値として記録
      }
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    // 残りの価格についてRS値を計算
    for (let i = period + 1; i < prices.length; i++) {
      const change = prices[i - 1] - prices[i];
      if (change >= 0) {
        avgGain = (avgGain * (period - 1) + change) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) - change) / period;
      }
    }

    // RS値がゼロ（すべての変化が利益の場合）
    if (avgLoss === 0) {
      return 100;
    }

    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  /**
   * MACDを計算
   * @param prices 価格配列
   * @param fastPeriod 短期EMA期間（通常12）
   * @param slowPeriod 長期EMA期間（通常26）
   * @param signalPeriod シグナル期間（通常9）
   * @returns MACD値（ライン、シグナル、ヒストグラム）
   */
  private calculateMACD(
    prices: number[],
    fastPeriod: number = 12, 
    slowPeriod: number = 26, 
    signalPeriod: number = 9
  ): { line: number; signal: number; histogram: number } {
    if (prices.length < Math.max(fastPeriod, slowPeriod) + signalPeriod) {
      return { line: 0, signal: 0, histogram: 0 };
    }

    // 短期・長期EMAを計算
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);
    
    // MACD値 = 短期EMA - 長期EMA
    const macdLine = fastEMA - slowEMA;
    
    // MACDの過去の値を計算してシグナルラインを得る
    const macdValues: number[] = [];
    for (let i = slowPeriod - 1; i < prices.length; i++) {
      const fastEMA = this.calculateEMA(prices.slice(0, i + 1), fastPeriod);
      const slowEMA = this.calculateEMA(prices.slice(0, i + 1), slowPeriod);
      macdValues.push(fastEMA - slowEMA);
    }
    
    // シグナルライン = MACDのEMA
    const signalLine = this.calculateEMA(macdValues, signalPeriod);
    
    // ヒストグラム = MACD - シグナル
    const histogram = macdLine - signalLine;
    
    return { line: macdLine, signal: signalLine, histogram };
  }

  /**
   * ボリンジャーバンドを計算
   * @param prices 価格配列
   * @param period 期間（通常20）
   * @param deviation 標準偏差の倍率（通常2）
   * @returns ボリンジャーバンド（上限、中央、下限、幅）
   */
  private calculateBollingerBands(prices: number[], period: number, deviation: number): {
    upper: number;
    middle: number;
    lower: number;
    width: number;
  } {
    if (prices.length < period) {
      return {
        upper: prices[0],
        middle: prices[0],
        lower: prices[0],
        width: 0
      };
    }

    const slice = prices.slice(0, period);
    const middle = this.calculateSMA(slice, period);

    // 標準偏差を計算
    const squaredDiffs = slice.map(price => Math.pow(price - middle, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / period;
    const stdDev = Math.sqrt(variance);

    const upper = middle + (stdDev * deviation);
    const lower = middle - (stdDev * deviation);
    const width = (upper - lower) / middle; // 相対的なバンド幅

    return { upper, middle, lower, width };
  }

  /**
   * ストキャスティクス・オシレーターを計算
   * @param highPrices 高値配列
   * @param lowPrices 安値配列
   * @param closePrices 終値配列
   * @param kPeriod K期間（通常14）
   * @param dPeriod D期間（通常3）
   * @returns ストキャスティクス（%K、%D）
   */
  private calculateStochastic(
    highPrices: number[],
    lowPrices: number[],
    closePrices: number[],
    kPeriod: number = 14,
    dPeriod: number = 3
  ): { k: number; d: number } {
    if (highPrices.length < kPeriod || lowPrices.length < kPeriod || closePrices.length < kPeriod) {
      return { k: 50, d: 50 }; // データが不十分な場合はニュートラル値を返す
    }

    // 最新のKを計算
    const highestHigh = Math.max(...highPrices.slice(0, kPeriod));
    const lowestLow = Math.min(...lowPrices.slice(0, kPeriod));
    const currentClose = closePrices[0];
    
    // %K = (現在の終値 - 期間内の最安値) / (期間内の最高値 - 期間内の最安値) * 100
    const k = (highestHigh - lowestLow) === 0 ? 50 : ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    
    // 過去のK値を計算してDを得る
    const kValues: number[] = [];
    
    for (let i = 0; i < Math.min(dPeriod, highPrices.length - kPeriod); i++) {
      const periodHighestHigh = Math.max(...highPrices.slice(i, i + kPeriod));
      const periodLowestLow = Math.min(...lowPrices.slice(i, i + kPeriod));
      const periodCurrentClose = closePrices[i];
      
      const periodK = (periodHighestHigh - periodLowestLow) === 0 ? 50 : 
                      ((periodCurrentClose - periodLowestLow) / (periodHighestHigh - periodLowestLow)) * 100;
      
      kValues.push(periodK);
    }
    
    // %D = %Kの単純移動平均（通常3日間）
    const d = kValues.length === 0 ? k : kValues.reduce((sum, kVal) => sum + kVal, 0) / kValues.length;
    
    return { k, d };
  }
}

// シングルトンとしてインスタンスをエクスポート
export const stockAnalysisService = new StockAnalysisService();

// 型検証用のスキーマもエクスポート
export { 
  trendAnalysisSchema,
  stockPredictionSchema,
  technicalAnalysisSchema
}; 