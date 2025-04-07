// 環境変数を .env ファイルから読み込む設定
import * as dotenv from 'dotenv';

// 環境変数の読み込み（実装時にdotenvをインストールして有効化）
// dotenv.config();

// サーバー設定
export const SERVER_CONFIG = {
  PORT: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  HOST: process.env.HOST || 'localhost',
  NODE_ENV: process.env.NODE_ENV || 'development',
};

// 株価API設定（実際の実装時に追加）
export const STOCK_API_CONFIG = {
  API_KEY: process.env.STOCK_API_KEY || '',
  BASE_URL: process.env.STOCK_API_BASE_URL || 'https://api.example.com',
  TIMEOUT: process.env.API_TIMEOUT ? parseInt(process.env.API_TIMEOUT) : 5000,
};

// その他の設定
export const APP_CONFIG = {
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  ENABLE_CACHE: process.env.ENABLE_CACHE === 'true',
  CACHE_TTL: process.env.CACHE_TTL ? parseInt(process.env.CACHE_TTL) : 300, // 秒単位
};