// 本番環境用の設定
export const productionConfig = {
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 8080, // 本番は8080をデフォルトに
    host: '0.0.0.0', // すべてのインターフェースでリッスン
    env: 'production',
  },
  api: {
    stockApiUrl: 'https://api.polygon.io',
    timeout: 20000, // タイムアウトを短く設定
  },
  logging: {
    level: 'info', // 本番環境では必要な情報のみ
  },
  cache: {
    enabled: true, // 本番環境ではキャッシュを有効化
    ttl: 300, // 長めのTTL
  },
  openai: {
    timeout: 30000,
    maxRetries: 3,
  },
};

export default productionConfig; 