# Global MCP Stock Server

グローバル株式市場データと分析のためのModel Context Protocol (MCP) サーバー

## 概要

このプロジェクトは、株式市場データにアクセスするためのMCPサーバーを提供します。AI アシスタントが株価、チャートデータ、企業情報などにリアルタイムでアクセスできるようにします。

## MCP（Model Context Protocol）とは

Model Context Protocol（MCP）は、アプリケーションが大規模言語モデル（LLM）にコンテキストを提供するための標準化された方法です。詳細は [Model Context Protocol ウェブサイト](https://modelcontextprotocol.github.io/) をご覧ください。

## 機能

- リアルタイム株価情報の取得
- 株価の履歴データとチャート
- 主要な株式指標のサポート
- 企業情報と財務データ
- TypeScriptによる実装と厳格な型チェック

## 前提条件

- Node.js 18 以上
- npm または yarn

## プロジェクト構成

```
grobal_mcp_stock_server/
├── build/                # コンパイルされたJavaScriptファイル
├── src/
│   ├── __tests__/        # 統合テストとテストユーティリティ
│   ├── config/           # 設定ファイル
│   ├── data/             # データモデルとストレージ
│   ├── errors/           # カスタムエラークラス
│   ├── services/         # 外部APIとの連携サービス
│   ├── tools/            # MCPツール実装
│   │   └── __tests__/    # ツールユニットテスト
│   ├── types/            # TypeScript型定義
│   └── index.ts          # メインサーバーエントリーポイント
├── package.json          # プロジェクト設定
├── tsconfig.json         # TypeScript設定
└── README.md             # プロジェクトドキュメント
```

## 始め方

1. リポジトリをクローンする:

   ```bash
   git clone https://github.com/sakura-ku/grobal_mcp_stock_server.git
   cd grobal_mcp_stock_server
   ```

2. 依存関係をインストールする:

   ```bash
   npm install
   ```

3. サーバーをビルドして実行する:

   ```bash
   npm run build
   npm start
   ```

## 開発

- TypeScriptコンパイラをウォッチモードで起動: `npm run dev`
- コードの静的解析: `npm run lint`
- 静的解析の問題を自動修正: `npm run lint:fix`
- テストの実行: `npm test`

## 利用可能なツール

### 株価情報の取得 (get_stock_price)

指定された銘柄の現在の株価と関連情報を取得します。

**パラメータ:**
- `symbol` (string): 株式の銘柄コード（例: AAPL, MSFT, GOOGL）

**戻り値:**
- 株価情報（価格、変動、通貨など）

## ライセンス

ISC

## 貢献

このプロジェクトへの貢献に興味がある場合は、プルリクエストを送信してください。