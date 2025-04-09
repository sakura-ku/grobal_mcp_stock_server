// 株式データの型定義
export interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  percentChange: number;
  currency: string;
  lastUpdated: string;
}

// 株価履歴データの型定義
export interface StockHistoryData {
  symbol: string;
  interval: 'daily' | 'weekly' | 'monthly';
  data: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

// マーケット概要データの型定義
export interface MarketOverview {
  marketName: string; // 例: 'NYSE', 'NASDAQ', 'TSE'
  marketStatus: 'open' | 'closed' | 'pre-market' | 'after-hours';
  index: number;
  change: number;
  percentChange: number;
  lastUpdated: string;
}

// yahoo-finance2 API 関連の型定義

// モジュールオプション
export interface YahooFinanceOptions {
  /** キャッシュをバイパスするかどうか */
  dryrun?: boolean;
  /** キャッシュの有効期限（分） */
  cache?: number;
}

// コアモジュール: quoteSummary
export interface QuoteSummaryOptions extends YahooFinanceOptions {
  /** 取得するモジュール */
  modules?: QuoteSummaryModules[];
}

export type QuoteSummaryModules =
  | 'assetProfile'
  | 'balanceSheetHistory'
  | 'balanceSheetHistoryQuarterly'
  | 'calendarEvents'
  | 'cashflowStatementHistory'
  | 'cashflowStatementHistoryQuarterly'
  | 'defaultKeyStatistics'
  | 'earnings'
  | 'earningsHistory'
  | 'earningsTrend'
  | 'financialData'
  | 'fundOwnership'
  | 'incomeStatementHistory'
  | 'incomeStatementHistoryQuarterly'
  | 'indexTrend'
  | 'industryTrend'
  | 'insiderHolders'
  | 'insiderTransactions'
  | 'institutionOwnership'
  | 'majorDirectHolders'
  | 'majorHoldersBreakdown'
  | 'netSharePurchaseActivity'
  | 'price'
  | 'quoteType'
  | 'recommendationTrend'
  | 'secFilings'
  | 'sectorTrend'
  | 'summaryDetail'
  | 'summaryProfile'
  | 'topHoldings'
  | 'upgradeDowngradeHistory';

// 財務データモジュールの型
export interface FinancialData {
  currentPrice?: number;
  targetHighPrice?: number;
  targetLowPrice?: number;
  targetMeanPrice?: number;
  targetMedianPrice?: number;
  recommendationMean?: number;
  recommendationKey?: string; // 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell'から任意の文字列に変更
  numberOfAnalystOpinions?: number;
  totalCash?: number;
  totalCashPerShare?: number;
  ebitda?: number;
  totalDebt?: number;
  quickRatio?: number;
  currentRatio?: number;
  totalRevenue?: number;
  debtToEquity?: number;
  revenuePerShare?: number;
  returnOnAssets?: number;
  returnOnEquity?: number;
  grossProfits?: number;
  freeCashflow?: number;
  operatingCashflow?: number;
  earningsGrowth?: number;
  revenueGrowth?: number;
  grossMargins?: number;
  ebitdaMargins?: number;
  operatingMargins?: number;
  profitMargins?: number;
  financialCurrency?: string;
}

// 価格モジュールの型
export interface PriceData {
  maxAge?: number;
  regularMarketChangePercent?: number;
  regularMarketChange?: number;
  regularMarketTime?: number | Date; // 数値または日付型に対応
  priceHint?: number;
  regularMarketPrice?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  regularMarketOpen?: number;
  regularMarketPreviousClose?: number;
  marketCap?: number;
  currency?: string;
  exchange?: string;
  exchangeName?: string;
  marketState?: string; // 文字列型に変更
  quoteType?: string;
  symbol?: string;
  shortName?: string;
  longName?: string;
}

// summaryDetail モジュールの型
export interface SummaryDetailData {
  maxAge?: number;
  priceHint?: number;
  previousClose?: number;
  open?: number;
  dayLow?: number;
  dayHigh?: number;
  regularMarketPreviousClose?: number;
  regularMarketOpen?: number;
  regularMarketDayLow?: number;
  regularMarketDayHigh?: number;
  dividendRate?: number;
  dividendYield?: number;
  exDividendDate?: number | Date; // 数値または日付型に対応
  payoutRatio?: number;
  fiveYearAvgDividendYield?: number;
  beta?: number;
  trailingPE?: number;
  forwardPE?: number;
  volume?: number;
  regularMarketVolume?: number;
  averageVolume?: number;
  averageVolume10days?: number;
  averageDailyVolume10Day?: number;
  bid?: number;
  ask?: number;
  bidSize?: number;
  askSize?: number;
  marketCap?: number;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekHigh?: number;
  priceToSalesTrailing12Months?: number;
  fiftyDayAverage?: number;
  twoHundredDayAverage?: number;
  currency?: string;
  fromCurrency?: string | null;
  toCurrency?: string | null;
  lastMarket?: string | null;
  coinMarketCapLink?: string | null;
  volume24Hr?: number;
  volumeAllCurrencies?: number;
  circulatingSupply?: number;
  algorithm?: string | null;
  maxSupply?: number;
  startDate?: number;
  tradeable?: boolean;
}

// ヒストリカルデータの型
export interface HistoricalDataOptions extends YahooFinanceOptions {
  period1: string | Date;
  period2?: string | Date;
  interval?: '1m' | '2m' | '5m' | '15m' | '30m' | '60m' | '90m' | '1h' | '1d' | '5d' | '1wk' | '1mo' | '3mo';
  events?: string;
  includePrePost?: boolean;
}

export interface HistoricalData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjclose?: number;
}

// 検索結果の型
export interface SearchResult {
  exchange?: string;
  shortname?: string;
  quoteType?: string;
  symbol?: string;
  index?: string;
  score?: number;
  typeDisp?: string;
  longname?: string;
  isYahooFinance?: boolean;
  sector?: string;
  industry?: string;
}

/**
 * 株価の歴史データを表す型
 */
export interface HistoricalStockData {
  symbol: string;
  period: number;
  prices: {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
}

/**
 * 株価トレンド分析結果を表す型
 */
export interface StockTrendAnalysis {
  symbol: string;
  period: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  strengthScore: number;
  currentPrice: number;
  priceChange: number;
  volatility: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  technicalIndicators: {
    sma: {
      sma20: number[];
      sma50: number[];
    };
    ema: {
      ema12: number[];
      ema26: number[];
    };
    rsi: number;
    macd: {
      line: number;
      signal: number;
      histogram: number;
    };
    bollingerBands: {
      upper: number;
      middle: number;
      lower: number;
      width: number;
    };
    atr: number;
  };
  supportLevels: number[];
  resistanceLevels: number[];
  volumeAnalysis: {
    averageVolume: number;
    recentVolumeChange: number;
  };
  recommendedAction: 'buy' | 'sell' | 'hold';
}

// ポートフォリオパフォーマンス分析の型
export interface PortfolioPerformance {
  holdings: Array<{
    symbol: string;
    name: string;
    quantity: number;
    purchasePrice: number;
    currentPrice: number;
    totalValue: number;
    gainLoss: number;
    gainLossPercent: number;
    weight: number; // ポートフォリオに占める割合（%）
  }>;
  totalValue: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  sectorAllocation: Record<string, number>; // セクター別の配分（%）
  riskMetrics: {
    volatility: number;
    beta: number;
    sharpeRatio: number;
    drawdown: number;
  };
  performance: {
    daily: number;
    weekly: number;
    monthly: number;
    ytd: number;
    yearly: number;
  };
  lastUpdated: string;
}