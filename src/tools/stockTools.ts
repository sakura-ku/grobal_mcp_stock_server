import { stockService, stockSymbolSchema } from '../services/stockService.js';

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