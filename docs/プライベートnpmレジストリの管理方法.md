# プライベートnpmレジストリの管理方法

このドキュメントでは、Global MCP Stock Serverをプライベートnpmレジストリとして管理する方法、特にGitHub Packagesを利用したプライベートnpmレジストリの設定と利用方法について説明します。

## 目次

1. [プライベートnpmレジストリのメリット](#プライベートnpmレジストリのメリット)
2. [GitHub Packagesの概要](#github-packagesの概要)
3. [GitHub Packagesの設定手順](#github-packagesの設定手順)
4. [パッケージの公開手順](#パッケージの公開手順)
5. [パッケージの使用方法](#パッケージの使用方法)
6. [CI/CDでの自動公開設定](#cicdでの自動公開設定)

## プライベートnpmレジストリのメリット

プライベートnpmレジストリを利用する主なメリットは以下の通りです：

1. **セキュリティ強化**
   - 独自の機密コードが公開されることがない
   - 社内専用のツールやライブラリを安全に管理できる
   - アクセス制御により適切な権限管理が可能

2. **組織内での共有の容易さ**
   - チーム間で共通のコードベースを共有しやすい
   - 依存関係の一元管理が可能
   - 組織内標準を確立・維持しやすい

3. **バージョン管理と品質制御**
   - 組織内で一貫したバージョン管理が可能
   - リリース前のQA/テストプロセスを強化できる
   - 破壊的変更の影響を組織内で制御しやすい

4. **ネットワークの信頼性と速度**
   - 社内ネットワーク内でのインストールが高速
   - 外部サービスへの依存を減らせる
   - バンドル時のネットワーク接続問題を軽減

## GitHub Packagesの概要

GitHub Packagesは、GitHubが提供するパッケージ管理サービスで、以下の特徴があります：

- GitHubリポジトリと直接統合されている
- npm、Maven、NuGet、RubyGems、Docker、およびGradleなど複数のパッケージ形式をサポート
- リポジトリのIssue、Pull Request、アクションと連携できる
- GitHubのアクセス制御と認証の仕組みを利用できる
- プライベートリポジトリの場合、パッケージもプライベートになる

## GitHub Packagesの設定手順

### 1. GitHub個人アクセストークンの作成

1. GitHubにログインし、右上のプロフィールアイコンをクリックして「Settings」を選択
2. 左側のサイドバーで「Developer settings」→「Personal access tokens」→「Tokens (classic)」を選択
3. 「Generate new token」をクリックし、必要に応じて認証
4. トークンに分かりやすい名前を付け、以下の権限を選択:
   - `read:packages` (パッケージのダウンロード用)
   - `write:packages` (パッケージのアップロード用)
   - `delete:packages` (パッケージの削除用)
   - `repo` (プライベートリポジトリからのパッケージアクセス用)
5. 「Generate token」をクリックしてトークンを生成
6. 生成されたトークンを安全な場所にコピー (このトークンは再表示されません)

### 2. npmの設定ファイルの作成

プロジェクトのルートディレクトリに`.npmrc`ファイルを作成し、以下のように設定します：

```
@USERNAME:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
```

ここで：
- `USERNAME`はGitHubのユーザー名または組織名に置き換えます
- `${NPM_TOKEN}`は環境変数からトークンを読み取るための参照です

### 3. package.jsonの設定

package.jsonファイルを更新して、GitHub Packagesでの公開に対応させます：

```json
{
  "name": "@USERNAME/grobal-mcp-stock-server",
  "version": "1.0.0",
  "description": "Model Context Protocol (MCP) server for stock market data",
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/USERNAME/grobal_mcp_stock_server.git"
  },
  // その他の設定...
}
```

重要なポイント：
- `name`フィールドはGitHubのユーザー名/組織名をスコープとして含める必要があります
- `publishConfig`セクションでGitHub Packagesのレジストリを明示的に指定
- `repository`フィールドは正確に設定する必要があります（GitHubはこれを使用してパッケージとリポジトリを関連付けます）

## パッケージの公開手順

### ローカル環境からの公開

1. 環境変数を設定（Windowsの場合）:
   ```powershell
   $env:NPM_TOKEN="YOUR_GITHUB_TOKEN"
   ```

   または（macOS/Linuxの場合）:
   ```bash
   export NPM_TOKEN="YOUR_GITHUB_TOKEN"
   ```

2. パッケージをビルド:
   ```bash
   npm run build
   ```

3. パッケージを公開:
   ```bash
   npm publish
   ```

成功すると、GitHubリポジトリの「Packages」タブにパッケージが表示されます。

## パッケージの使用方法

### 1. 認証の設定

GitHub Packagesからパッケージをインストールするには、認証が必要です。以下のいずれかの方法で設定します：

**方法1: ユーザーの`.npmrc`ファイルを設定**

ホームディレクトリ（`~/.npmrc`または`C:\Users\YourName\.npmrc`）に以下を追加:

```
@USERNAME:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

**方法2: プロジェクトごとの`.npmrc`ファイルを設定**

プロジェクトディレクトリに`.npmrc`ファイルを作成し、以下を追加:

```
@USERNAME:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
```

そして環境変数`NPM_TOKEN`を設定します。

### 2. パッケージのインストール

```bash
npm install @USERNAME/grobal-mcp-stock-server
```

### 3. Cursor IDEでの設定

Cursor IDEの設定に以下を追加します：

```json
{
  "mcpServers": {
    "global-stock-server": {
      "command": "npx",
      "args": ["@USERNAME/grobal-mcp-stock-server"],
      "env": {
        "PORT": "3000",
        "STOCK_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## CI/CDでの自動公開設定

GitHub Actionsを使用して、新しいリリースタグが作成されたときに自動的にパッケージを公開するワークフローを設定できます。

`.github/workflows/publish-package.yml`ファイルを作成して以下の内容を追加します：

```yaml
name: Publish Package to GitHub Packages

on:
  release:
    types: [created]

jobs:
  build-and-publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://npm.pkg.github.com'
          scope: '@USERNAME'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Publish to GitHub Packages
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{secrets.GITHUB_TOKEN}}
```

このワークフローでは：
- 新しいリリースが作成されたときにトリガーされます
- GitHubの自動生成された`GITHUB_TOKEN`を使用するため、追加の設定は不要です
- `@USERNAME`はリポジトリの所有者に合わせて変更してください

## セキュリティに関する注意事項

1. 個人アクセストークンを直接コードにコミットしないでください
2. CI/CDパイプラインではシークレット機能を使用してトークンを管理してください
3. トークンには必要最小限の権限のみを付与してください
4. 定期的にトークンのローテーション（更新）を行うことをお勧めします
5. チームメンバーが退職した場合は、関連するトークンを無効化してください

## トラブルシューティング

### 403 Forbidden エラー
- アクセストークンが正しく設定されているか確認
- トークンに適切な権限が付与されているか確認
- package.jsonの`name`フィールドがGitHubのユーザー名/組織名と一致しているか確認

### パッケージが見つからないエラー
- `.npmrc`ファイルが正しく設定されているか確認
- スコープ付きの完全なパッケージ名を使用しているか確認 (例: `@USERNAME/package-name`)

### publishコマンドの失敗
- package.jsonの`repository`フィールドが正しいGitHubリポジトリを指しているか確認
- バージョン番号が既存のものと被っていないか確認

## まとめ

GitHub Packagesを利用したプライベートnpmレジストリの設定により、組織内でのパッケージ管理が容易になります。主な利点として：

- GitHubと直接統合されているため、コードとパッケージが同じ場所で管理できる
- GitHubのアクセス制御を活用してパッケージのアクセス管理が可能
- CI/CDパイプラインと連携しやすい
- 複数のパッケージ形式をサポートしている

正しく設定することで、チーム内でのコード共有と再利用が促進され、開発効率の向上につながります。