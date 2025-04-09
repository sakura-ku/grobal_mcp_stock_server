import { z } from 'zod';
import { InvalidParameterError } from '../errors/index.js';
import type { 
  StockData, 
  StockHistoryData, 
  FinancialData, 
  PriceData, 
  SummaryDetailData, 
  HistoricalData, 
  StockTrendAnalysis,
  SearchResult,
  PortfolioPerformance
} from '../types/stock.js';
import yahooFinance from 'yahoo-finance2';
import config from '../config/index.js';
import { logger } from '../utils/logger.js';

// パラメータのバリデーションスキーマ
export const stockSymbolSchema = z.object({
  symbol: z.string().min(1).max(10).describe('株式銘柄コード')
});

export const stockHistorySchema = z.object({
  symbol: z.string().min(1).max(10).describe('株式銘柄コード'),
  interval: z.enum(['daily', 'weekly', 'monthly']).describe('取得間隔'),
  range: z.enum(['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'max']).optional().describe('取得期間')
});

export const stockSearchSchema = z.object({
  query: z.string().min(1).max(50).describe('検索キーワード')
});

export const portfolioSchema = z.object({
  holdings: z.array(
    z.object({
      symbol: z.string().min(1).max(10),
      quantity: z.number().positive(),
      purchasePrice: z.number().positive().optional()
    })
  ).min(1)
});

/**
 * yahoo-finance2のインターバルを内部形式に変換
 */
function convertInterval(interval: string): '1d' | '1wk' | '1mo' {
  switch(interval) {
    case 'daily': return '1d';
    case 'weekly': return '1wk';
    case 'monthly': return '1mo';
    default: return '1d';
  }
}

/**
 * 株価関連のビジネスロジックを提供するサービスクラス
 */
class StockService {
  private readonly apiUrl: string;
  private readonly apiTimeout: number;
  
  constructor() {
    this.apiUrl = config.api.stockApiUrl;
    this.apiTimeout = config.api.timeout;
  }

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
      logger.info(`株価情報取得開始: ${symbol}`);
      // yahoo-finance2を使用して実際のデータを取得
      const quote = await yahooFinance.quote(symbol);
      
      const timestamp = typeof quote.regularMarketTime === 'number' 
        ? quote.regularMarketTime 
        : 0;
      return {
        symbol: symbol.toUpperCase(),
        name: quote.shortName || quote.longName || `${symbol.toUpperCase()} Corporation`,
        price: quote.regularMarketPrice || 0,
        change: quote.regularMarketChange || 0,
        percentChange: quote.regularMarketChangePercent || 0,
        currency: quote.currency || 'USD',
        lastUpdated: new Date(timestamp * 1000).toISOString(),
      };
    } catch (error) {
      logger.error('株価取得エラー:', error);
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
      logger.info(`複数株価情報取得開始: ${symbols.join(', ')}`);
      // 各銘柄の株価を並行して取得
      const promises = symbols.map(symbol => this.getStockPrice(symbol));
      return await Promise.all(promises);
    } catch (error) {
      logger.error('複数株価取得エラー:', error);
      throw error instanceof Error
        ? error
        : new InvalidParameterError('予期しないエラーが発生しました');
    }
  }

  /**
   * 株価の履歴データを取得
   * @param symbol 株式銘柄コード
   * @param interval 取得間隔 (daily, weekly, monthly)
   * @param range 取得期間
   * @returns 履歴株価データ
   */
  async getStockHistory(
    symbol: string, 
    interval: 'daily' | 'weekly' | 'monthly' = 'daily',
    range: string = '1mo'
  ): Promise<StockHistoryData> {
    if (!symbol) {
      throw new InvalidParameterError('銘柄コードは必須です');
    }

    try {
      logger.info(`株価履歴取得開始: ${symbol}, インターバル: ${interval}, 期間: ${range}`);
      
      const yahooInterval = convertInterval(interval);
      const period2 = new Date();
      
      // 期間に基づいて期間開始日を設定
      let period1: Date;
      const now = new Date();
      
      switch(range) {
        case '1d': period1 = new Date(now.setDate(now.getDate() - 1)); break;
        case '5d': period1 = new Date(now.setDate(now.getDate() - 5)); break;
        case '1mo': period1 = new Date(now.setMonth(now.getMonth() - 1)); break;
        case '3mo': period1 = new Date(now.setMonth(now.getMonth() - 3)); break;
        case '6mo': period1 = new Date(now.setMonth(now.getMonth() - 6)); break;
        case '1y': period1 = new Date(now.setFullYear(now.getFullYear() - 1)); break;
        case '2y': period1 = new Date(now.setFullYear(now.getFullYear() - 2)); break;
        case '5y': period1 = new Date(now.setFullYear(now.getFullYear() - 5)); break;
        case '10y': period1 = new Date(now.setFullYear(now.getFullYear() - 10)); break;
        case 'max': period1 = new Date(1970, 0, 1); break;
        default: period1 = new Date(now.setMonth(now.getMonth() - 1));
      }
      
      const historyResult = await yahooFinance.historical(symbol, {
        period1,
        period2,
        interval: yahooInterval
      });
      
      return {
        symbol: symbol.toUpperCase(),
        interval,
        data: historyResult.map(item => ({
          date: item.date.toISOString(),
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume
        }))
      };
    } catch (error) {
      logger.error('株価履歴取得エラー:', error);
      throw error instanceof Error
        ? error
        : new InvalidParameterError('株価履歴の取得中にエラーが発生しました');
    }
  }

  /**
   * 株式の詳細情報を取得
   * @param symbol 株式銘柄コード
   * @returns 株式詳細情報
   */
  async getStockDetails(symbol: string): Promise<{
    financialData: Partial<FinancialData>;
    priceData: Partial<PriceData>;
    summaryDetail: Partial<SummaryDetailData>;
  }> {
    if (!symbol) {
      throw new InvalidParameterError('銘柄コードは必須です');
    }
    
    try {
      logger.info(`株式詳細情報取得開始: ${symbol}`);
      const result = await yahooFinance.quoteSummary(symbol, {
        modules: ['financialData', 'price', 'summaryDetail']
      });
      
      // APIデータを型安全に扱う
      const financialData: Partial<FinancialData> = {};
      const priceData: Partial<PriceData> = {};
      const summaryDetail: Partial<SummaryDetailData> = {};
      
      // financialDataのコピー
      if (result.financialData) {
        const fd = result.financialData;
        
        // 安全に型変換してコピー
        if (typeof fd.currentPrice === 'number') financialData.currentPrice = fd.currentPrice;
        if (typeof fd.targetHighPrice === 'number') financialData.targetHighPrice = fd.targetHighPrice;
        if (typeof fd.targetLowPrice === 'number') financialData.targetLowPrice = fd.targetLowPrice;
        if (typeof fd.targetMeanPrice === 'number') financialData.targetMeanPrice = fd.targetMeanPrice;
        if (typeof fd.recommendationMean === 'number') financialData.recommendationMean = fd.recommendationMean;
        if (typeof fd.recommendationKey === 'string') financialData.recommendationKey = fd.recommendationKey;
        if (typeof fd.numberOfAnalystOpinions === 'number') financialData.numberOfAnalystOpinions = fd.numberOfAnalystOpinions;
        if (typeof fd.totalCash === 'number') financialData.totalCash = fd.totalCash;
        if (typeof fd.totalDebt === 'number') financialData.totalDebt = fd.totalDebt;
        if (typeof fd.quickRatio === 'number') financialData.quickRatio = fd.quickRatio;
        if (typeof fd.currentRatio === 'number') financialData.currentRatio = fd.currentRatio;
        if (typeof fd.totalRevenue === 'number') financialData.totalRevenue = fd.totalRevenue;
        if (typeof fd.returnOnAssets === 'number') financialData.returnOnAssets = fd.returnOnAssets;
        if (typeof fd.returnOnEquity === 'number') financialData.returnOnEquity = fd.returnOnEquity;
        if (typeof fd.grossProfits === 'number') financialData.grossProfits = fd.grossProfits;
        if (typeof fd.operatingCashflow === 'number') financialData.operatingCashflow = fd.operatingCashflow;
        if (typeof fd.revenueGrowth === 'number') financialData.revenueGrowth = fd.revenueGrowth;
        if (typeof fd.operatingMargins === 'number') financialData.operatingMargins = fd.operatingMargins;
        if (typeof fd.profitMargins === 'number') financialData.profitMargins = fd.profitMargins;
        if (typeof fd.financialCurrency === 'string') financialData.financialCurrency = fd.financialCurrency;
      }
      
      // priceDataのコピー
      if (result.price) {
        const pd = result.price;
        
        if (typeof pd.regularMarketPrice === 'number') priceData.regularMarketPrice = pd.regularMarketPrice;
        if (typeof pd.regularMarketChange === 'number') priceData.regularMarketChange = pd.regularMarketChange;
        if (typeof pd.regularMarketChangePercent === 'number') priceData.regularMarketChangePercent = pd.regularMarketChangePercent;
        if (typeof pd.marketCap === 'number') priceData.marketCap = pd.marketCap;
        if (typeof pd.currency === 'string') priceData.currency = pd.currency;
        if (typeof pd.exchange === 'string') priceData.exchange = pd.exchange;
        if (typeof pd.exchangeName === 'string') priceData.exchangeName = pd.exchangeName;
        if (typeof pd.marketState === 'string') priceData.marketState = pd.marketState;
        if (typeof pd.symbol === 'string') priceData.symbol = pd.symbol;
        if (typeof pd.shortName === 'string') priceData.shortName = pd.shortName;
        if (typeof pd.longName === 'string') priceData.longName = pd.longName;
      }
      
      // summaryDataのコピー
      if (result.summaryDetail) {
        const sd = result.summaryDetail;
        
        if (typeof sd.previousClose === 'number') summaryDetail.previousClose = sd.previousClose;
        if (typeof sd.open === 'number') summaryDetail.open = sd.open;
        if (typeof sd.dayLow === 'number') summaryDetail.dayLow = sd.dayLow;
        if (typeof sd.dayHigh === 'number') summaryDetail.dayHigh = sd.dayHigh;
        if (typeof sd.regularMarketVolume === 'number') summaryDetail.regularMarketVolume = sd.regularMarketVolume;
        if (typeof sd.volume === 'number') summaryDetail.volume = sd.volume;
        if (typeof sd.averageVolume === 'number') summaryDetail.averageVolume = sd.averageVolume;
        if (typeof sd.marketCap === 'number') summaryDetail.marketCap = sd.marketCap;
        if (typeof sd.beta === 'number') summaryDetail.beta = sd.beta;
        if (typeof sd.trailingPE === 'number') summaryDetail.trailingPE = sd.trailingPE;
        if (typeof sd.forwardPE === 'number') summaryDetail.forwardPE = sd.forwardPE;
        if (typeof sd.dividendRate === 'number') summaryDetail.dividendRate = sd.dividendRate;
        if (typeof sd.dividendYield === 'number') summaryDetail.dividendYield = sd.dividendYield;
        if (typeof sd.fiveYearAvgDividendYield === 'number') summaryDetail.fiveYearAvgDividendYield = sd.fiveYearAvgDividendYield;
        if (typeof sd.currency === 'string') summaryDetail.currency = sd.currency;
      }
      
      return {
        financialData,
        priceData,
        summaryDetail
      };
    } catch (error) {
      logger.error('株式詳細情報取得エラー:', error);
      throw error instanceof Error
        ? error
        : new InvalidParameterError('株式詳細情報の取得中にエラーが発生しました');
    }
  }

  /**
   * 株式銘柄の基本分析を行う
   * @param symbol 株式銘柄コード
   * @returns 分析結果
   */
  async analyzeStock(symbol: string): Promise<StockTrendAnalysis> {
    if (!symbol) {
      throw new InvalidParameterError('銘柄コードは必須です');
    }
    
    try {
      logger.info(`株式分析開始: ${symbol}`);
      
      // 基本株価データを取得
      const stockData = await this.getStockPrice(symbol);
      
      // 1年分の株価履歴を取得
      const historyData = await this.getStockHistory(symbol, 'daily', '1y');
      
      if (!historyData.data || historyData.data.length < 30) {
        throw new InvalidParameterError('分析に十分なデータがありません');
      }
      
      // ヒストリカルデータから価格配列を作成（日付降順）
      const prices = historyData.data.map(item => item.close);
      
      // 基本的なテクニカル指標を計算
      const sma50 = this.calculateSMA(prices, 50);
      const sma200 = this.calculateSMA(prices, 200);
      const ema12 = this.calculateEMA(prices, 12);
      const ema26 = this.calculateEMA(prices, 26);
      const rsi = this.calculateRSI(prices, 14);
      
      // MACDを計算
      const macd = this.calculateMACD(prices);
      
      // ボリンジャーバンドを計算
      const bollingerBands = this.calculateBollingerBands(prices, 20, 2);
      
      // ATRを計算（簡略化のため、ボリンジャーバンドの幅を使用）
      const atr = bollingerBands.width;
      
      // トレンド判定
      let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      let strengthScore = 50; // 0-100のスケール
      
      // 単純なトレンド判定ロジック
      if (prices[0] > sma50 && sma50 > sma200 && macd.histogram > 0 && rsi > 50) {
        trend = 'bullish';
        strengthScore = Math.min(100, 50 + ((rsi - 50) * 1.5));
      } else if (prices[0] < sma50 && sma50 < sma200 && macd.histogram < 0 && rsi < 50) {
        trend = 'bearish';
        strengthScore = Math.max(0, 50 - ((50 - rsi) * 1.5));
      }
      
      // 最新の価格とボラティリティ
      const currentPrice = stockData.price;
      const priceChange = stockData.change;
      
      // 価格範囲とサポート/レジスタンスレベルを計算
      const sortedPrices = [...prices].sort((a, b) => a - b);
      const min = sortedPrices[0];
      const max = sortedPrices[sortedPrices.length - 1];
      const range = max - min;
      const supportLevels = [
        min,
        min + range * 0.25,
        min + range * 0.5
      ];
      const resistanceLevels = [
        min + range * 0.5,
        min + range * 0.75,
        max
      ];
      
      // 推奨アクション
      let recommendedAction: 'buy' | 'sell' | 'hold' = 'hold';
      if (trend === 'bullish' && strengthScore > 70) {
        recommendedAction = 'buy';
      } else if (trend === 'bearish' && strengthScore < 30) {
        recommendedAction = 'sell';
      }
      
      // 信頼度レベル
      let confidenceLevel: 'low' | 'medium' | 'high' = 'medium';
      if (strengthScore > 80 || strengthScore < 20) {
        confidenceLevel = 'high';
      } else if (strengthScore > 60 || strengthScore < 40) {
        confidenceLevel = 'medium';
      } else {
        confidenceLevel = 'low';
      }
      
      // ボラティリティを計算
      const volatility = bollingerBands.width / prices[0];
      
      // 出来高分析
      const volumes = historyData.data.map(item => item.volume);
      const avgVolume = this.calculateSMA(volumes, 20);
      const recentVolumeChange = (volumes[0] / avgVolume) - 1;
      
      return {
        symbol: stockData.symbol,
        period: historyData.data.length,
        trend,
        strengthScore,
        currentPrice,
        priceChange,
        volatility,
        confidenceLevel,
        technicalIndicators: {
          sma: {
            sma20: [this.calculateSMA(prices, 20)],
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
        },
        supportLevels,
        resistanceLevels,
        volumeAnalysis: {
          averageVolume: avgVolume,
          recentVolumeChange
        },
        recommendedAction
      };
    } catch (error) {
      logger.error('株式分析エラー:', error);
      throw error instanceof Error
        ? error
        : new InvalidParameterError('株式分析中にエラーが発生しました');
    }
  }

  /**
   * 株式銘柄を検索する
   * @param query 検索クエリ
   * @returns 検索結果
   */
  async searchStocks(query: string): Promise<SearchResult[]> {
    if (!query) {
      throw new InvalidParameterError('検索クエリは必須です');
    }
    
    try {
      logger.info(`株式検索開始: ${query}`);
      const results = await yahooFinance.search(query);
      return results.quotes.map(quote => {
        const quoteAny = quote as any;
        return {
          exchange: quoteAny.exchange || '',
          shortname: quoteAny.shortname || '',
          quoteType: quoteAny.quoteType || '',
          symbol: quoteAny.symbol || '',
          index: quoteAny.index || '',
          score: quoteAny.score || 0,
          typeDisp: quoteAny.typeDisp || '',
          longname: quoteAny.longname || '',
          isYahooFinance: Boolean(quoteAny.isYahooFinance),
          sector: quoteAny.sector,
          industry: quoteAny.industry
        };
      });
    } catch (error) {
      logger.error('株式検索エラー:', error);
      throw error instanceof Error
        ? error
        : new InvalidParameterError('株式検索中にエラーが発生しました');
    }
  }

  /**
   * ポートフォリオのパフォーマンス分析
   * @param holdings 保有銘柄情報
   * @returns ポートフォリオパフォーマンス分析
   */
  async analyzePortfolio(holdings: Array<{symbol: string; quantity: number; purchasePrice?: number}>): Promise<PortfolioPerformance> {
    if (!holdings || holdings.length === 0) {
      throw new InvalidParameterError('少なくとも1つの保有銘柄が必要です');
    }
    
    try {
      logger.info(`ポートフォリオ分析開始: ${holdings.length}銘柄`);
      
      // 各銘柄の現在の価格データを取得
      const symbols = holdings.map(h => h.symbol);
      const stockPrices = await this.getMultipleStockPrices(symbols);
      
      // 詳細データを並行して取得（セクター情報などのため）
      const detailsPromises = symbols.map(symbol => 
        yahooFinance.quoteSummary(symbol, {
          modules: ['assetProfile', 'defaultKeyStatistics', 'price']
        }).catch(() => ({}))
      );
      const detailsResults = await Promise.all(detailsPromises);
      
      // 保有銘柄データの構築
      const holdingsData = holdings.map((holding, index) => {
        const stockData = stockPrices[index];
        const purchasePrice = holding.purchasePrice || stockData.price;
        const totalValue = holding.quantity * stockData.price;
        const gainLoss = totalValue - (holding.quantity * purchasePrice);
        const gainLossPercent = ((stockData.price / purchasePrice) - 1) * 100;
        
        return {
          symbol: holding.symbol,
          name: stockData.name,
          quantity: holding.quantity,
          purchasePrice,
          currentPrice: stockData.price,
          totalValue,
          gainLoss,
          gainLossPercent,
          weight: 0 // 後で計算
        };
      });
      
      // 合計価値を計算
      const totalValue = holdingsData.reduce((sum, h) => sum + h.totalValue, 0);
      
      // 各銘柄の重みを計算
      holdingsData.forEach(h => {
        h.weight = (h.totalValue / totalValue) * 100;
      });
      
      // 総利益/損失を計算
      const totalGainLoss = holdingsData.reduce((sum, h) => sum + h.gainLoss, 0);
      const totalGainLossPercent = (totalGainLoss / (totalValue - totalGainLoss)) * 100;
      
      // セクター配分を計算
      const sectorAllocation: Record<string, number> = {};
      detailsResults.forEach((details, index) => {
        const assetProfile = details && typeof details === 'object' ? (details as any).assetProfile : null;
        const sector = assetProfile && typeof assetProfile === 'object' ? assetProfile.sector : null;
        
        if (sector) {
          const weight = holdingsData[index].weight;
          
          if (sectorAllocation[sector]) {
            sectorAllocation[sector] += weight;
          } else {
            sectorAllocation[sector] = weight;
          }
        }
      });
      
      // リスクメトリクスの計算（簡易版）
      // ここでは実際のデータからボラティリティとベータを計算するのは複雑なので、
      // 利用可能な場合はYahoo Financeから取得した値を使用
      const riskMetrics = {
        volatility: 0,
        beta: 0,
        sharpeRatio: 0,
        drawdown: 0
      };
      
      // ベータの加重平均を計算
      let weightedBetaSum = 0;
      let weightSum = 0;
      
      detailsResults.forEach((details, index) => {
        const keyStats = details && typeof details === 'object' ? (details as any).defaultKeyStatistics : null;
        const beta = keyStats && typeof keyStats === 'object' ? keyStats.beta : null;
        
        if (beta && typeof beta === 'number') {
          const weight = holdingsData[index].weight;
          
          weightedBetaSum += beta * weight;
          weightSum += weight;
        }
      });
      
      if (weightSum > 0) {
        riskMetrics.beta = weightedBetaSum / weightSum;
      }
      
      // 通貨情報を取得 (最初の株式の通貨を使用)
      const currency = stockPrices.length > 0 ? stockPrices[0].currency : 'USD';
      
      return {
        totalValue,
        totalChange: totalGainLoss,
        totalChangePercent: totalGainLossPercent,
        holdings: holdingsData,
        diversification: {
          bySector: sectorAllocation
        },
        riskMetrics,
        currency,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      logger.error('ポートフォリオ分析エラー:', error);
      throw error instanceof Error
        ? error
        : new InvalidParameterError('ポートフォリオ分析中にエラーが発生しました');
    }
  }

  // テクニカル指標計算ヘルパーメソッド
  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) {
      return prices.reduce((sum, price) => sum + price, 0) / prices.length;
    }
    
    const slice = prices.slice(prices.length - period);
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
      const change = prices[i] - prices[i - 1];
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
      const change = prices[i] - prices[i - 1];
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
        upper: prices[prices.length - 1],
        middle: prices[prices.length - 1],
        lower: prices[prices.length - 1],
        width: 0
      };
    }

    const slice = prices.slice(prices.length - period);
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
   * 平均真の範囲（ATR）を計算
   * @param highPrices 高値配列
   * @param lowPrices 安値配列
   * @param closePrices 終値配列
   * @param period 期間（通常14）
   * @returns ATR値
   */
  private calculateATR(highPrices: number[], lowPrices: number[], closePrices: number[], period: number): number {
    if (highPrices.length < period + 1 || lowPrices.length < period + 1 || closePrices.length < period + 1) {
      return 0;
    }

    // 真の範囲を計算
    const trValues: number[] = [];
    for (let i = 1; i < highPrices.length; i++) {
      // 現在の高値 - 現在の安値
      const tr1 = highPrices[i] - lowPrices[i];
      // |現在の高値 - 前日の終値|
      const tr2 = Math.abs(highPrices[i] - closePrices[i - 1]);
      // |現在の安値 - 前日の終値|
      const tr3 = Math.abs(lowPrices[i] - closePrices[i - 1]);
      
      // 3つの中から最大値を選択
      trValues.push(Math.max(tr1, tr2, tr3));
    }

    // 最初のATRはSMAで計算
    if (trValues.length <= period) {
      return trValues.reduce((sum, tr) => sum + tr, 0) / trValues.length;
    }

    // 残りのATRはスムージング
    let atr = trValues.slice(0, period).reduce((sum, tr) => sum + tr, 0) / period;
    for (let i = period; i < trValues.length; i++) {
      atr = ((atr * (period - 1)) + trValues[i]) / period;
    }

    return atr;
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

  /**
   * 株価のトレンド分析を行う
   * @param symbol 株式銘柄コード
   * @param period 分析期間（日数）
   * @returns トレンド分析結果
   */
  public async analyzeStockTrend(symbol: string, period: number = 60): Promise<StockTrendAnalysis> {
    if (!symbol) {
      throw new InvalidParameterError('銘柄コードは必須です');
    }

    try {
      logger.info(`株価トレンド分析開始: ${symbol}, 期間: ${period}日`);
      
      // 指定された期間の株価履歴を取得
      const interval = 'daily';
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - period);
      
      // 株価履歴データを取得
      const historyResult = await yahooFinance.historical(symbol, {
        period1: startDate,
        period2: endDate,
        interval: '1d'
      });
      
      // 履歴データが少なすぎる場合はエラー
      if (historyResult.length < 5) {
        throw new InvalidParameterError(`十分な履歴データがありません（${historyResult.length}件）`);
      }
      
      // 最新の株価情報を取得
      const latestQuote = await yahooFinance.quote(symbol);
      const currentPrice = latestQuote.regularMarketPrice || 0;
      const priceChange = latestQuote.regularMarketChange || 0;
      
      // ここでトレンド分析のロジックを適用
      // 簡単な例: 過去5日間の平均と現在価格を比較
      const recentAverage = historyResult.slice(0, 5).reduce((sum, item) => sum + item.close, 0) / 5;
      
      // トレンド強度を計算 (-1.0 to 1.0の範囲)
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
      const sma20 = prices.slice(0, 20).reduce((a, b) => a + b, 0) / 20;
      const sma50 = prices.slice(0, 50).reduce((a, b) => a + b, 0) / 50;
      
      // サポートとレジスタンスレベルを決定
      const min = Math.min(...prices.slice(0, 20));
      const max = Math.max(...prices.slice(0, 20));
      
      // 分析結果を返す
      return {
        symbol: symbol.toUpperCase(),
        period,
        trend,
        strengthScore: parseFloat(trendStrength.toFixed(2)),
        currentPrice,
        priceChange,
        volatility,
        confidenceLevel,
        technicalIndicators: {
          sma: {
            sma20: [sma20],
            sma50: [sma50]
          },
          ema: {
            ema12: [0],  // 簡易実装のため仮の値
            ema26: [0]   // 簡易実装のため仮の値
          },
          rsi: 50, // 簡易実装のため仮の値
          macd: {
            line: 0,     // 簡易実装のため仮の値
            signal: 0,   // 簡易実装のため仮の値
            histogram: 0 // 簡易実装のため仮の値
          },
          bollingerBands: {
            upper: max,
            middle: recentAverage,
            lower: min,
            width: max - min
          },
          atr: volatility // 簡易実装としてボラティリティを使用
        },
        supportLevels: [min, min * 0.95],
        resistanceLevels: [max, max * 1.05],
        volumeAnalysis: {
          averageVolume: historyResult.slice(0, 20).reduce((sum, item) => sum + item.volume, 0) / 20,
          recentVolumeChange: 0 // 簡易実装のため仮の値
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
}

// シングルトンインスタンスとしてエクスポート
export const stockService = new StockService(); 