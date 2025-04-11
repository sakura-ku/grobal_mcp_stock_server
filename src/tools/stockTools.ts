import { stockService, stockSymbolSchema, stockHistorySchema, stockSearchSchema, portfolioSchema } from '../services/stockService.js';
import stockAnalysisService from '../services/stockAnalysisService.js';
import { StockTrendAnalysis } from '../types/stock.js';

// MCPツール定義のためのインターフェース
interface Tool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
  execute: (params: any, service?: any) => Promise<any>;
}

/**
 * 株価取得ツールの定義
 * MCPサーバー用のツール定義で、stockServiceを呼び出す
 */
export const getStockPriceDefinition = {
  name: 'get_stock_price',
  description: '指定された株式銘柄の現在の株価と関連情報を取得します',
  parameters: {
    symbol: stockSymbolSchema.shape.symbol,
  },
  handler: async (params: { symbol: string }) => {
    const { symbol } = params;
    
    // サービスレイヤーを呼び出し
    const stockData = await stockService.getStockPrice(symbol);
    
    // MCPの期待する形式で返す
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(stockData, null, 2),
        },
      ],
    };
  }
};

/**
 * 株価分析ツールの定義
 */
export const analyzeStockDefinition = {
  name: 'analyze_stock',
  description: '株式銘柄の市場動向を分析し、投資判断を提供します',
  parameters: {
    symbol: stockSymbolSchema.shape.symbol,
  },
  handler: async (params: { symbol: string }) => {
    const { symbol } = params;
    
    // サービスレイヤーを呼び出し
    const analysisData = await stockService.analyzeStock(symbol);
    
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(analysisData, null, 2),
        },
      ],
    };
  }
};

/**
 * 複数銘柄一括取得ツールの定義
 */
export const getMultipleStockPricesDefinition = {
  name: 'get_multiple_stock_prices',
  description: '複数の株式銘柄の価格を一度に取得します',
  parameters: {
    symbols: stockSymbolSchema.extend({
      symbols: stockSymbolSchema.shape.symbol.array()
        .describe('カンマ区切りの株式銘柄コードリスト')
    }).shape.symbols,
  },
  handler: async (params: { symbols: string[] }) => {
    const { symbols } = params;
    
    // サービスレイヤーを呼び出し
    const stockDataList = await stockService.getMultipleStockPrices(symbols);
    
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(stockDataList, null, 2),
        },
      ],
    };
  }
};

/**
 * 株価履歴データ取得ツールの定義
 */
export const getStockHistoryDefinition = {
  name: 'get_stock_history',
  description: '指定された株式銘柄の過去の株価データを取得します',
  parameters: {
    symbol: stockHistorySchema.shape.symbol,
    interval: stockHistorySchema.shape.interval,
    range: stockHistorySchema.shape.range,
  },
  handler: async (params: { symbol: string; interval: 'daily' | 'weekly' | 'monthly'; range?: string }) => {
    const { symbol, interval, range } = params;
    
    // サービスレイヤーを呼び出し
    const historyData = await stockService.getStockHistory(symbol, interval, range);
    
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(historyData, null, 2),
        },
      ],
    };
  }
};

/**
 * 株式詳細情報取得ツールの定義
 */
export const getStockDetailsDefinition = {
  name: 'get_stock_details',
  description: '指定された株式銘柄の詳細な財務情報や価格情報を取得します',
  parameters: {
    symbol: stockSymbolSchema.shape.symbol,
  },
  handler: async (params: { symbol: string }) => {
    const { symbol } = params;
    
    // サービスレイヤーを呼び出し
    const detailsData = await stockService.getStockDetails(symbol);
    
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(detailsData, null, 2),
        },
      ],
    };
  }
};

/**
 * 株式検索ツールの定義
 */
export const searchStocksDefinition = {
  name: 'search_stocks',
  description: 'キーワードに基づいて株式銘柄を検索します',
  parameters: {
    query: stockSearchSchema.shape.query,
  },
  handler: async (params: { query: string }) => {
    const { query } = params;
    
    // サービスレイヤーを呼び出し
    const searchResults = await stockService.searchStocks(query);
    
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(searchResults, null, 2),
        },
      ],
    };
  }
};

/**
 * ポートフォリオ分析ツールの定義
 */
export const analyzePortfolioDefinition = {
  name: 'analyze_portfolio',
  description: '保有株式ポートフォリオのパフォーマンスと特性を分析します',
  parameters: {
    holdings: portfolioSchema.shape.holdings,
  },
  handler: async (params: { holdings: Array<{symbol: string; quantity: number; purchasePrice?: number}> }) => {
    const { holdings } = params;
    
    // サービスレイヤーを呼び出し
    const portfolioAnalysis = await stockService.analyzePortfolio(holdings);
    
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(portfolioAnalysis, null, 2),
        },
      ],
    };
  }
};

/**
 * 詳細な株価トレンド分析を行うツール
 */
export const analyzeStockTrendTool: Tool = {
  name: 'analyze_stock_trend',
  description: '指定された株式シンボルの詳細なトレンド分析を行います。複数のテクニカル指標を用いて、現在のトレンド方向、強度、サポート/レジスタンスレベル、推奨アクションなどを提供します。',
  parameters: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: '分析する株式のシンボル（例：AAPL, MSFT, GOOG）'
      },
      period: {
        type: 'number',
        description: '分析する期間（日数）。デフォルトは60日。'
      }
    },
    required: ['symbol']
  },
  execute: async ({ symbol, period = 60 }: { symbol: string; period?: number }): Promise<StockTrendAnalysis> => {
    return await stockAnalysisService.analyzeStockTrend(symbol, period);
  }
};

// 以下のツールは未実装のため、後で必要に応じて有効化する
// export const predictStockPriceTool: Tool = {...};
// export const analyzeTechnicalTool: Tool = {...};

// ツール定義のエクスポート
export const stockTools = [
  getStockPriceDefinition,
  analyzeStockDefinition,
  getMultipleStockPricesDefinition,
  getStockHistoryDefinition,
  getStockDetailsDefinition,
  searchStocksDefinition,
  analyzePortfolioDefinition,
  analyzeStockTrendTool
]; 