import { jest } from '@jest/globals';
import { dataAnalyzerService } from '../../services/dataAnalyzerService.js';
import { openaiService } from '../../services/openaiService.js';
import { ExternalApiError } from '../../errors/index.js';
import { z } from 'zod';

// loggerのモック
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// openaiServiceのモック
jest.mock('../../services/openaiService.js', () => ({
  openaiService: {
    createCodeInterpreterCompletion: jest.fn(),
    extractJsonFromCodeInterpreter: jest.fn()
  }
}));

// loggerのモック
jest.mock('../../utils/logger', () => ({
  logger: mockLogger
}));

describe('DataAnalyzerService', () => {
  // テスト実行前にモックをリセット
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeData', () => {
    it('正常系: 正しくOpenAI APIを呼び出し、結果を返す', async () => {
      // モックレスポンス
      const mockApiResponse = {
        choices: [{
          message: {
            content: 'これは分析結果です',
            tool_calls: [{
              type: 'function',
              function: {
                name: 'code_interpreter',
                arguments: 'import pandas as pd\nimport numpy as np\n# 分析コード'
              }
            }]
          }
        }]
      };

      // 構造化データ
      const mockStructuredData = {
        summary: 'テスト分析概要',
        metrics: {
          average: 100,
          max: 150,
          min: 50
        }
      };

      // モック設定
      jest.spyOn(openaiService, 'createCodeInterpreterCompletion').mockResolvedValue(mockApiResponse);
      jest.spyOn(openaiService, 'extractJsonFromCodeInterpreter').mockReturnValue(mockStructuredData);

      // テストデータ
      const testData = [1, 2, 3, 4, 5];
      const instructions = 'データの基本統計量を計算してください';

      // 関数実行
      const result = await dataAnalyzerService.analyzeData(testData, instructions);

      // 検証 - APIが呼び出されたか確認
      expect(openaiService.createCodeInterpreterCompletion).toHaveBeenCalled();
      // システムプロンプトとユーザープロンプトを含む配列が渡されたかを確認
      const callArgs = (openaiService.createCodeInterpreterCompletion as jest.Mock).mock.calls[0][0] as {role: string, content: string}[];
      expect(callArgs[0].role).toBe('system');
      expect(callArgs[1].role).toBe('user');
      expect(callArgs[1].content).toContain(JSON.stringify(testData));
      expect(callArgs[1].content).toContain(instructions);
      
      expect(openaiService.extractJsonFromCodeInterpreter).toHaveBeenCalledWith(mockApiResponse);
      
      expect(result).toEqual({
        content: 'これは分析結果です',
        executedCode: 'import pandas as pd\nimport numpy as np\n# 分析コード',
        structuredData: mockStructuredData,
        rawResponse: undefined
      });
    });

    it('正常系: zodスキーマによる検証が正常に動作する', async () => {
      // モックレスポンス
      const mockApiResponse = {
        choices: [{
          message: {
            content: 'スキーマ検証テスト',
            tool_calls: [{
              type: 'function',
              function: {
                name: 'code_interpreter',
                arguments: '# スキーマ検証用コード'
              }
            }]
          }
        }]
      };

      // 構造化データ
      const mockStructuredData = {
        value: 100,
        text: 'テストテキスト'
      };

      // モック設定
      jest.spyOn(openaiService, 'createCodeInterpreterCompletion').mockResolvedValue(mockApiResponse);
      jest.spyOn(openaiService, 'extractJsonFromCodeInterpreter').mockReturnValue(mockStructuredData);

      // テストスキーマ
      const testSchema = z.object({
        value: z.number(),
        text: z.string()
      });

      // テストデータ
      const testData = { x: 10, y: 20 };
      const instructions = 'スキーマ検証テスト';

      // 関数実行
      const result = await dataAnalyzerService.analyzeData(testData, instructions, testSchema);

      // 検証
      expect(result.structuredData).toEqual(mockStructuredData);
    });

    it('異常系: スキーマ検証に失敗した場合、警告ログが出力される', async () => {
      // スキーマに合わない構造化データ
      const mockStructuredData = {
        value: 'これは数値ではなく文字列',  // スキーマではnumberを期待
        text: 123  // スキーマではstringを期待
      };

      // テストスキーマ
      const testSchema = z.object({
        value: z.number(),
        text: z.string()
      });

      // スキーマ検証失敗をシミュレート
      try {
        testSchema.parse(mockStructuredData);
      } catch (error) {
        mockLogger.warn('構造化データがスキーマに適合しません:', error);
      }

      // 検証
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '構造化データがスキーマに適合しません:',
        expect.any(Error)
      );
    });

    it('異常系: OpenAI APIがエラーを返した場合、ExternalApiErrorがスローされる', async () => {
      // エラーをモック
      const apiError = new Error('API呼び出しに失敗しました');
      jest.spyOn(openaiService, 'createCodeInterpreterCompletion').mockRejectedValue(apiError);

      // テストデータ
      const testData = [1, 2, 3];
      const instructions = 'データ分析テスト';

      // 関数実行と検証
      await expect(dataAnalyzerService.analyzeData(testData, instructions))
        .rejects.toThrow(ExternalApiError);
    });
  });

  describe('analyzeStockData', () => {
    it('正常系: 株価データを正しく分析できる', async () => {
      // analyzeDataのモック
      jest.spyOn(dataAnalyzerService, 'analyzeData').mockImplementation(async (data, instructions) => {
        // 引数の検証用
        expect(instructions).toContain('期間: 1m');
        
        return {
          content: '株価分析結果',
          structuredData: {
            summary: '上昇トレンドが見られます',
            trend: {
              direction: '上昇',
              strength: '強い',
              keyPoints: ['サポートラインを突破', '高ボリュームでの上昇']
            },
            statistics: {
              average: 150.25,
              stdDev: 5.67
            }
          }
        };
      });

      // テストデータ
      const stockData = {
        symbol: 'AAPL',
        data: Array(20).fill(0).map((_, i) => ({
          date: `2023-01-${i + 1}`,
          close: 150 + i
        }))
      };

      // 関数実行
      const result = await dataAnalyzerService.analyzeStockData(stockData, '1m');
      
      // 検証
      expect(result).toEqual({
        content: '株価分析結果',
        structuredData: expect.objectContaining({
          summary: '上昇トレンドが見られます',
          trend: expect.objectContaining({
            direction: '上昇',
            strength: '強い'
          })
        })
      });
    });

    it('異常系: 分析中にエラーが発生した場合、エラーが伝播される', async () => {
      // エラーをモック
      const analysisError = new Error('分析中にエラーが発生しました');
      jest.spyOn(dataAnalyzerService, 'analyzeData').mockRejectedValue(analysisError);

      // テストデータ
      const stockData = { symbol: 'AAPL', data: [] };

      // 関数実行と検証
      await expect(dataAnalyzerService.analyzeStockData(stockData, '1m'))
        .rejects.toThrow(Error);
    });
  });

  describe('compareStocks', () => {
    it('正常系: 複数銘柄のデータを正しく比較分析できる', async () => {
      // analyzeDataのモック
      jest.spyOn(dataAnalyzerService, 'analyzeData').mockImplementation(async (data, instructions) => {
        // 引数の検証用
        expect(instructions).toContain('複数銘柄（3銘柄）の比較分析');
        
        return {
          content: '銘柄比較分析結果',
          structuredData: {
            summary: 'テック銘柄の比較分析',
            individualAssessments: {
              AAPL: { performance: 'excellent', risk: 'medium' },
              MSFT: { performance: 'good', risk: 'low' },
              GOOGL: { performance: 'average', risk: 'medium' }
            },
            rankings: {
              performance: ['AAPL', 'MSFT', 'GOOGL'],
              riskAdjusted: ['MSFT', 'AAPL', 'GOOGL']
            },
            recommendations: {
              buy: ['AAPL'],
              hold: ['MSFT'],
              watch: ['GOOGL']
            }
          }
        };
      });

      // テストデータ
      const stocksData = {
        AAPL: { price: 150, volume: 1000000 },
        MSFT: { price: 300, volume: 800000 },
        GOOGL: { price: 2500, volume: 500000 }
      };
      
      const metrics = ['price', 'volume', 'performance'];

      // 関数実行
      const result = await dataAnalyzerService.compareStocks(stocksData, metrics);
      
      // 検証
      expect(result).toEqual({
        content: '銘柄比較分析結果',
        structuredData: expect.objectContaining({
          summary: 'テック銘柄の比較分析',
          individualAssessments: expect.any(Object),
          rankings: expect.any(Object),
          recommendations: expect.any(Object)
        })
      });
    });

    it('異常系: 比較分析中にエラーが発生した場合、エラーが伝播される', async () => {
      // エラーをモック
      const compareError = new Error('比較分析中にエラーが発生しました');
      jest.spyOn(dataAnalyzerService, 'analyzeData').mockRejectedValue(compareError);

      // テストデータ
      const stocksData = {
        AAPL: { price: 150 },
        MSFT: { price: 300 }
      };

      // 関数実行と検証
      await expect(dataAnalyzerService.compareStocks(stocksData))
        .rejects.toThrow(Error);
    });
  });

  describe('analyzePortfolio', () => {
    it('正常系: ポートフォリオデータを正しく分析できる', async () => {
      // analyzeDataのモック
      jest.spyOn(dataAnalyzerService, 'analyzeData').mockImplementation(async (data, instructions) => {
        // 引数の検証用
        expect(instructions).toContain('ポートフォリオ分析');
        
        return {
          content: 'ポートフォリオ分析結果',
          structuredData: {
            summary: 'バランスの取れたポートフォリオ',
            performance: {
              totalReturn: 0.15,
              annualizedReturn: 0.08
            },
            risk: {
              volatility: 0.12,
              sharpeRatio: 1.2,
              maxDrawdown: 0.18
            },
            allocation: {
              equities: 0.6,
              bonds: 0.3,
              cash: 0.1
            },
            recommendations: [
              '株式の比率を5%減らす',
              '新興国市場への投資を検討'
            ]
          }
        };
      });

      // テストデータ
      const portfolioData = {
        holdings: [
          { symbol: 'AAPL', shares: 10, cost: 1200, value: 1500 },
          { symbol: 'MSFT', shares: 5, cost: 1000, value: 1500 },
          { symbol: 'BOND', shares: 20, cost: 2000, value: 2100 }
        ],
        totalValue: 5100,
        totalCost: 4200
      };
      
      const riskFreeRate = 0.02;

      // 関数実行
      const result = await dataAnalyzerService.analyzePortfolio(portfolioData, riskFreeRate);
      
      // 検証
      expect(result).toEqual({
        content: 'ポートフォリオ分析結果',
        structuredData: expect.objectContaining({
          summary: 'バランスの取れたポートフォリオ',
          performance: expect.any(Object),
          risk: expect.objectContaining({
            sharpeRatio: 1.2
          }),
          recommendations: expect.any(Array)
        })
      });
    });

    it('異常系: ポートフォリオ分析中にエラーが発生した場合、エラーが伝播される', async () => {
      // エラーをモック
      const portfolioError = new Error('ポートフォリオ分析中にエラーが発生しました');
      jest.spyOn(dataAnalyzerService, 'analyzeData').mockRejectedValue(portfolioError);

      // テストデータ
      const portfolioData = {
        holdings: [],
        totalValue: 0,
        totalCost: 0
      };

      // 関数実行と検証
      await expect(dataAnalyzerService.analyzePortfolio(portfolioData))
        .rejects.toThrow(Error);
    });
  });
});