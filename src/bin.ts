#!/usr/bin/env node

/**
 * グローバル株式市場データMCPサーバーのコマンドラインエントリーポイント
 * 
 * このファイルはnpmパッケージとしてインストールされた際に
 * コマンドラインから直接実行できるようにするためのものです。
 */
import { startServer } from './index.js';

// コマンドライン引数の処理
const PORT = process.env.PORT || '3000';
const HOST = process.env.HOST || 'localhost';

// サーバーの起動
startServer(Number(PORT), HOST).catch((error: Error) => {
  console.error('サーバー起動エラー:', error);
  process.exit(1);
}); 