# GitHub Packagesへのパッケージ公開手順

このドキュメントでは、Global MCP Stock Serverをnpmパッケージとして、GitHub Packagesに公開する手順を説明します。

## 前提条件

1. GitHubアカウントを持っていること
2. リポジトリへのアクセス権があること
3. パッケージ公開権限を持つGitHub個人アクセストークンを取得していること

## パッケージ構成

公開されるパッケージには以下のファイルが含まれます：

- `build/` - コンパイル済みのJavaScriptファイル
- `README.md` - パッケージのドキュメント
- `LICENSE` - ライセンス情報

## 公開手順

### 1. 環境変数の設定

GitHub個人アクセストークンを環境変数として設定します：

```powershell
# Windowsの場合
$env:NPM_TOKEN="your_github_token"

# macOS/Linuxの場合
export NPM_TOKEN="your_github_token"
```

### 2. パッケージのビルドとテスト

```powershell
# ビルド
npm run build

# テスト
npm test
```

### 3. パッケージのプレビュー

実際に公開する前に、パッケージの内容を確認します：

```powershell
npm run prepare:package
```

これにより、`grobal-mcp-stock-server-1.0.0.tgz`のようなtgzファイルが生成されます。この内容を確認して、必要なファイルが含まれているか確認してください。

### 4. バージョン管理

新しいバージョンをリリースする場合は、バージョン番号を更新します：

```powershell
# パッチバージョンの更新（1.0.0 → 1.0.1）
npm version patch

# マイナーバージョンの更新（1.0.0 → 1.1.0）
npm version minor

# メジャーバージョンの更新（1.0.0 → 2.0.0）
npm version major
```

これにより、`package.json`のバージョン番号が更新され、対応するGitタグが作成されます。

### 5. パッケージの公開

```powershell
npm run publish:package
```

または

```powershell
npm publish
```

### 6. 公開の確認

パッケージが正常に公開されたことを確認するには、GitHubリポジトリのPackagesタブを確認します。

## トラブルシューティング

### 認証エラー

エラーメッセージ: `npm ERR! 401 Unauthorized - PUT https://npm.pkg.github.com/@sakura-ku%2fgrobal-mcp-stock-server`

対処法:
1. `.npmrc`ファイルが正しく設定されているか確認
2. 環境変数`NPM_TOKEN`が正しく設定されているか確認
3. GitHub個人アクセストークンが有効で、`write:packages`権限があるか確認

### スコープが一致しない

エラーメッセージ: `npm ERR! 400 Bad Request - PUT https://npm.pkg.github.com/@wrong-scope%2fgrobal-mcp-stock-server`

対処法:
1. `package.json`の`name`フィールドが正しいスコープ（GitHubユーザー名またはオーガニゼーション名）になっているか確認

```json
{
  "name": "@sakura-ku/grobal-mcp-stock-server"
}
```

## 自動化

継続的インテグレーション／継続的デリバリー（CI/CD）パイプラインを使用して自動パッケージ公開を設定する場合は、`.github/workflows/publish.yml`ファイルを作成します。

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
          scope: '@sakura-ku'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Publish to GitHub Packages
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{secrets.GITHUB_TOKEN}}
```

このワークフローは、新しいリリースが作成されたときに自動的にパッケージをビルドして公開します。

## 参考リソース

- [GitHub Packages 公式ドキュメント](https://docs.github.com/ja/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)
- [npmのバージョニングドキュメント](https://docs.npmjs.com/cli/v9/commands/npm-version)
- [npmの公開ドキュメント](https://docs.npmjs.com/cli/v9/commands/npm-publish)
