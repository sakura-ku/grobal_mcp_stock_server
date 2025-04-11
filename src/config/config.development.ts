// 開発環境用の設定
export const developmentConfig = {
  server: {
    port: 3000,
    host: 'localhost',
    env: 'development',
  },
  api: {
    stockApiUrl: 'https://api.polygon.io',
    timeout: 30000,
  },
  logging: {
    level: 'debug', // 開発環境では詳細なログを出力
  },
  cache: {
    enabled: false, // 開発環境ではキャッシュを無効化
    ttl: 60, // 短いTTL
  },
  openai: {
    timeout: 60000,
    maxRetries: 2,
  },
};

export default developmentConfig; 