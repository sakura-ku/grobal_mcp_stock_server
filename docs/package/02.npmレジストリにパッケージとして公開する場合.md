# npmレジストリにパッケージとして公開する場合

このドキュメントでは、Global MCP Stock Serverをnpmレジストリに公開して、`cwd`パラメータなしで簡単に利用できるようにする方法について説明します。

## 目次

1. [パッケージ公開の利点](#パッケージ公開の利点)
2. [パッケージの構造を整える](#パッケージの構造を整える)
3. [package.jsonへのbin設定追加](#package.jsonへのbin設定追加)
4. [npmレジストリへの公開](#npmレジストリへの公開)
5. [Cursorでの使用方法](#Cursorでの使用方法)
6. [バージョン管理と更新](#バージョン管理と更新)

## パッケージ公開の利点

MCPサーバーをnpmパッケージとして公開することには、以下のような利点があります：

1. **簡単なインストールと実行**: ユーザーは`npx`コマンド一つで実行できる
2. **依存関係の自動管理**: 必要な依存関係をすべてパッケージに含められる
3. **設定の簡略化**: `cwd`パラメータが不要になる
4. **配布の容易さ**: npmレジストリを通じて簡単に配布できる
5. **バージョン管理**: 更新が簡単になりユーザーは最新版を容易に入手できる

## パッケージの構造を整える

npmパッケージとして公開するには、プロジェクトの構造を整える必要があります。以下の作業が必要です：

### 1. エントリーポイントの整理

自己完結型の実行可能スクリプトを作成します。

```typescript
#!/usr/bin/env node
// src/bin.ts

import { startServer } from './index.js';

// デフォルト設定でサーバーを起動
startServer().catch(error => {
  console.error('Server failed to start:', error);
  process.exit(1);
});
```

そして、メインのindex.tsファイルを関数として実行できるよう修正します：

```typescript
// src/index.ts

import { createMcpServer } from '@modelcontextprotocol/sdk';
import { getStockPrice, getStockPriceDefinition } from './tools/getStockPrice.js';

// サーバー起動関数をエクスポート
export async function startServer(options = {}) {
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  const HOST = process.env.HOST || 'localhost';
  
  // MCPサーバーインスタンスの作成
  const server = createMcpServer({
    // サーバーの説明情報
    info: {
      title: 'Global Stock MCP Server',
      description: '株式市場データと分析のためのMCPサーバー',
      version: '1.0.0',
    },
    ...options,
  });
  
  // ツールを登録
  server.registerTool(getStockPriceDefinition.name, getStockPrice, getStockPriceDefinition);
  
  // サーバー起動
  return new Promise((resolve, reject) => {
    server.listen(PORT, HOST, () => {
      console.log(`MCP Server is running at http://${HOST}:${PORT}`);
      console.log('Press Ctrl+C to stop the server');
      resolve(server);
    }).on('error', reject);
  });
}

// コマンドラインから直接実行された場合
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch(error => {
    console.error('Server failed to start:', error);
    process.exit(1);
  });
}
```

### 2. ファイル構造の整理

パッケージとして公開する場合の推奨ファイル構造：

```
grobal_mcp_stock_server/
├── dist/               # ビルド後のJavaScriptファイル
│   ├── bin.js          # 実行可能エントリーポイント
│   ├── index.js        # メインライブラリコード
│   └── ...
├── src/                # ソースコード
│   ├── bin.ts          # 実行可能エントリーポイント
│   ├── index.ts        # メインライブラリコード
│   └── ...
├── package.json        # パッケージ設定
├── README.md           # ドキュメント
└── ...
```

### 3. 依存関係の最適化

パッケージの依存関係を`dependencies`と`devDependencies`に適切に分類します：

- `dependencies`: 実行時に必要なパッケージ（@modelcontextprotocol/sdk, zod など）
- `devDependencies`: 開発時のみ必要なパッケージ（typescript, eslint など）

## package.jsonへのbin設定追加

`bin`設定は、パッケージをコマンドラインツールとして使用可能にするための重要な設定です。

### なぜbin設定が必要か

1. **コマンドとしての実行**: `bin`設定により、パッケージを直接コマンドとして実行できる
2. **シンボリックリンクの作成**: インストール時に実行ファイルへのシンボリックリンクが作成される
3. **npmxでの一時実行**: `npx`コマンドでインストールなしに実行できるようになる

### bin設定の追加方法

package.jsonファイルに以下のような`bin`設定を追加します：

```json
{
  "name": "grobal-mcp-stock-server",
  "version": "1.0.0",
  "description": "Model Context Protocol (MCP) server for stock market data",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "grobal-mcp-stock-server": "dist/bin.js"
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "build": "tsc",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.8.0",
    "zod": "^3.24.2",
    "uuid": "^11.1.0"
  },
  "devDependencies": {
    // 開発時のみ必要な依存関係
  }
}
```

- `"bin"`: コマンド名と実行ファイルのマッピングを定義
- `"files"`: npmパッケージに含めるファイルを指定
- `"prepublishOnly"`: 公開前に自動的にビルドを実行

## npmレジストリへの公開

npmレジストリにパッケージを公開する手順は以下の通りです：

### なぜnpmに公開するのか

1. **配布の簡易化**: `npm install`や`npx`コマンドで簡単にインストール・実行できる
2. **バージョン管理**: セマンティックバージョニングで更新の互換性を明示できる
3. **依存関係管理**: 必要なパッケージが自動的にインストールされる
4. **可視性**: npmで検索可能になり、他のユーザーが見つけやすくなる

### 公開手順

1. **npmアカウントの作成**: まだ持っていない場合は作成

2. **npmログイン**:
   ```bash
   npm login
   ```

3. **パッケージ名の確認**:
   ```bash
   npm view grobal-mcp-stock-server
   ```
   エラーが返ってくれば、その名前は使用可能

4. **パッケージの公開**:
   ```bash
   npm publish
   ```
   初回公開時は `--access=public` フラグを追加することもあります

5. **スコープ付きパッケージとして公開** (オプション):
   組織やユーザー名でスコープを付ける場合:
   ```bash
   npm publish --access=public
   ```
   パッケージ名は `@username/grobal-mcp-stock-server` のような形式になります

## Cursorでの使用方法

パッケージを公開後、Cursor IDEで簡単に使用できるようになります：

```json
{
  "mcpServers": {
    "global-stock-server": {
      "command": "npx",
      "args": ["-y", "grobal-mcp-stock-server"],
      "env": {
        "PORT": "3000",
        "STOCK_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

`cwd`パラメータが不要になり、設定が大幅に簡略化されます。

## 環境変数について

### PORT環境変数

設定ファイルの例では`PORT`環境変数を指定していますが、この変数は以下の特徴があります：

1. **任意の設定値**: 必須ではなく、指定しない場合はデフォルト値の`3000`が使用されます
2. **クライアント側での指定**: ユーザーの環境に応じて、利用可能なポート番号をクライアント側で指定することを想定しています
3. **柔軟な対応**: 複数のMCPサーバーを起動する場合や、ポート競合を避けるために異なるポート番号を指定できます

この設計により、以下のような利点があります：
- ユーザーが任意のポートを選択可能
- 同一マシン上で複数のMCPサーバーを別々のポートで実行可能
- ポート競合が発生した場合に簡単に別のポートへ変更可能
- 開発環境、テスト環境、本番環境など、状況に応じた設定が可能

なお、現在のプロジェクトでは利用可能なポートを自動検出する機能は実装されていませんが、必要に応じて`get-port`や`portfinder`などのnpmパッケージを使用して自動検出機能を追加することも可能です。

### その他の環境変数

`STOCK_API_KEY`など、その他の環境変数についても同様の柔軟性があります。これらの環境変数を適切に設定することで、サーバーの動作をカスタマイズできます。

## バージョン管理と更新

パッケージの更新と新バージョンの公開手順：

1. **変更の実装**: 機能追加やバグ修正を行う

2. **テスト**: 変更が正常に動作することを確認

3. **バージョン更新**:
   ```bash
   npm version patch  # バグ修正の場合
   npm version minor  # 後方互換性のある機能追加
   npm version major  # 破壊的変更
   ```

4. **再公開**:
   ```bash
   npm publish
   ```

5. **タグとリリース**: GitHubでタグを付けてリリースノートを作成

## まとめ

npmパッケージとして公開することで、MCPサーバーの配布と使用が大幅に簡略化されます。特にCursorなどのツールとの連携が容易になり、ユーザーエクスペリエンスが向上します。公開に必要な主な作業は：

1. パッケージ構造の整理（bin.tsの追加と依存関係の最適化）
2. package.jsonへのbin設定追加
3. npmレジストリへの公開手続き

これらのステップを実行することで、`npx grobal-mcp-stock-server`のような簡単なコマンドで実行できるMCPサーバーパッケージが完成します。