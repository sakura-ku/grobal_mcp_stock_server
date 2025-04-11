// 環境変数を .env ファイルから読み込む設定
import 'dotenv/config';
import developmentConfig from './config.development.js';
import productionConfig from './config.production.js';

// 環境の判定
const env = process.env.NODE_ENV || 'development';

// 環境に応じた基本設定を選択
const envConfig = env === 'production' 
  ? productionConfig 
  : developmentConfig;

// 表示用メッセージ（開発時の確認用）
console.log(`🛠️ 設定を読み込みました: ${env}環境`);

// アプリケーション設定
export const config = {
  server: {
    // サーバー設定（環境変数 > 環境別設定の優先順）
    port: process.env.PORT ? parseInt(process.env.PORT) : envConfig.server.port,
    host: process.env.HOST || envConfig.server.host,
    env: process.env.NODE_ENV || 'development',
  },
  api: {
    // 外部株価API設定
    stockApiKey: process.env.STOCK_API_KEY || process.env.POLYGON_API_KEY || 'demo-api-key',
    stockApiUrl: process.env.STOCK_API_URL || envConfig.api.stockApiUrl,
    timeout: process.env.API_TIMEOUT ? parseInt(process.env.API_TIMEOUT) : envConfig.api.timeout,
  },
  logging: {
    // ログ設定
    level: process.env.LOG_LEVEL || envConfig.logging.level,
  },
  cache: {
    // キャッシュ設定（将来的な拡張用）
    enabled: process.env.CACHE_ENABLED !== undefined 
      ? process.env.CACHE_ENABLED === 'true' 
      : envConfig.cache.enabled,
    ttl: process.env.CACHE_TTL ? parseInt(process.env.CACHE_TTL) : envConfig.cache.ttl,
  },
  openai: {
    // OpenAI API設定
    apiKey: process.env.OPENAI_API_KEY,
    timeout: process.env.OPENAI_TIMEOUT 
      ? parseInt(process.env.OPENAI_TIMEOUT) 
      : envConfig.openai.timeout,
    maxRetries: process.env.OPENAI_MAX_RETRIES 
      ? parseInt(process.env.OPENAI_MAX_RETRIES) 
      : envConfig.openai.maxRetries,
  },
};

export default config;
