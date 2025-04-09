# TypeScript移植計画 実行チェックリスト

このドキュメントは、Python MCPサーバーからTypeScriptへの移植作業の進捗状況を管理するためのチェックリストです。

## 1. 環境設定

- [ ] プロジェクト構成の確認
- [ ] 必要な環境変数の設定
  - [ ] OPENAI_API_KEY
  - [ ] OPENAI_TIMEOUT
  - [ ] OPENAI_MAX_RETRIES
- [ ] 基本設定ファイルの更新

## 2. ライブラリのインストールと設定

### 株価データ取得

- [ ] `yahoo-finance2`のインストール
  ```
  npm install yahoo-finance2
  ```
- [ ] 型定義ファイルの確認
  ```
  npm install @types/yahoo-finance2 --save-dev
  ```

### データ処理

- [ ] `danfo.js`のインストール
  ```
  npm install danfojs-node
  ```

### 数値計算

- [ ] `numjs`のインストール
  ```
  npm install numjs
  ```

### スキーマ検証

- [ ] `zod`のインストール
  ```
  npm install zod
  ```

### OpenAI API

- [ ] `openai`のインストール
  ```
  npm install openai
  ```

## 3. 型定義の拡張

- [ ] 株価データ型定義の拡張 (`src/types/stock.ts`)
  - [ ] `StockData`
  - [ ] `StockHistory`
  - [ ] `StockQuote`
  - [ ] `StockAnalysis`
- [ ] スキーマ定義の作成 (`src/types/schemas/`)
  - [ ] BaseSchema
  - [ ] MarketSummarySchema
  - [ ] TrendAnalysisSchema
  - [ ] SimpleForecastSchema
  - [ ] AnalysisSchema
  - [ ] StockComparisonSchema
  - [ ] TechnicalAnalysisSchema

## 4. サービス層の実装

- [ ] OpenAIサービスの実装 (`src/services/openaiService.ts`)
- [ ] 株価サービスの基本実装 (`src/services/stockService.ts`)
  - [ ] 株価取得機能
  - [ ] 過去データ取得機能
  - [ ] 基本分析機能
- [ ] 高度な株価分析サービスの実装 (`src/services/stockAnalysisService.ts`)
  - [ ] トレンド分析
  - [ ] 予測機能
  - [ ] テクニカル分析
- [ ] データ分析LLMの実装 (`src/services/dataAnalyzerService.ts`)
  - [ ] OpenAI CodeInterpreterを使用した分析機能
  - [ ] 構造化出力の処理

## 5. ツール定義の拡張

- [ ] 基本的な株価ツールの定義 (`src/tools/stockTools.ts`)
  - [ ] 株価取得ツール
  - [ ] 株価履歴取得ツール
  - [ ] 市場情報取得ツール
- [ ] 分析ツールの定義 (`src/tools/analysisTools.ts`)
  - [ ] トレンド分析ツール
  - [ ] 予測ツール
  - [ ] 複数銘柄比較ツール
  - [ ] テクニカル分析ツール

## 6. ルーターの拡張

- [ ] 株価ルーターの拡張 (`src/routes/stockRoutes.ts`)
  - [ ] 新しいエンドポイントの追加
  - [ ] エラーハンドリングの強化
  - [ ] バリデーションの追加

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
| 環境設定 | | | 0% | |
| ライブラリのインストール | | | 0% | |
| 型定義の拡張 | | | 0% | |
| サービス層の実装 | | | 0% | |
| ツール定義の拡張 | | | 0% | |
| ルーターの拡張 | | | 0% | |
| テストとドキュメント | | | 0% | |
| デプロイと監視 | | | 0% | |
| **全体進捗** | | | **0%** | |