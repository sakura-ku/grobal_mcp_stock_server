import { z } from 'zod';
import { InvalidParameterError } from '../errors/index.js';
import type { StockData } from '../types/stock.js';
import { McpFunctionDefinition } from '@modelcontextprotocol/sdk';

// パラメータのバリデーションスキーマ
const getStockPriceSchema = z.object({
  symbol: z.string().min(1).max(10).describe('Stock symbol to look up'),
});

// 関数定義
export const getStockPriceDefinition: McpFunctionDefinition = {
  name: 'get_stock_price',
  description: '指定された株式銘柄の現在の株価と関連情報を取得します',
  parameters: {
    type: 'object',
    required: ['symbol'],
    properties: {
      symbol: {
        type: 'string',
        description: '株式銘柄コード（例: AAPL, MSFT, GOOGL）',
      },
    },
  },
};

// ツール実装
export const getStockPrice = async (params: unknown) => {
  // パラメータの検証
  const validationResult = getStockPriceSchema.safeParse(params);
  if (!validationResult.success) {
    throw new InvalidParameterError(validationResult.error.message);
  }

  const { symbol } = validationResult.data;

  try {
    // 注: ここでは実際のAPIコールの代わりにモックデータを返します
    // 実際の実装では外部APIを呼び出して実データを取得します
    const mockData: StockData = {
      symbol: symbol.toUpperCase(),
      name: getMockName(symbol),
      price: generateRandomPrice(),
      change: generateRandomChange(),
      percentChange: generateRandomPercentChange(),
      currency: 'USD',
      lastUpdated: new Date().toISOString(),
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(mockData, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error('Error fetching stock price:', error);
    throw error;
  }
};

// モックデータ生成ヘルパー関数
function getMockName(symbol: string): string {
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

function generateRandomPrice(): number {
  return Math.floor(Math.random() * 1000) + 50;
}

function generateRandomChange(): number {
  return Math.round((Math.random() * 20 - 10) * 100) / 100;
}

function generateRandomPercentChange(): number {
  return Math.round((Math.random() * 5 - 2.5) * 100) / 100;
}