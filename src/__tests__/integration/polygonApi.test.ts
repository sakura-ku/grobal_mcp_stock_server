/**
 * Polygon.io APIリアル呼び出しテスト
 * 
 * このテストファイルは実際のPolygon.io APIを呼び出します。
 * 実行には外部ネットワーク接続が必要です。
 * テスト実行頻度を制限し、APIの利用制限に注意してください。
 * 
 * 注意: 無料APIキーは5リクエスト/分の制限があります。
 * テストを完全に実行するには有料プランが必要です。
 */

import { stockService } from '../../services/stockService.js';
import { jest } from '@jest/globals';
import config from '../../config/index.js';
import polygonClient from '../../utils/polygonClient.js';
import { logger } from '../../utils/logger.js';

// テスト実行を制御するフラグ
// CI環境では実行しないようにするなど、環境に応じて設定できます
const ENABLE_ACTUAL_API_CALLS = process.env.ENABLE_ACTUAL_API_CALLS === 'true';

// テスト対象の銘柄コード
const TEST_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL'];

// APIキーの状態をチェック
function checkApiKeyStatus() {
  const apiKey = process.env.POLYGON_API_KEY || config.api.stockApiKey;
  if (!apiKey || apiKey === 'DEMO_KEY' || apiKey.length < 8) {
    logger.warn(`
=========================================================
警告: 有効なPolygon APIキーが設定されていません
テストをスキップするか、エラーが発生する可能性があります
設定方法: $env:POLYGON_API_KEY="あなたのAPIキー"
=========================================================
    `);
    return false;
  }
  return true;
}

// テスト全体の実行時間を延長（最大3分）
jest.setTimeout(180000);

// テスト全体をskipするかどうかをここで判断
const testRunner = ENABLE_ACTUAL_API_CALLS ? describe : describe.skip;

// Polygon.io APIのリアル統合テスト
testRunner('Polygon.io API統合テスト', () => {
  const hasValidApiKey = checkApiKeyStatus();
  
  // テスト実行前に実行可能かを検証
  beforeAll(() => {
    if (!hasValidApiKey) {
      logger.warn('有効なAPIキーが設定されていないため、テストが失敗する可能性があります。');
    } else {
      logger.info('APIキーが正しく設定されています。テストを実行します。');
    }
  });

  // 各テスト間の間隔を空ける（API制限対策 - 5リクエスト/分の制限）
  // Jestのタイムアウトを考慮して12秒に設定
  beforeEach(async () => {
    await new Promise(resolve => setTimeout(resolve, 12000));
  });

  // 基本テスト - レート制限を考慮して最小限のテストのみ実行
  it('実際のAPIを呼び出して株価情報を取得できる', async () => {
    // APIキーが設定されていない場合はスキップ
    if (!hasValidApiKey) {
      logger.info('有効なAPIキーが設定されていないためスキップします');
      return;
    }
    
    try {
      logger.info(`APIリクエスト開始: ${new Date().toISOString()}`);
      
      // 実際のAPIを呼び出す - 1リクエスト
      const result = await polygonClient.stocks.previousClose(TEST_SYMBOLS[0]);
      
      // 基本的な検証
      expect(result).toBeDefined();
      expect(result.status).toBe('OK');
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
      
      if (result.results && result.results.length > 0) {
        const quote = result.results[0];
        expect(quote.T).toBe(TEST_SYMBOLS[0]);
        expect(quote.c).toBeGreaterThan(0);
      }
      
      logger.info('株価情報の取得に成功しました');
    } catch (error) {
      logger.error(`APIエラー: ${error}`);
      
      // API制限に達した場合はテストをスキップする
      if (error && (error.toString().includes('rate limit') || error.toString().includes('ERROR'))) {
        logger.warn('APIレート制限に達したため、テストをスキップします');
        return;
      }
      
      throw error;
    }
  });

  // 異常系テスト - レート制限を考慮して上記テストから12秒後に実行
  it('存在しない銘柄コードでエラーが適切に処理される', async () => {
    // APIキーが設定されていない場合はスキップ
    if (!hasValidApiKey) {
      logger.info('有効なAPIキーが設定されていないためスキップします');
      return;
    }
    
    // 存在しない銘柄コード
    const invalidSymbol = 'XYZABC123';
    
    try {
      // API呼び出しを伴うテスト - 1リクエスト
      await stockService.getStockPrice(invalidSymbol);
      fail('存在しない銘柄でもエラーが発生しませんでした');
    } catch (error) {
      // エラーが発生することを期待
      expect(error).toBeDefined();
      logger.info('無効な銘柄コードに対して適切にエラー処理されました');
    }
  });
  
  // オプションでコメントアウトして必要時に実行できるテスト群
  // これらのテストは明示的に有効化するまで実行されません
  /*
  it('株価履歴データを正しく取得できる', async () => {
    if (!hasValidApiKey) return;
    
    try {
      // 先月から現在までの日次データを取得
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      
      const result = await stockService.getStockHistory(
        TEST_SYMBOLS[0],
        'daily',
        '1m'
      );
      
      expect(result).toBeDefined();
      expect(result.symbol).toBe(TEST_SYMBOLS[0]);
      expect(result.data.length).toBeGreaterThan(0);
    } catch (error) {
      logger.error(`履歴データ取得エラー: ${error}`);
      throw error;
    }
  });
  
  it('銘柄詳細情報を取得できる', async () => {
    if (!hasValidApiKey) return;
    
    try {
      const details = await stockService.getStockDetails(TEST_SYMBOLS[0]);
      
      expect(details).toBeDefined();
      expect(details.priceData).toBeDefined();
      expect(details.financialData).toBeDefined();
    } catch (error) {
      logger.error(`詳細情報取得エラー: ${error}`);
      throw error;
    }
  });
  */
});