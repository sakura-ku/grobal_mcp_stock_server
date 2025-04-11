#!/usr/bin/env node
/**
 * デプロイメントスクリプト
 * npm run deploy:staging または npm run deploy:production で実行します
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// コマンドライン引数からデプロイ環境を取得
const environment = process.argv[2] || 'staging';
const validEnvironments = ['staging', 'production'];

if (!validEnvironments.includes(environment)) {
  console.error(`エラー: 無効な環境です: ${environment}`);
  console.error(`有効な環境: ${validEnvironments.join(', ')}`);
  process.exit(1);
}

console.log(`🚀 ${environment}環境へのデプロイを開始します...`);

try {
  // 環境変数を設定
  process.env.NODE_ENV = environment === 'production' ? 'production' : 'development';
  
  // ビルド実行
  console.log('📦 ビルドを開始します...');
  execSync(`npm run build:${environment}`, { stdio: 'inherit' });
  
  // テスト実行（本番環境の場合のみ）
  if (environment === 'production') {
    console.log('🧪 テストを実行します...');
    execSync('npm run test:ci', { stdio: 'inherit' });
  }
  
  // パッケージ作成
  console.log('📦 パッケージを作成します...');
  execSync('npm run prepare:package', { stdio: 'inherit' });
  
  // デプロイ先に応じた処理
  if (environment === 'production') {
    console.log('🚢 本番環境にデプロイします...');
    // 実際のデプロイコマンドをここに記述
    // 例: execSync('scp -r dist/* user@production-server:/path/to/app', { stdio: 'inherit' });
  } else {
    console.log('🚢 ステージング環境にデプロイします...');
    // 実際のデプロイコマンドをここに記述
    // 例: execSync('scp -r dist/* user@staging-server:/path/to/app', { stdio: 'inherit' });
  }
  
  console.log(`✅ ${environment}環境へのデプロイが完了しました!`);
} catch (error) {
  console.error(`❌ デプロイ中にエラーが発生しました: ${error.message}`);
  process.exit(1);
} 