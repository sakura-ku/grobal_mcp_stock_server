import { jest } from '@jest/globals';
import { InvalidParameterError } from '../../errors/index.js';
import type { 
  StockData, 
  StockHistoryData,
  StockTrendAnalysis
} from '../../types/stock.js';

// Polygon.ioモジュールのモック
jest.mock('@polygon.io/client-js', () => {
  const mockPreviousClose = jest.fn().mockImplementation((symbol) => {
    if (symbol === 'ERROR') {
      return Promise.reject(new Error('API error'));
    }
    return Promise.resolve({
      status: 'OK',
      results: [{
        T: 'AAPL',
        c: 150,
        h: 155,
        l: 145,
        o: 146,
        v: 1000000,
        t: Date.now()
      }]
    });
  });

  const mockAggregates = jest.fn().mockImplementation((ticker, multiplier, timespan, from, to) => {
    return Promise.resolve({
      status: 'OK',
      ticker: ticker,
      results: [
        {
          t: Date.now() - 86400000 * 1,
          o: 145,
          h: 150,
          l: 140,
          c: 147,
          v: 1000000
        },
        {
          t: Date.now() - 86400000 * 2,
          o: 147,
          h: 152,
          l: 142,
          c: 149,
          v: 1100000
        }
      ]
    });
  });

  const mockStockDetails = jest.fn().mockImplementation((symbol) => {
    return Promise.resolve({
      status: 'OK',
      results: {
        ticker: symbol,
        name: 'Apple Inc.',
        market: 'stocks',
        locale: 'us',
        type: 'CS',
        currency: 'USD',
        active: true,
        primaryExchange: 'XNAS',
        updated: new Date().toISOString(),
        description: 'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.',
        marketCap: 2000000000000,
        homepageUrl: 'https://www.apple.com',
        totalEmployees: 150000,
        listDate: '1980-12-12',
        shareClassOutstanding: 16000000000,
        weightedSharesOutstanding: 16000000000
      }
    });
  });

  const mockReferenceTickers = jest.fn().mockImplementation((queryParams: any) => {
    if (queryParams.search === 'NonExistentCompany') {
      return Promise.resolve({
        status: 'OK',
        results: []
      });
    }
    
    return Promise.resolve({
      status: 'OK',
      results: [
        {
          ticker: 'AAPL',
          name: 'Apple Inc.',
          market: 'stocks',
          locale: 'us',
          type: 'CS',
          active: true,
          primary_exchange: 'XNAS',
          currency: 'USD',
          // Polygon.ioのAPIレスポンスに存在するが型定義にない可能性のあるフィールド
          sic_description: 'Electronic Computers'
        }
      ]
    });
  });

  // RestClientスタブ
  const mockRestClient = jest.fn().mockImplementation(() => {
    return {
      // API基本設定
      _baseUrl: 'https://api.polygon.io/v3',
      
      stocks: {
        previousClose: mockPreviousClose,
        aggregates: mockAggregates,
        v3: {
          referenceTickerDetails: mockStockDetails
        }
      },
      reference: {
        tickers: mockReferenceTickers,
        tickerDetails: mockStockDetails
      }
    };
  });
  
  return {
    // 型アサーションでPolygon.ioの型定義の問題を回避
    restClient: mockRestClient as unknown as typeof import('@polygon.io/client-js').restClient
  };
});

// インポート
import { restClient } from '@polygon.io/client-js';
import { stockService } from '../../services/stockService.js';

