import { jest } from '@jest/globals';
import stockAnalysisService from '../../services/stockAnalysisService.js';
import { stockService } from '../../services/stockService.js';
import { InvalidParameterError } from '../../errors/index.js';
import type { 
  StockHistoryData
} from '../../types/stock.js';

// モック
jest.mock('../../services/stockService');
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

describe('StockAnalysisService', () => {
  // テスト実行前にモックをリセット
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeStockTrend', () => {
    it('正常系: 有効な銘柄コードを指定した場合、トレンド分析結果が返される', async () => {
      // モックデータ
      const mockHistoryData: StockHistoryData = {
        symbol: 'AAPL',
        interval: 'daily',
        data: Array(60).fill(0).map((_, i) => ({
          date: new Date(2025, 3, 10 - i).toISOString(),
          open: 150 + Math.random() * 10,
          high: 155 + Math.random() * 10,
          low: 145 + Math.random() * 10,
          close: 150 + i * 0.5, // 上昇トレンドを作成
          volume: 1000000 + Math.random() * 500000
        }))
      };

      // stockServiceのモック
      jest.spyOn(stockService, 'getStockHistory').mockResolvedValue(mockHistoryData);

      // 関数実行
      const result = await stockAnalysisService.analyzeStockTrend('AAPL');

      // 検証
      expect(stockService.getStockHistory).toHaveBeenCalledWith('AAPL', 'daily', '6m');
      expect(result).toEqual(expect.objectContaining({
        symbol: 'AAPL',
        trend: expect.stringMatching(/bullish|bearish|neutral/),
        technicalIndicators: expect.any(Object)
      }));
    });

    it('異常系: 空の銘柄コードを指定した場合、InvalidParameterErrorがスローされる', async () => {
      await expect(stockAnalysisService.analyzeStockTrend('')).rejects.toThrow(InvalidParameterError);
    });

    it('異常系: 十分なデータがない場合、InvalidParameterErrorがスローされる', async () => {
      // 少ないデータ
      const mockHistoryData: StockHistoryData = {
        symbol: 'AAPL',
        interval: 'daily',
        data: Array(5).fill(0).map((_, i) => ({
          date: new Date(2025, 3, 10 - i).toISOString(),
          open: 150,
          high: 155,
          low: 145,
          close: 150,
          volume: 1000000
        }))
      };

      jest.spyOn(stockService, 'getStockHistory').mockResolvedValue(mockHistoryData);

      await expect(stockAnalysisService.analyzeStockTrend('AAPL')).rejects.toThrow(InvalidParameterError);
    });

    it('異常系: API呼び出しでエラーが発生した場合、エラーが伝播される', async () => {
      const errorMsg = 'API error';
      jest.spyOn(stockService, 'getStockHistory').mockRejectedValue(new Error(errorMsg));

      await expect(stockAnalysisService.analyzeStockTrend('AAPL')).rejects.toThrow(Error);
    });
  });
});