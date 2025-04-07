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

##### 直接コマンドを使用する代替方法

必要に応じて、package.jsonのスクリプトを経由せずに直接コマンドを実行することもできます：

```json
{
  "mcpServers": {
    "global-stock-server": {
      "command": "npx",
      "args": ["-y", "ts-node", "src/index.ts"],
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

または、すでにビルド済みのサーバーを使用する場合:

```json
{
  "mcpServers": {
    "global-stock-server": {
      "command": "node",
      "args": ["build/index.js"],
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

4. 設定を保存し、Cursorを再起動するか、コマンドパレット（`F1`）から`Reload Window`を実行します

5. サーバーの状態は、AIパネルの「MCPサーバー」タブで確認できます：
   - 緑色: サーバーが正常に起動し、利用可能
   - 赤色: サーバーの起動に問題あり（設定とパスを確認）

これで、CursorのAIアシスタントが株価情報ツールを使用できるようになります。プロンプト内で直接「株価情報を取得して」などと指示することができます。

#### トラブルシューティング

- **サーバーが起動しない場合**:
  - プロジェクトディレクトリに移動して手動でコマンドを実行し、エラーを確認
  - 依存関係が正しくインストールされているか確認（`npm install`を実行）
  - TypeScriptのバージョンが合っているか確認

- **ツールが見つからない場合**:
  - サーバーが正常に起動しているか確認
  - ログ出力で登録されているツール名を確認
  - 必要なら`npm run dev`でサーバーをデバッグモードで起動

## ライセンス

ISC

## 貢献

このプロジェクトへの貢献に興味がある場合は、プルリクエストを送信してください。