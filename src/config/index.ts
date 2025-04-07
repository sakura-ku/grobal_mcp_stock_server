// 環境変数を .env ファイルから読み込む設定
import 'dotenv/config';

// アプリケーション設定
export const config = {
  server: {
    // サーバー設定
    port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
    host: process.env.HOST || 'localhost',
    env: process.env.NODE_ENV || 'development',
  },
  api: {
    // 外部株価API設定
    stockApiKey: process.env.STOCK_API_KEY || 'demo-api-key',
    stockApiUrl: process.env.STOCK_API_URL || 'https://api.example.com/stocks',
    timeout: process.env.API_TIMEOUT ? parseInt(process.env.API_TIMEOUT) : 5000,
  },
  logging: {
    // ログ設定
    level: process.env.LOG_LEVEL || 'info',
  },
  cache: {
    // キャッシュ設定（将来的な拡張用）
    enabled: process.env.ENABLE_CACHE === 'true',
    ttl: process.env.CACHE_TTL ? parseInt(process.env.CACHE_TTL) : 300, // 秒単位
  },
};

export default config;