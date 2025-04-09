# TypeScript移植計画 実行チェックリスト

このドキュメントは、Python MCPサーバーからTypeScriptへの移植作業の進捗状況を管理するためのチェックリストです。

## 1. 環境設定

- [x] プロジェクト構成の確認
- [x] 必要な環境変数の設定
  - [x] OPENAI_API_KEY（システム環境変数として設定）
  - [x] OPENAI_TIMEOUT
  - [x] OPENAI_MAX_RETRIES
  - [x] NPM_TOKEN（システム環境変数として設定）
- [x] 基本設定ファイルの更新
- [x] システム環境変数参照の設定
  - [x] .npmrcでの$env:NPM_TOKEN参照設定
  - [x] .envからの機密情報削除

## 2. ライブラリのインストールと設定

### 株価データ取得

- [x] `yahoo-finance2`のインストール
  ```
  npm install yahoo-finance2
  ```
- [x] 型定義ファイルの確認
  ```
  npm install @types/yahoo-finance2 --save-dev
  ```
  *注: yahoo-finance2は独自の型定義を含んでいるため、追加のインストールは不要でした*

### データ処理

- [x] `danfo.js`のインストール
  ```
  npm install danfojs
  ```

### 数値計算

- [x] `numjs`のインストール
  ```
  npm install numjs
  ```

### スキーマ検証

- [x] `zod`のインストール
  ```
  npm install zod
  ```
  *注: すでにプロジェクトの依存関係に含まれていました*

### OpenAI API

- [x] `openai`のインストール
  ```
  npm install openai
  ```

## 3. 型定義の拡張

- [x] 株価データ型定義の拡張 (`src/types/stock.ts`)
  - [x] `StockData`
  - [x] `StockHistory`
  - [x] `StockQuote`
  - [x] `StockAnalysis`
- [x] スキーマ定義の作成 (`src/types/schemas/`)
  - [x] BaseSchema
  - [x] MarketSummarySchema
  - [x] TrendAnalysisSchema
  - [x] SimpleForecastSchema
  - [x] AnalysisSchema
  - [x] StockComparisonSchema
  - [x] TechnicalAnalysisSchema

## 4. サービス層の実装

- [x] OpenAIサービスの実装 (`src/services/openaiService.ts`)
- [x] 株価サービスの基本実装 (`src/services/stockService.ts`)
  - [x] 株価取得機能
  - [x] 過去データ取得機能
  - [x] 基本分析機能
- [ ] 高度な株価分析サービスの実装 (`src/services/stockAnalysisService.ts`)
  - [ ] トレンド分析
  - [ ] 予測機能
  - [ ] テクニカル分析
- [x] データ分析LLMの実装 (`src/services/dataAnalyzerService.ts`)
  - [x] OpenAI CodeInterpreterを使用した分析機能
  - [x] 構造化出力の処理

## 5. ツール定義の拡張

- [x] 基本的な株価ツールの定義 (`src/tools/stockTools.ts`)
  - [x] 株価取得ツール
  - [x] 株価履歴取得ツール
  - [x] 市場情報取得ツール
- [x] 分析ツールの定義
  - [x] トレンド分析ツール
  - [x] 株価詳細情報取得ツール
  - [x] 株式検索ツール
  - [x] ポートフォリオ分析ツール
- [x] MCPサーバーへのツール登録
  - [x] 全ツールをindex.tsに登録

## 5.5 MCPサーバーとアプリケーションの統合

- [x] メインアプリケーションサーバーの実装 (`src/index.ts`)
  - [x] MCPサーバーの初期化と設定
  - [x] 株価ツールの登録
  - [x] Expressルーターの統合
  - [x] 簡易フロントエンドインターフェースの実装
  - [x] グレースフルシャットダウンの実装
- [x] CLIの実装 (`src/bin.ts`)
  - [x] コマンドライン引数の処理
  - [x] エラーハンドリング

## 6. ルーターの拡張

- [x] 株価ルーターの拡張 (`src/routes/stockRoutes.ts`)
  - [x] 新しいエンドポイントの追加
    - [x] GET /api/stocks/history/:symbol - 株価履歴データ取得
    - [x] GET /api/stocks/details/:symbol - 株価詳細情報取得
    - [x] GET /api/stocks/search - 株式検索
    - [x] GET /api/stocks/trend/:symbol - 株価トレンド分析
    - [x] POST /api/stocks/portfolio - ポートフォリオ分析
  - [x] エラーハンドリングの強化
    - [x] 全エンドポイントでの例外処理の追加
    - [x] InvalidParameterErrorの適切な処理
  - [x] バリデーションの追加
    - [x] リクエストパラメータの検証
    - [x] クエリパラメータの検証

## 7. テストとドキュメント

- [ ] ユニットテストの作成
  - [ ] サービス層のテスト
  - [ ] ツール層のテスト
  - [ ] ルーター層のテスト
- [ ] 統合テストの作成
- [ ] APIドキュメントの更新
- [ ] README.mdの更新

## 8. デプロイと監視

- [ ] パッケージングの設定
- [ ] CI/CDパイプラインの設定
- [ ] ロギングの強化
- [ ] モニタリングの設定

## 進捗状況

| フェーズ | 開始日 | 完了日 | 進捗率 | 備考 |
|---------|-------|-------|--------|------|
| 環境設定 | 2024-04-09 | 2024-04-09 | 100% | 環境変数とconfig設定完了 |
| ライブラリのインストール | 2024-04-14 | 2024-04-14 | 100% | 必要なライブラリをインストール完了 |
| 型定義の拡張 | 2024-04-14 | 2024-04-14 | 100% | 基本型定義とスキーマ定義完了 |
| サービス層の実装 | 2024-04-14 | 2024-04-21 | 75% | 基本的な株価サービス、OpenAIサービス、データ分析LLM実装済み |
| ツール定義の拡張 | 2024-04-21 | 2024-04-22 | 100% | 基本ツール実装と登録完了 |
| MCPサーバーとアプリケーションの統合 | 2024-04-22 | 2024-04-22 | 100% | メインアプリケーション、ツール登録、CLI実装完了 |
| ルーターの拡張 | 2024-04-22 | 2024-04-22 | 100% | 必要なエンドポイント実装、エラーハンドリング・バリデーション追加完了 |
| テストとドキュメント | | | 0% | |
| デプロイと監視 | | | 0% | |
| **全体進捗** | 2024-04-09 | | **75%** | |