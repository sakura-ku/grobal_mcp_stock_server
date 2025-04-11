// 環境変数を .env ファイルから読み込む設定
import 'dotenv/config';
import developmentConfig from './config.development.js';
import productionConfig from './config.production.js';

// 環境によって適切な設定を選択
const env = process.env.NODE_ENV || 'development';
let envConfig;

if (env === 'production') {
  console.log('🚀 本番環境の設定を使用します');
  envConfig = productionConfig;
} else {
  console.log('🛠️ 開発環境の設定を使用します');
  envConfig = developmentConfig;
}

// 基本設定（どの環境でも上書き可能な環境変数）
const baseConfig = {
  api: {
    // APIキーは常に環境変数から取得
    stockApiKey: process.env.STOCK_API_KEY || process.env.POLYGON_API_KEY || 'demo-api-key',
    stockApiUrl: process.env.STOCK_API_URL || 'https://api.polygon.io',
  },
  openai: {
    // APIキーは常に環境変数から取得
    apiKey: process.env.OPENAI_API_KEY,
    timeout: process.env.OPENAI_TIMEOUT ? parseInt(process.env.OPENAI_TIMEOUT) : 60000,
    maxRetries: process.env.OPENAI_MAX_RETRIES ? parseInt(process.env.OPENAI_MAX_RETRIES) : 3,
  },
};

// 設定をマージ（環境変数 > 環境別設定 > デフォルト設定の優先順位）
export const config = {
  ...envConfig,
  ...baseConfig,
  // 個別に環境変数で上書き可能な項目
  server: {
    ...envConfig.server,
    port: process.env.PORT ? parseInt(process.env.PORT) : envConfig.server.port,
    host: process.env.HOST || envConfig.server.host,
  },
  logging: {
    ...envConfig.logging,
    level: process.env.LOG_LEVEL || envConfig.logging.level,
  },
  cache: {
    ...envConfig.cache,
    enabled: process.env.CACHE_ENABLED !== undefined 
      ? process.env.CACHE_ENABLED === 'true'
      : envConfig.cache.enabled,
    ttl: process.env.CACHE_TTL ? parseInt(process.env.CACHE_TTL) : envConfig.cache.ttl,
  },
};

export default config; 