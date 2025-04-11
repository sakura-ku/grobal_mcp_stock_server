// Jest setup file
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// ESMでの__dirnameの代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .env.testファイルの読み込み
const testEnvPath = resolve(__dirname, '.env.test');
if (fs.existsSync(testEnvPath)) {
  console.log('Loading test environment variables from .env.test');
  dotenv.config({ path: testEnvPath });
} else {
  console.warn('.env.test file not found, using default environment variables');
  dotenv.config();
}

// テスト用環境変数の設定
process.env.NODE_ENV = 'test';
process.env.TEST_TIMEOUT = '10000';

// テスト実行の環境変数 - モックキーを使用
if (!process.env.POLYGON_API_KEY) {
  process.env.POLYGON_API_KEY = 'TEST_API_KEY_MOCK';
}
if (!process.env.OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = 'TEST_OPENAI_KEY_MOCK';
}

console.log('Jest setup completed: Environment variables loaded'); 