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