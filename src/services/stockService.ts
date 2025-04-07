import { z } from 'zod';
import { InvalidParameterError } from '../errors/index.js';
import type { StockData } from '../types/stock.js';

// パラメータのバリデーションスキーマ
export const stockSymbolSchema = z.object({
  symbol: z.string().min(1).max(10).describe('株式銘柄コード')
});

/**
 * 株価関連のビジネスロジックを提供するサービスクラス
 */
class StockService {
  /**
   * 指定された銘柄の株価情報を取得する
   * @param symbol 株式銘柄コード
   * @returns 株価データ
   */
  async getStockPrice(symbol: string): Promise<StockData> {
    if (!symbol) {
      throw new InvalidParameterError('銘柄コードは必須です');
    }

    try {
      // 実際の実装では外部APIを呼び出して実データを取得
      // このサンプルではモックデータを返す
      return {
        symbol: symbol.toUpperCase(),
        name: this.getMockName(symbol),
        price: this.generateRandomPrice(),
        change: this.generateRandomChange(),
        percentChange: this.generateRandomPercentChange(),
        currency: 'USD',
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error('株価取得エラー:', error);
      throw error instanceof Error 
        ? error 
        : new InvalidParameterError('予期しないエラーが発生しました');
    }
  }

  /**
   * 複数銘柄の株価データを一括取得
   * @param symbols 株式銘柄コードの配列
   * @returns 株価データの配列
   */
  async getMultipleStockPrices(symbols: string[]): Promise<StockData[]> {
    if (!symbols || symbols.length === 0) {
      throw new InvalidParameterError('少なくとも1つの銘柄コードが必要です');
    }

    try {
      // 各銘柄の株価を並行して取得
      const promises = symbols.map(symbol => this.getStockPrice(symbol));
      return await Promise.all(promises);
    } catch (error) {
      console.error('複数株価取得エラー:', error);
      throw error instanceof Error
        ? error
        : new InvalidParameterError('予期しないエラーが発生しました');
    }
  }

  /**
   * 銘柄の市場分析データを取得
   * @param symbol 株式銘柄コード
   * @returns 分析データ
   */
  async analyzeStock(symbol: string): Promise<{ symbol: string; trend: string; recommendation: string }> {
    const stockData = await this.getStockPrice(symbol);
    
    // 実際の実装では機械学習モデルなどで分析
    // このサンプルでは単純なロジックでモックデータを返す
    const trend = stockData.change > 0 ? '上昇トレンド' : '下降トレンド';
    const recommendation = stockData.change > 0 ? '買い' : '様子見';
    
    return {
      symbol: stockData.symbol,
      trend,
      recommendation
    };
  }

  // ヘルパーメソッド
  private getMockName(symbol: string): string {
    const names: Record<string, string> = {
      'AAPL': 'Apple Inc.',
      'MSFT': 'Microsoft Corporation',
      'GOOGL': 'Alphabet Inc.',
      'AMZN': 'Amazon.com, Inc.',
      'META': 'Meta Platforms, Inc.',
      'TSLA': 'Tesla, Inc.',
      'NVDA': 'NVIDIA Corporation',
      'JPM': 'JPMorgan Chase & Co.',
    };
    
    return names[symbol.toUpperCase()] || `${symbol.toUpperCase()} Corporation`;
  }

  private generateRandomPrice(): number {
    return Math.floor(Math.random() * 1000) + 50;
  }

  private generateRandomChange(): number {
    return Math.round((Math.random() * 20 - 10) * 100) / 100;
  }

  private generateRandomPercentChange(): number {
    return Math.round((Math.random() * 5 - 2.5) * 100) / 100;
  }
}

// シングルトンインスタンスとしてエクスポート
export const stockService = new StockService(); 