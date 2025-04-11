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

# 利用者向けガイド

## 前提条件

- Node.js 18 以上
- npm または yarn

## インストール方法

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

## 利用方法

### 1. 環境変数の設定

初めに、必要な環境変数を設定します。`.env`ファイルを作成するか、既存の`.env.example`ファイルをコピーして使用します：

```bash
# Windows PowerShellの場合
Copy-Item .env.example .env

# UNIX系システムの場合
cp .env.example .env
```

`.env`ファイルを編集して、必要なAPIキーを設定します：

```
# 基本設定
PORT=3000
HOST=localhost
NODE_ENV=development

# Polygon.io APIキー (株価データ取得用)
POLYGON_API_KEY=your_polygon_api_key_here

# その他のAPIキー...
```

### 2. サーバーの実行

開発モードでサーバーを起動するには：

```bash
npm run dev
```

本番モードでサーバーを起動するには：

```bash
npm run build
npm run start:prod
```

### 3. APIの使用方法

#### ブラウザから直接アクセス

サーバーが起動したら、ブラウザから以下のURLで株価データにアクセスできます：

```
http://localhost:3000/api/stock/price?symbol=AAPL
```

#### cURLを使用した例

コマンドラインからcURLを使用してデータを取得できます：

```bash
# 株価データの取得
curl "http://localhost:3000/api/stock/price?symbol=AAPL"

# 株価履歴データの取得（過去30日間）
curl "http://localhost:3000/api/stock/history?symbol=AAPL&days=30"
```

#### プログラムからの使用例

Node.jsアプリケーションから利用する例：

```javascript
// 株価データを取得する関数
async function getStockPrice(symbol) {
  const response = await fetch(`http://localhost:3000/api/stock/price?symbol=${symbol}`);
  const data = await response.json();
  return data;
}

// 使用例
getStockPrice('AAPL').then(data => {
  console.log(`現在の${data.symbol}の株価: ${data.price} ${data.currency}`);
});
```

### 4. AIアシスタントとの統合

Claude、GPT-4などのAIアシスタントとの統合方法については、「MCPクライアントとの連携」セクションを参照してください。

#### Claudeでの使用例

Claudeプロンプトの例：

```
株価を調べてください。
テスラ（TSLA）の現在の株価と、過去1週間の動向を教えてください。
```

#### AIアシスタントの応答例

```
テスラ（TSLA）の株価情報は以下の通りです：

現在の株価: $248.42 USD
前日比: +$5.21 (+2.14%)
取引量: 3,421,532株

過去1週間の動向:
- 7日前: $230.15
- 6日前: $232.05
- 5日前: $235.87
- 4日前: $239.14
- 3日前: $242.33
- 2日前: $243.21
- 1日前: $248.42

