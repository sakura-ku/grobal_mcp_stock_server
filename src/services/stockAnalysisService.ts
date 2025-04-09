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
// 技術分析ライブラリをインポート（型エラーがあるためコメントアウト、後日対応）
// import {
//   SMA,
//   EMA,
//   RSI,
//   MACD,
//   BollingerBands,
//   Stochastic,
//   ATR
// } from 'technicalindicators';

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
   * 株価のトレンドを分析する
   * @param symbol 株式銘柄コード
   * @param period 分析期間（日数）
   * @returns トレンド分析結果
   */
  async analyzeStockTrend(symbol: string, period: number = 60): Promise<StockTrendAnalysis> {
    if (!symbol) {
      throw new InvalidParameterError('銘柄コードは必須です');
    }
    
    try {
      // 株価履歴を取得
      const history = await stockService.getStockHistory(symbol, 'daily', '6m');
      
      if (!history.data || history.data.length < 20) {
        throw new InvalidParameterError('分析に十分なデータがありません');
      }
      
      // 終値データを配列として取得
      const closes = history.data.map(item => item.close);
      
      // 移動平均の計算
      const sma20Values = this.calculateSMAArray(closes, 20);
      const sma50Values = this.calculateSMAArray(closes, 50);
      const sma200 = this.calculateSMA(closes, 200);
      
      // 現在の値を取得（配列の最新値）
      const sma20 = sma20Values.length > 0 ? sma20Values[0] : this.calculateSMA(closes, 20);
      const sma50 = sma50Values.length > 0 ? sma50Values[0] : this.calculateSMA(closes, 50);
      
      // 指数移動平均の計算
      const ema12Values = this.calculateEMAArray(closes, 12);
      const ema26Values = this.calculateEMAArray(closes, 26);
      
      // 現在の値を取得
      const ema12 = ema12Values.length > 0 ? ema12Values[0] : this.calculateEMA(closes, 12);
      const ema26 = ema26Values.length > 0 ? ema26Values[0] : this.calculateEMA(closes, 26);
      
      // MACD計算
      const macdLine = ema12 - ema26;
      const signalLine = this.calculateEMA([macdLine], 9);
      const macdHistogram = macdLine - signalLine;
      
      // RSI計算 (14日間)
      const rsi = this.calculateRSI(closes, 14);
      
      // ボリンジャーバンド計算
      const bollingerBands = this.calculateBollingerBands(closes, 20, 2);
      
      // ストキャスティクスの計算
      const stochastics = this.calculateStochastics(
        history.data.map(item => item.high),
        history.data.map(item => item.low),
        closes,
        14,
        3
      );
      
      // トレンドの判定
      let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      let strengthScore = 50; // 0-100のスケール
      
      // 短期移動平均が長期移動平均を上回る = 上昇トレンド
      if (sma20 > sma50 && sma50 > sma200) {
        trend = 'bullish';
        strengthScore += 20;
      } 
      // 短期移動平均が長期移動平均を下回る = 下降トレンド
      else if (sma20 < sma50 && sma50 < sma200) {
        trend = 'bearish';
        strengthScore -= 20;
      }
      
      // RSIによる過買い/過売り判定
      if (rsi > 70) {
        trend = 'bearish'; // 過買い
        strengthScore = Math.max(strengthScore - 10, 0);
      } else if (rsi < 30) {
        trend = 'bullish'; // 過売り
        strengthScore = Math.min(strengthScore + 10, 100);
      }
      
      // MACDシグナルによる強度調整
      if (macdLine > signalLine && macdLine > 0) {
        if (trend === 'bullish') strengthScore = Math.min(strengthScore + 15, 100);
        else trend = 'bullish';
      } else if (macdLine < signalLine && macdLine < 0) {
        if (trend === 'bearish') strengthScore = Math.max(strengthScore - 15, 0);
        else trend = 'bearish';
      }
      
      // ボラティリティの計算（20日間の標準偏差）
      const volatility = bollingerBands.standardDeviation;
      
      // サポート/レジスタンスレベルの特定
      const supportLevel = Math.min(...closes.slice(0, 20));
      const resistanceLevel = Math.max(...closes.slice(0, 20));
      
      // 最新価格を取得
      const currentPrice = closes[0];
      // 価格変化を計算
      const priceChange = currentPrice - closes[1];
      
      return {
        symbol: symbol.toUpperCase(),
        period: period,
        trend: trend,
        strengthScore: strengthScore,
        currentPrice: currentPrice,
        priceChange: priceChange,
        volatility: volatility,
        confidenceLevel: 'medium',
        technicalIndicators: {
          sma: {
            sma20: sma20Values,
            sma50: sma50Values
          },
          ema: {
            ema12: ema12Values,
            ema26: ema26Values
          },
          macd: {
            line: macdLine,
            signal: signalLine,
            histogram: macdHistogram
          },
          rsi: rsi,
          bollingerBands: {
            upper: bollingerBands.upper,
            middle: bollingerBands.middle,
            lower: bollingerBands.lower,
            width: (bollingerBands.upper - bollingerBands.lower) / bollingerBands.middle
          },
          atr: 0 // 平均真価範囲 (ATR) は現在計算していないのでデフォルト値を設定
        },
        supportLevels: [supportLevel],
        resistanceLevels: [resistanceLevel],
        volumeAnalysis: {
          averageVolume: 0, // 現在計算していないのでデフォルト値を設定
          recentVolumeChange: 0
        },
        recommendedAction: trend === 'bullish' ? 'buy' : trend === 'bearish' ? 'sell' : 'hold'
      };
    } catch (error) {
      logger.error('株価トレンド分析エラー:', error);
      throw error instanceof Error 
        ? error 
        : new InvalidParameterError('株価トレンド分析中にエラーが発生しました');
    }
  }
  
  /**
   * 単純移動平均(SMA)の配列を計算
   * @param data 価格データの配列
   * @param period 期間
   * @returns 移動平均値の配列
   */
  private calculateSMAArray(data: number[], period: number): number[] {
    if (data.length < period) {
      return [this.calculateSMA(data, data.length)];
    }
    
    const result: number[] = [];
    for (let i = 0; i < data.length - period + 1; i++) {
      const slice = data.slice(i, i + period);
      result.push(slice.reduce((sum, price) => sum + price, 0) / period);
    }
    return result;
  }
  
  /**
   * 指数移動平均(EMA)の配列を計算
   * @param data 価格データの配列
   * @param period 期間
   * @returns 指数移動平均値の配列
   */
  private calculateEMAArray(data: number[], period: number): number[] {
    if (data.length < period) {
      return [this.calculateSMA(data, data.length)];
    }
    
    const result: number[] = [];
    const k = 2 / (period + 1);
    
    // 最初のEMAはSMAから計算
    let ema = this.calculateSMA(data.slice(0, period), period);
    result.push(ema);
    
    // 残りのEMAを計算
    for (let i = period; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
      result.unshift(ema); // 最新の値を配列の先頭に追加
    }
    
    return result;
  }
  
  /**
   * 単純移動平均(SMA)の計算
   * @param data 価格データの配列
   * @param period 期間
   * @returns 移動平均値
   */
  private calculateSMA(data: number[], period: number): number {
    if (data.length < period) {
      return data.reduce((sum, value) => sum + value, 0) / data.length;
    }
    
    const latestData = data.slice(0, period);
    return latestData.reduce((sum, price) => sum + price, 0) / period;
  }
  
  /**
   * 指数移動平均(EMA)の計算
   * @param data 価格データの配列
   * @param period 期間
   * @returns 指数移動平均値
   */
  private calculateEMA(data: number[], period: number): number {
    if (data.length < period) {
      return this.calculateSMA(data, data.length);
    }
    
    const k = 2 / (period + 1);
    let ema = this.calculateSMA(data.slice(0, period), period);
    
    for (let i = period; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
    }
    
    return ema;
  }
  
  /**
   * 相対力指数(RSI)の計算
   * @param data 価格データの配列
   * @param period 期間
   * @returns RSI値
   */
  private calculateRSI(data: number[], period: number): number {
    if (data.length <= period) {
      return 50; // 十分なデータがない場合のデフォルト値
    }
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const change = data[i-1] - data[i];
      if (change >= 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }
    
    if (losses === 0) return 100;
    
    const relativeStrength = gains / losses;
    return 100 - (100 / (1 + relativeStrength));
  }
  
  /**
   * ボリンジャーバンドを計算
   * @param data 価格データ
   * @param period 期間
   * @param multiplier 標準偏差の乗数
   * @returns ボリンジャーバンドのデータ
   */
  private calculateBollingerBands(data: number[], period: number, multiplier: number): { 
    upper: number; 
    middle: number; 
    lower: number;
    standardDeviation: number;
  } {
    const middle = this.calculateSMA(data, period);
    
    // 標準偏差の計算
    const squaredDeviations = data.slice(0, period).map(price => Math.pow(price - middle, 2));
    const variance = squaredDeviations.reduce((sum, deviation) => sum + deviation, 0) / period;
    const standardDeviation = Math.sqrt(variance);
    
    return {
      upper: middle + (standardDeviation * multiplier),
      middle,
      lower: middle - (standardDeviation * multiplier),
      standardDeviation
    };
  }
  
  /**
   * ストキャスティクスの計算
   * @param highData 高値データの配列
   * @param lowData 安値データの配列
   * @param closeData 終値データの配列
   * @param kPeriod K期間
   * @param dPeriod D期間
   * @returns ストキャスティクス
   */
  private calculateStochastics(
    highData: number[], 
    lowData: number[], 
    closeData: number[], 
    kPeriod: number, 
    dPeriod: number
  ): { k: number; d: number } {
    if (closeData.length < kPeriod) {
      return { k: 50, d: 50 }; // 十分なデータがない場合のデフォルト値
    }
    
    // 最高値と最安値を求める
    const highestHigh = Math.max(...highData.slice(0, kPeriod));
    const lowestLow = Math.min(...lowData.slice(0, kPeriod));
    
    // %Kの計算
    const lastClose = closeData[0];
    const k = ((lastClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    
    // 過去のK値を計算（D値の計算用）
    const kValues = [];
    for (let i = 0; i < dPeriod; i++) {
      if (i >= closeData.length) break;
      
      const periodHighestHigh = Math.max(...highData.slice(i, i + kPeriod));
      const periodLowestLow = Math.min(...lowData.slice(i, i + kPeriod));
      const periodK = ((closeData[i] - periodLowestLow) / (periodHighestHigh - periodLowestLow)) * 100;
      
      kValues.push(periodK);
    }
    
    // %Dの計算（%Kの3日間SMA）
    const d = kValues.reduce((sum, value) => sum + value, 0) / kValues.length;
    
    return { k, d };
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

      // 分析用データの準備
      const analysisData = {
        symbol: symbol,
        name: stockData.name,
        currency: stockData.currency,
        currentPrice: stockData.price,
        priceHistory: historyData.data.map(item => ({
          date: item.date,
          price: item.close,
          volume: item.volume
        })),
        predictionDays: days
      };
      
      // 高度な分析と予測（OpenAI CodeInterpreterを使用）
      const advancedAnalysis = await this.performAdvancedPrediction(analysisData, days);
      
      // 価格配列とトレンド分析
      const prices = historyData.data.map(item => item.close);
      
      // トレンド分析
      const trendAnalysis = await this.analyzeStockTrend(symbol);
      
      return {
        symbol: symbol.toUpperCase(),
        name: stockData.name,
        currency: stockData.currency,
        currentPrice: stockData.price,
        predictions: this.generateBasicPredictions(stockData, historyData.data, days, trendAnalysis),
        predictedPrices: advancedAnalysis.predictedPrices,
        trend: trendAnalysis.trend,
        volatility: trendAnalysis.volatility,
        method: advancedAnalysis.method || "統計的予測モデル",
        confidenceScore: advancedAnalysis.confidenceScore || trendAnalysis.strengthScore,
        predictionFactors: {
          trend: advancedAnalysis.trend || trendAnalysis.trend,
          technicalIndicators: advancedAnalysis.technicalIndicators || {
            rsi: trendAnalysis.technicalIndicators.rsi,
            macd: trendAnalysis.technicalIndicators.macd
          },
          marketConditions: advancedAnalysis.marketConditions || "中立的な市場環境と予測されます",
          riskAssessment: advancedAnalysis.riskAssessment || {
            volatilityRisk: trendAnalysis.volatility > 5 ? "高" : "中",
            downtrend: trendAnalysis.trend === 'bearish' ? "高" : "低"
          }
        },
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
   * OpenAI CodeInterpreterを使用した高度な株価予測
   * @param analysisData 分析用データ
   * @param days 予測日数
   * @returns 高度な予測結果
   */
  private async performAdvancedPrediction(analysisData: any, days: number): Promise<any> {
    try {
      const systemPrompt = `あなたは高度な株価予測AIアシスタントです。以下のガイドラインに従ってください：
1. 提供された株価履歴データを分析し、将来の株価を予測してください
2. Python (pandas, numpy, statsmodels, scikit-learn, matplotlib等)を使用して分析を行ってください
3. 以下の手法を組み合わせて予測してください：
   - 時系列分析 (ARIMA/SARIMA)
   - 指数平滑法 (ETS)
   - 機械学習アプローチ (回帰分析、ランダムフォレスト等)
   - テクニカル指標の分析
4. モデルの性能を評価し、最も精度の高いモデルの結果を優先してください
5. 予測結果は日付と予測価格のペアの配列として提供してください
6. 分析結果と予測根拠も示してください`;

      const userPrompt = `以下の株価データを分析し、今後${days}日間の株価を予測してください：
      
${JSON.stringify(analysisData, null, 2)}

特に以下のポイントに注目して分析と予測を行ってください：
1. 価格トレンドの特定と将来の方向性
2. 主要なテクニカル指標の計算と分析 (SMA, EMA, RSI, MACD等)
3. ボラティリティの評価
4. 予測モデルの精度と信頼性
5. 各日の予測価格

分析結果と予測を以下の構造でJSON形式で出力してください：
{
  "predictedPrices": [
    {"date": "YYYY-MM-DD", "price": number, "range": {"low": number, "high": number}}
  ],
  "confidenceScore": number, // 0.0-1.0の範囲
  "trend": "上昇" | "下降" | "横ばい",
  "technicalIndicators": {
    // 計算された指標
  },
  "marketConditions": "市場条件の説明",
  "riskAssessment": {
    // リスク評価
  },
  "method": "使用した予測手法の説明"
}`;

      // OpenAI CodeInterpreterを使用した分析をリクエスト
      const result = await dataAnalyzerService.analyzeData(analysisData, userPrompt);
      
      // 結果からJSONデータを抽出
      if (result.structuredData) {
        logger.info('OpenAI分析による予測結果を取得しました');
        return result.structuredData;
      } else {
        logger.warn('OpenAI分析から構造化データが取得できませんでした');
        return {}; // 空オブジェクトを返す
      }
    } catch (error) {
      logger.error('高度な株価予測エラー:', error);
      // エラーが発生した場合は空オブジェクトを返し、基本予測にフォールバック
      return {};
    }
  }
  
  /**
   * 基本予測を生成する
   */
  private generateBasicPredictions(
    stockData: StockData, 
    historyData: Array<{date: string; close: number}>, 
    days: number,
    trendAnalysis: StockTrendAnalysis
  ): Array<{date: string; price: number; rangeHigh: number; rangeLow: number; confidence: 'high' | 'medium' | 'low'}> {
    const prices = historyData.map(item => item.close);
    const dates = historyData.map(item => item.date);
    
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
    const predictions: { 
      date: string; 
      price: number; 
      rangeHigh: number; 
      rangeLow: number; 
      confidence: "high" | "medium" | "low"; 
    }[] = [];
    
    const today = new Date();
    
    for (let i = 1; i <= days; i++) {
      const predictedDate = new Date(today);
      predictedDate.setDate(today.getDate() + i);
      
      // リスク考慮した変化率
      const predictedChange = trendAnalysis.trend === 'bullish' 
        ? avgChange + (Math.random() * volatility)
        : trendAnalysis.trend === 'bearish'
          ? avgChange - (Math.random() * volatility)
          : avgChange + ((Math.random() - 0.5) * volatility);
      
      // 予測価格を更新（前日比での予測）
      const predictedPrice = prices[prices.length - 1] * (1 + predictedChange);
      
      // 予測範囲
      const rangeHigh = predictedPrice * (1 + volatility);
      const rangeLow = predictedPrice * (1 - volatility);
      
      // 信頼度の設定
      let confidenceLevel: "high" | "medium" | "low" = "medium";
      if (trendAnalysis.strengthScore > 80) confidenceLevel = "high";
      else if (trendAnalysis.strengthScore < 40) confidenceLevel = "low";
      
      predictions.push({
        date: predictedDate.toISOString().split('T')[0],
        price: parseFloat(predictedPrice.toFixed(2)),
        rangeHigh: parseFloat(rangeHigh.toFixed(2)),
        rangeLow: parseFloat(rangeLow.toFixed(2)),
        confidence: confidenceLevel
      });
    }
    
    return predictions;
  }

  /**
   * テクニカル分析を実行する
   * @param symbol 銘柄コード
   * @param interval 分析間隔
   * @param indicators 指標のリスト
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
      
      // テクニカル指標計算用の入力データを準備
      const inputPrices = [...prices];
      const inputHigh = [...highPrices];
      const inputLow = [...lowPrices];
      
      // 移動平均の計算
      const sma20 = this.calculateSMA(inputPrices, 20);
      const sma50 = this.calculateSMA(inputPrices, 50);
      const sma200 = this.calculateSMA(inputPrices, Math.min(200, inputPrices.length - 1));
      
      // EMA計算
      const ema12 = this.calculateEMA(inputPrices, 12);
      const ema26 = this.calculateEMA(inputPrices, 26);
      
      // RSI計算
      const rsi = this.calculateRSI(inputPrices, 14);
      
      // MACD計算
      const macdResult = this.calculateMACD(
        inputPrices,
        12,  // fastPeriod
        26,  // slowPeriod
        9    // signalPeriod
      );
      
      const macdValue = {
        MACD: macdResult.line,
        signal: macdResult.signal,
        histogram: macdResult.histogram
      };
      
      // ボリンジャーバンド計算
      const bbValue = this.calculateBollingerBands(inputPrices, 20, 2);
      
      // ボリンジャーバンド幅を計算
      const bbWidth = (bbValue.upper - bbValue.lower) / bbValue.middle;
      
      // ストキャスティクス計算
      const stochastic = this.calculateStochastics(
        inputHigh,
        inputLow,
        inputPrices,
        14,  // period
        3    // signalPeriod
      );
      
      // トレンド判定
      let trend: 'bullish' | 'bearish' | 'neutral';
      if (prices[0] > sma50 && sma50 > sma200) {
        trend = 'bullish';
      } else if (prices[0] < sma50 && sma50 < sma200) {
        trend = 'bearish';
      } else {
        trend = 'neutral';
      }
      
      // シグナル生成
      const signals = this.generateTradingSignals(
        prices[0], sma50, sma200, rsi, macdValue.histogram, stochastic.k, stochastic.d
      );
      
      return {
        symbol: symbol.toUpperCase(),
        name: stockData.name,
        price: stockData.price,
        change: stockData.change,
        percentChange: stockData.percentChange,
        timeframe: interval,
        timestamp: new Date().toISOString(),
        tradingSignals: signals,
        analysis: {
          trend,
          strength: Math.abs(rsi - 50),
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
              line: macdValue.MACD,
              signal: macdValue.signal,
              histogram: macdValue.histogram
            },
            bollingerBands: {
              upper: bbValue.upper,
              middle: bbValue.middle,
              lower: bbValue.lower,
              width: bbWidth
            },
            stochasticOscillator: {
              k: stochastic.k,
              d: stochastic.d
            }
          },
          signals
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
   * MACDを計算する
   * @param prices 価格配列
   * @param fastPeriod 短期EMA期間
   * @param slowPeriod 長期EMA期間
   * @param signalPeriod シグナル期間
   * @returns MACDの結果
   */
  private calculateMACD(
    prices: number[], 
    fastPeriod = 12, 
    slowPeriod = 26, 
    signalPeriod = 9
  ): { line: number; signal: number; histogram: number } {
    // 短期・長期EMAを計算
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);
    
    // MACD値 = 短期EMA - 長期EMA
    const macdLine = fastEMA - slowEMA;
    
    // MACDの過去の値を計算してシグナルラインを得る
    const macdValues: number[] = [];
    for (let i = prices.length - 1; i >= 0; i--) {
      const slice = prices.slice(i);
      if (slice.length >= slowPeriod) {
        const fastEMA = this.calculateEMA(slice, fastPeriod);
        const slowEMA = this.calculateEMA(slice, slowPeriod);
        macdValues.unshift(fastEMA - slowEMA);
        if (macdValues.length >= signalPeriod * 2) break; // 十分なデータが得られたら終了
      }
    }
    
    // シグナルライン = MACDのEMA
    const signalLine = this.calculateEMA(macdValues, signalPeriod);
    
    // ヒストグラム = MACD - シグナルライン
    const histogram = macdLine - signalLine;
    
    return { line: macdLine, signal: signalLine, histogram };
  }
  
  /**
   * トレーディングシグナルを生成する
   * @param currentPrice 現在価格
   * @param sma50 50日SMA
   * @param sma200 200日SMA
   * @param rsi RSI値
   * @param macdHistogram MACDヒストグラム
   * @param stochasticK ストキャスティクスK値
   * @param stochasticD ストキャスティクスD値
   * @returns トレーディングシグナル
   */
  private generateTradingSignals(
    currentPrice: number,
    sma50: number,
    sma200: number,
    rsi: number,
    macdHistogram: number,
    stochasticK: number,
    stochasticD: number
  ): { overall: string; [key: string]: string } {
    const signals: { signal: string; strength: number; description: string }[] = [];
    
    // 移動平均シグナル
    if (currentPrice > sma50 && sma50 > sma200) {
      signals.push({
        signal: 'buy',
        strength: 0.7,
        description: '上昇トレンド: 価格が50日・200日SMAを上回っています'
      });
    } else if (currentPrice < sma50 && sma50 < sma200) {
      signals.push({
        signal: 'sell',
        strength: 0.7,
        description: '下降トレンド: 価格が50日・200日SMAを下回っています'
      });
    }
    
    // ゴールデンクロス/デッドクロス
    if (sma50 > sma200 && Math.abs(sma50 - sma200) / sma200 < 0.02) {
      signals.push({
        signal: 'buy',
        strength: 0.8,
        description: 'ゴールデンクロス: 50日SMAが200日SMAを上抜けました'
      });
    } else if (sma50 < sma200 && Math.abs(sma50 - sma200) / sma200 < 0.02) {
      signals.push({
        signal: 'sell',
        strength: 0.8,
        description: 'デッドクロス: 50日SMAが200日SMAを下抜けました'
      });
    }
    
    // RSIシグナル
    if (rsi < 30) {
      signals.push({
        signal: 'buy',
        strength: 0.6,
        description: '売られすぎ: RSIが30を下回っています'
      });
    } else if (rsi > 70) {
      signals.push({
        signal: 'sell',
        strength: 0.6,
        description: '買われすぎ: RSIが70を上回っています'
      });
    }
    
    // MACDシグナル
    if (macdHistogram > 0) {
      signals.push({
        signal: 'buy',
        strength: 0.65,
        description: 'MACDシグナル: ヒストグラムがプラス圏です'
      });
    } else if (macdHistogram < 0) {
      signals.push({
        signal: 'sell',
        strength: 0.65,
        description: 'MACDシグナル: ヒストグラムがマイナス圏です'
      });
    }
    
    // ストキャスティクスシグナル
    if (stochasticK < 20 && stochasticD < 20 && stochasticK > stochasticD) {
      signals.push({
        signal: 'buy',
        strength: 0.6,
        description: 'ストキャスティクス: 売られすぎ圏からの上昇シグナル'
      });
    } else if (stochasticK > 80 && stochasticD > 80 && stochasticK < stochasticD) {
      signals.push({
        signal: 'sell',
        strength: 0.6,
        description: 'ストキャスティクス: 買われすぎ圏からの下降シグナル'
      });
    }
    
    // シグナルを集計して返却形式に変換
    let buyCount = 0;
    let sellCount = 0;
    
    const result: { overall: string; [key: string]: string } = { overall: '' };
    
    signals.forEach((signal, index) => {
      result[`signal${index + 1}`] = `${signal.signal}: ${signal.description}`;
      if (signal.signal === 'buy') buyCount++;
      if (signal.signal === 'sell') sellCount++;
    });
    
    // 総合判断を追加
    let overall: string;
    if (buyCount > sellCount) {
      overall = 'buy';
    } else if (sellCount > buyCount) {
      overall = 'sell';
    } else {
      overall = 'neutral';
    }
    
    result.overall = overall;
    
    return result;
  }
}

// シングルトンとしてインスタンスをエクスポート
export const stockAnalysisService = new StockAnalysisService(); 