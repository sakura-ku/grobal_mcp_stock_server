/**
 * Polygon.io APIクライアント初期化ユーティリティ
 * 
 * このファイルは、アプリケーション全体で一貫したPolygon.ioクライアントの
 * 初期化ロジックを提供します。サービスとテストコードの両方で使用できます。
 */

import { restClient } from '@polygon.io/client-js';
import config from '../config/index.js';
import { logger } from './logger.js';

// デモ用APIキー定数
const DEMO_API_KEY = 'DEMO_KEY';

/**
 * Polygon.ioクライアントのインスタンスを作成します
 * @param apiKey 使用するAPIキー（省略時は環境変数かconfigから取得）
 * @returns 初期化されたPolygon.ioクライアントインスタンス
 */
export const createPolygonClient = (apiKey?: string) => {
  // APIキーを環境変数から直接取得して確実に使用
  const key = apiKey || process.env.POLYGON_API_KEY || config.api.stockApiKey || '';
  
  // APIキーの長さだけをログに出力（セキュリティ対策）
  logger.info(`Polygon API Key Length: ${key.length}`);
  // APIキーの実際の値は表示しない
  // logger.info(`Polygon API Key First 4 chars: ${key.substring(0, 4)}***`);
  logger.info(`Polygon APIキーが適切にマスクされています`);
  
  // APIキーの状態をチェック（空または短すぎる場合は警告）
  if (!key || key === 'demo-api-key' || key.length < 8) {
    logger.warn('有効なPolygon APIキーが設定されていません。実際のデータ取得には有効なAPIキーが必要です。');
    logger.warn('設定方法（PowerShell）: .env ファイルまたはシステム環境変数に POLYGON_API_KEY を安全に設定してください');
    logger.warn('例: [Environment]::SetEnvironmentVariable("POLYGON_API_KEY", "APIキー", "User")');
    logger.warn('注意: APIキーを直接コマンドラインや共有リポジトリに記述しないでください');
    // 開発用のデモキーを設定（制限あり）
    return restClient(DEMO_API_KEY);
  } else {
    logger.info('Polygon APIキーが設定されています');
  }

  try {
    // 公式ドキュメントの推奨方法で初期化
    // APIキーを明示的に指定する
    const rest = restClient(key);
    
    // クライアントが正しく初期化されたか確認
    if (!rest || !rest.stocks || !rest.reference) {
      logger.error('Polygon.ioクライアントが正しく初期化されていません');
    } else {
      logger.info('Polygon.ioクライアント初期化成功');
    }
    
    return rest;
  } catch (error) {
    logger.error('Polygon.ioクライアント初期化エラー:', error);
    throw error;
  }
};

// デフォルトのPolygon.ioクライアントインスタンス
export const polygonClient = createPolygonClient();

export default polygonClient; 