過去1週間で約8%の上昇トレンドを示しています。特に直近3日間で価格の上昇が加速しています。
```

## 利用可能なツール

### 株価情報の取得 (get_stock_price)

指定された銘柄の現在の株価と関連情報を取得します。

**パラメータ:**
- `symbol` (string): 株式の銘柄コード（例: AAPL, MSFT, GOOGL）

**戻り値:**
- 株価情報（価格、変動、通貨など）

## MCPクライアントとの連携

このMCPサーバーをクライアント（Claude, Claude Desktop, その他MCPサポートアプリケーション）で利用するには、mcp.jsonファイルを作成し、MCPサーバーの定義を行います。

### mcp.json定義例

以下は、このサーバーを利用するためのmcp.json定義例です。この設定をMCPクライアントに追加することで、株価情報にアクセスできるようになります：

```json
{
  "servers": [
    {
      "id": "global-stock-server",
      "url": "http://localhost:3000",
      "description": "株式市場データと分析のためのMCPサーバー",
      "tools": [
        {
          "name": "get_stock_price",
          "description": "指定された株式銘柄の現在の株価と関連情報を取得します",
          "parameters": {
            "type": "object",
            "required": ["symbol"],
            "properties": {
              "symbol": {
                "type": "string",
                "description": "株式銘柄コード（例: AAPL, MSFT, GOOGL）"
              }
            }
          }
        }
      ]
    }
  ]
}
```

### MCPクライアントでの設定方法

1. 上記のmcp.json定義を任意の場所に保存します
2. MCPクライアント（Claude Desktopなど）の設定画面を開きます
3. MCP設定セクションで「サーバー追加」または「インポート」オプションを選択します
4. 保存したmcp.jsonファイルを選択するか、内容をコピー＆ペーストします
5. 設定を保存し、クライアントを再起動します

これで、MCPクライアントのプロンプトやチャット内で株価情報ツールが利用可能になります。

### Cursor IDEでの設定方法

Cursor IDEでは、settings.jsonファイルにMCPサーバーの設定を追加することで、AIアシスタントがツールを利用できるようになります。

#### 設定手順

1. Cursorの設定を開きます：
   - Windows/Linux: `Ctrl+,`
   - macOS: `Cmd+,`

2. "Cursor Settings"を選択し、settings.jsonファイルを編集します

3. `mcpServers`セクションに以下の設定を追加します:

##### ローカルプロジェクトとして実行する場合（推奨）

このプロジェクトはローカルでの開発・実行を前提としています。npmスクリプトを使用して実行するのが最も確実な方法です：

```json
{
  "mcpServers": {
    "global-stock-server": {
      "command": "npm",
      "args": ["run", "start"],
      "cwd": "/path/to/grobal_mcp_stock_server",
      "env": {
        "PORT": "3000",
        "HOST": "localhost",
        "NODE_ENV": "production",
        "STOCK_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

開発モードで実行する場合:

```json
{
  "mcpServers": {
    "global-stock-server": {
      "command": "npm",
      "args": ["run", "dev"],
      "cwd": "/path/to/grobal_mcp_stock_server",
      "env": {
        "PORT": "3000",
        "HOST": "localhost",
        "NODE_ENV": "development",
        "STOCK_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

##### GitHub Packagesからインストールする方法

このMCPサーバーはGitHub Packagesを使用してプライベートnpmレジストリとして公開されています。以下の手順でインストールできます：

1. `.npmrc`ファイルを作成または編集して認証設定を行います：

```
@sakura-ku:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
```

2. 環境変数`NPM_TOKEN`にGitHubの個人アクセストークンを設定します：

```bash
# Windowsの場合
$env:NPM_TOKEN="your_github_token"

# macOS/Linuxの場合
export NPM_TOKEN="your_github_token"
```

3. パッケージをインストールします：

```bash
npm install @sakura-ku/grobal-mcp-stock-server
```

4. Cursor IDEでの設定例：

```json
{
  "mcpServers": {
    "global-stock-server": {
      "command": "npx",
      "args": ["@sakura-ku/grobal-mcp-stock-server"],
      "env": {
        "PORT": "3000",
        "HOST": "localhost",
        "STOCK_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

詳細な設定方法は[プライベートnpmレジストリの管理方法](./docs/プライベートnpmレジストリの管理方法.md)をご参照ください。

#### トラブルシューティング

- **サーバーが起動しない場合**:
  - プロジェクトディレクトリに移動して手動でコマンドを実行し、エラーを確認
  - 依存関係が正しくインストールされているか確認（`npm install`を実行）
  - TypeScriptのバージョンが合っているか確認

- **ツールが見つからない場合**:
  - サーバーが正常に起動しているか確認
  - ログ出力で登録されているツール名を確認
  - 必要なら`npm run dev`でサーバーをデバッグモードで起動

# 開発者向けガイド

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

## 開発環境のセットアップ

1. 開発依存関係をインストールする:
   ```bash
   npm install
   ```

2. 開発モードでサーバーを起動する:
   ```bash
   npm run dev
   ```

## 開発ワークフロー

- TypeScriptコンパイラをウォッチモードで起動: `npm run dev`
- コードの静的解析: `npm run lint`
- 静的解析の問題を自動修正: `npm run lint:fix`
- テストの実行: `npm test`

## 使用可能なスクリプト

package.jsonで定義されているスクリプトの詳細説明:

### ビルドスクリプト
- `build`: TypeScriptコードをコンパイルし、distディレクトリに出力します
- `build:dev`: 開発環境用にソースマップ付きでビルドします
- `build:prod`: 本番環境用にソースマップなしでビルドします
- `clean`: distディレクトリを削除して清掃します
- `prebuild`: ビルド前に自動的にcleanスクリプトを実行します

### サーバー起動スクリプト
- `start`: コンパイル済みのサーバーを起動します
- `start:dev`: 開発環境設定でサーバーを起動します
- `start:prod`: 本番環境設定でサーバーを起動します
- `dev`: ソースコードの変更を監視し、自動的にビルドと再起動を行う開発モードです

### コード品質管理スクリプト
- `lint`: ESLintを使用してTypeScriptコードの静的解析を行います
- `lint:fix`: ESLintを使用してコードの問題を自動修正します

### テストスクリプト
- `test`: Jestを使用して全てのテストを実行します
- `test:watch`: テストをウォッチモードで実行し、変更時に再実行します
- `test:coverage`: テストカバレッジレポートを生成します
- `test:ci`: CI環境用のテスト設定で実行します
- `test:unit`: ユニットテストのみを実行します
- `test:integration`: 統合テストのみを実行します
- `test:services`: サービステストのみを実行します
- `test:debug`: デバッグモードでテストを実行します

### デプロイとパッケージング
- `deploy:staging`: ステージング環境にデプロイします
- `deploy:production`: 本番環境にデプロイします
- `publish:package`: npmレジストリにパッケージを公開します
- `prepare:package`: パッケージング前に本番ビルドを実行し、tarballを作成します
- `prepublishOnly`: パッケージ公開前に本番用ビルドを実行します

## ライセンス

ISC

## 貢献

このプロジェクトへの貢献に興味がある場合は、プルリクエストを送信してください。