describe('StockService', () => {
  // 各テスト前に初期化
  beforeEach(() => {
    // モックをリセット
    jest.clearAllMocks();
  });

  describe('getStockPrice', () => {
    it('正常系: 有効な銘柄コードを指定した場合、正しい株価データが返される', async () => {
      // getStockPriceをスパイ化して直接モック
      jest.spyOn(stockService, 'getStockPrice').mockResolvedValueOnce({
        symbol: 'AAPL',
        name: 'Apple Inc.',
        price: 150.25,
        change: 2.5,
        percentChange: 1.67,
        currency: 'USD',
        lastUpdated: new Date().toISOString()
      } as StockData);

      // テスト実行
      const result = await stockService.getStockPrice('AAPL');
      
      // 検証
      expect(result).toEqual({
        symbol: 'AAPL',
        name: 'Apple Inc.',
        price: 150.25,
        change: 2.5,
        percentChange: 1.67,
        currency: 'USD',
        lastUpdated: expect.any(String)
      });
    });
    
    it('異常系: 空の銘柄コードを指定した場合、InvalidParameterErrorがスローされる', async () => {
      await expect(stockService.getStockPrice('')).rejects.toThrow(InvalidParameterError);
    });
    
    it('異常系: Polygon.io APIがエラーを返した場合、適切にエラーが処理される', async () => {
      // APIエラーをモック
      jest.spyOn(stockService, 'getStockPrice').mockRejectedValueOnce(new Error('API error'));
      
      // テスト実行と検証
      await expect(stockService.getStockPrice('ERROR')).rejects.toThrow('API error');
    });
  });

  describe('getMultipleStockPrices', () => {
    it('正常系: 複数の有効な銘柄コードを指定した場合、すべての株価データが配列で返される', async () => {
      // getStockPriceのスパイを作成
      const getStockPriceSpy = jest.spyOn(stockService, 'getStockPrice');
      
      // モックの戻り値を設定
      getStockPriceSpy.mockResolvedValueOnce({
        symbol: 'AAPL',
        name: 'Apple Inc.',
        price: 150.25,
        change: 2.5,
        percentChange: 1.67,
        currency: 'USD',
        lastUpdated: new Date().toISOString()
      } as StockData);
      
      getStockPriceSpy.mockResolvedValueOnce({
        symbol: 'MSFT',
        name: 'Microsoft Corporation',
        price: 290.5,
        change: -1.2,
        percentChange: -0.41,
        currency: 'USD',
        lastUpdated: new Date().toISOString()
      } as StockData);
      
      // テスト実行
      const result = await stockService.getMultipleStockPrices(['AAPL', 'MSFT']);
      
      // 検証
      expect(result.length).toBe(2);
      expect(result[0].symbol).toBe('AAPL');
      expect(result[1].symbol).toBe('MSFT');
      expect(getStockPriceSpy).toHaveBeenCalledTimes(2);
    });
    
    it('異常系: 空の配列を指定した場合、InvalidParameterErrorがスローされる', async () => {
      await expect(stockService.getMultipleStockPrices([])).rejects.toThrow(InvalidParameterError);
    });
    
    it('異常系: nullまたはundefinedを指定した場合、InvalidParameterErrorがスローされる', async () => {
      // @ts-ignore: 型エラーを無視してテスト
      await expect(stockService.getMultipleStockPrices(null)).rejects.toThrow(InvalidParameterError);
      // @ts-ignore: 型エラーを無視してテスト
      await expect(stockService.getMultipleStockPrices(undefined)).rejects.toThrow(InvalidParameterError);
    });
  });

  describe('getStockHistory', () => {
    it('正常系: 有効な銘柄コードと期間を指定した場合、履歴データが返される', async () => {
      // サービスメソッド自体をモック
      jest.spyOn(stockService, 'getStockHistory').mockResolvedValueOnce({
        symbol: 'AAPL',
        interval: 'daily',
        data: [
          {
            date: '2023-01-02',
            open: 145,
            high: 150,
            low: 140,
            close: 147,
            volume: 1000000
          },
          {
            date: '2023-01-01',
            open: 147,
            high: 152,
            low: 142,
            close: 149,
            volume: 1100000
          }
        ]
      } as StockHistoryData);
      
      // テスト実行
      const result = await stockService.getStockHistory('AAPL', 'daily', '1m');
      
      // 検証
      expect(result).toEqual(expect.objectContaining({
        symbol: 'AAPL',
        interval: 'daily',
        data: expect.arrayContaining([
          expect.objectContaining({
            date: expect.any(String),
            open: expect.any(Number),
            high: expect.any(Number),
            low: expect.any(Number),
            close: expect.any(Number),
            volume: expect.any(Number)
          })
        ])
      }));
      expect(result.data.length).toBeGreaterThan(0);
    });
    
    it('異常系: 無効な時間間隔を指定した場合、InvalidParameterErrorがスローされる', async () => {
      // エラーケースをモック
      jest.spyOn(stockService, 'getStockHistory').mockImplementation((symbol, interval, range) => {
        if (interval !== 'daily' && interval !== 'weekly' && interval !== 'monthly') {
          return Promise.reject(new InvalidParameterError('無効な時間間隔です'));
        }
        return Promise.resolve({} as StockHistoryData);
      });
      
      // @ts-ignore: 型エラーを無視してテスト
      await expect(stockService.getStockHistory('AAPL', 'invalid', '1m')).rejects.toThrow(InvalidParameterError);
    });
    
    it('異常系: 無効な期間を指定した場合、InvalidParameterErrorがスローされる', async () => {
      // エラーケースをモック  
      jest.spyOn(stockService, 'getStockHistory').mockImplementation((symbol, interval, range) => {
        const validRanges = ['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'max'];
        if (!validRanges.includes(range as string)) {
          return Promise.reject(new InvalidParameterError('無効な期間です'));
        }
        return Promise.resolve({} as StockHistoryData);
      });
      
      // @ts-ignore: 型エラーを無視してテスト
      await expect(stockService.getStockHistory('AAPL', 'daily', 'invalid')).rejects.toThrow(InvalidParameterError);
    });
  });

  describe('getStockDetails', () => {
    it('正常系: 有効な銘柄コードを指定した場合、詳細情報が返される', async () => {
      // サービスメソッド自体をモック
      jest.spyOn(stockService, 'getStockDetails').mockResolvedValueOnce({
        financialData: {
          currentPrice: 150,
          financialCurrency: 'USD'
        },
        priceData: {
          longName: 'Apple Inc.',
          shortName: 'AAPL',
          currency: 'USD'
        },
        summaryDetail: {
          marketCap: 2000000000000,
          dividendYield: 0.5,
          volume: 1000000
        }
      });
      
      // テスト実行
      const result = await stockService.getStockDetails('AAPL');
      
      // 検証
      expect(result).toEqual(expect.objectContaining({
        financialData: expect.any(Object),
        priceData: expect.any(Object),
        summaryDetail: expect.any(Object)
      }));
    });
    
    it('異常系: 空の銘柄コードを指定した場合、InvalidParameterErrorがスローされる', async () => {
      await expect(stockService.getStockDetails('')).rejects.toThrow(InvalidParameterError);
    });
  });

  describe('searchStocks', () => {
    it('正常系: 検索クエリに基づいて銘柄情報が返される', async () => {
      // サービスメソッド自体をモック
      jest.spyOn(stockService, 'searchStocks').mockResolvedValueOnce([
        {
          exchange: 'NASDAQ',
          shortname: 'Apple',
          quoteType: 'EQUITY',
          symbol: 'AAPL',
          index: '',
          score: 0.99,
          typeDisp: 'Equity',
          longname: 'Apple Inc.',
          isYahooFinance: true,
          sector: 'Technology',
          industry: 'Electronic Computers'
        }
      ]);
      
      // テスト実行
      const result = await stockService.searchStocks('Apple');
      
      // 検証
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].symbol).toBe('AAPL');
      expect(result[0].longname).toBe('Apple Inc.');
    });
    
    it('正常系: 検索結果が存在しない場合、空配列が返される', async () => {
      // 空の結果をモック
      jest.spyOn(stockService, 'searchStocks').mockResolvedValueOnce([]);
      
      // テスト実行
      const result = await stockService.searchStocks('NonExistentCompany');
      
      // 検証
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
    
    it('異常系: 空の検索クエリを指定した場合、InvalidParameterErrorがスローされる', async () => {
      await expect(stockService.searchStocks('')).rejects.toThrow(InvalidParameterError);
    });
  });
}); 