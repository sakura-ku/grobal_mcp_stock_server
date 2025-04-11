import { InvalidParameterError } from '../errors/index.js';
import type { StockTrendAnalysis } from '../types/stock.js';
import { stockService } from './stockService.js';
import { logger } from '../utils/logger.js';

/**
 * 株価分析関連のビジネスロジックを提供するサービスクラス
 * Polygon.io APIを使用してスリム化された分析機能を提供
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
      
      // 現在の株価を取得
      const currentPrice = closes[0];
      const priceChange = closes[0] - closes[1];
      
      // 単純な上昇/下降トレンド判定
      let trend: 'up' | 'down' | 'neutral' = 'neutral';
      let strengthScore = 50; // 0-100のスケール
      
      // 短期移動平均と長期移動平均の関係でトレンドを判定
      const sma20 = sma20Values[0] || 0;
      const sma50 = sma50Values[0] || 0;
      
      if (sma20 > sma50 && currentPrice > sma20) {
        trend = 'up';
        strengthScore += 20;
      } else if (sma20 < sma50 && currentPrice < sma20) {
        trend = 'down';
        strengthScore -= 20;
      }
      
      // ボラティリティの計算（簡易版）
      const prices = closes.slice(0, 20);
      const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      const sumSquared = prices.reduce((sum, price) => {
        const diff = price - avgPrice;
        return sum + (diff * diff);
      }, 0);
      const volatility = Math.sqrt(sumSquared / prices.length);
      
      // 過去20日間の最高値・最安値を計算
      const max = Math.max(...prices);
      const min = Math.min(...prices);
      
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
            ema12: [0], // スリム化のため省略
            ema26: [0]  // スリム化のため省略
          },
          rsi: 50, // スリム化のため省略
          macd: {
            line: 0,     // スリム化のため省略
            signal: 0,   // スリム化のため省略
            histogram: 0 // スリム化のため省略
          },
          bollingerBands: {
            upper: max,
            middle: avgPrice,
            lower: min,
            width: max - min
          },
          atr: volatility // 簡易実装としてボラティリティを使用
        },
        supportLevels: [min],
        resistanceLevels: [max],
        volumeAnalysis: {
          averageVolume: history.data.slice(0, 20).reduce((sum, item) => sum + item.volume, 0) / 20,
          recentVolumeChange: 0 // スリム化のため省略
        },
        recommendedAction: trend === 'up' ? 'buy' : trend === 'down' ? 'sell' : 'hold'
      };
    } catch (error) {
      logger.error('株価トレンド分析エラー:', error);
      throw error instanceof Error 
        ? error 
        : new InvalidParameterError('株価トレンド分析中にエラーが発生しました');
    }
  }
  
  /**
   * 単純移動平均（SMA）を計算する
   * @param data 計算対象のデータ配列
   * @param period 期間
   * @returns 移動平均値
   */
  calculateSMA(data: number[], period: number): number {
    if (data.length < period) {
      return 0;
    }
    
    const sum = data.slice(0, period).reduce((total, price) => total + price, 0);
    return sum / period;
  }
  
  /**
   * 単純移動平均（SMA）の配列を計算する
   * @param data 計算対象のデータ配列
   * @param period 期間
   * @returns 移動平均値の配列
   */
  calculateSMAArray(data: number[], period: number): number[] {
    if (data.length < period) {
      return [0];
    }
    
    const result: number[] = [];
    
    for (let i = 0; i <= data.length - period; i++) {
      const slice = data.slice(i, i + period);
      const average = slice.reduce((sum, val) => sum + val, 0) / period;
      result.push(average);
    }
    
    return result;
  }
}

export default new StockAnalysisService(); 