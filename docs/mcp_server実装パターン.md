# MCPサーバー実装パターン

Model Context Protocol (MCP) サーバーには、AI機能を拡張するための3つの主要なコンポーネントがあります：**ツール**、**リソース**、**プロンプト**。この文書では、それぞれの実装パターンと連携方法について説明します。

## 1. MCPサーバーの基本設定

MCPサーバーの基本的な初期化は以下のように行います：

```javascript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import express from 'express';

// MCPサーバーの初期化
const mcpServer = new McpServer({
  id: 'my-mcp-server',         // サーバーの一意のID
  name: 'My MCP Server',       // サーバーの表示名
  description: 'Example MCP server', // サーバーの説明
  version: '1.0.0'             // サーバーのバージョン
});

// Expressアプリケーションの初期化
const app = express();
app.use(express.json());

// サーバーの起動
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`サーバーが起動しました: http://localhost:${PORT}`);
});
```

## 2. ツール（Tool）の実装

ツールはAIが特定のタスクを実行するために呼び出せる機能です。例として株価取得ツールを実装します：

### 基本的なツール実装

```javascript
import { z } from 'zod';

// 株価取得ツールの登録
mcpServer.tool(
  'get_stock_price',           // ツール名
  '株価情報を取得します',       // ツールの説明
  {                           // パラメータ定義
    symbol: z.string().describe('株式銘柄コード (例: AAPL)')
  },
  async (params) => {         // ハンドラー実装
    const { symbol } = params;
    
    // 実際には外部APIを呼び出してデータを取得
    const mockData = {
      symbol: symbol.toUpperCase(),
      price: 150 + Math.random() * 50,
      change: (Math.random() * 10 - 5).toFixed(2)
    };
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(mockData, null, 2)
        }
      ]
    };
  }
);
```

### 設定ファイルによるツール定義の分離

大規模なアプリケーションではツールの定義とハンドラーを分離すると管理が容易になります：

```javascript
// src/tools/getStockPrice.ts

import { z } from 'zod';

// ツール定義
export const getStockPriceDefinition = {
  name: 'get_stock_price',
  description: '株価情報を取得します',
  parameters: {
    symbol: z.string().min(1).max(10).describe('株式銘柄コード')
  },
  handler: async (params) => {
    // 実装...
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }
};

// src/index.ts で利用
mcpServer.tool(
  getStockPriceDefinition.name,
  getStockPriceDefinition.description,
  { symbol: getStockPriceDefinition.parameters.symbol },
  getStockPriceDefinition.handler
);
```

## 3. リソース（Resource）の実装

リソースはAIモデルが参照できるデータ（文書、画像、コードなど）を提供します。

### 基本的なリソース実装

```javascript
// 企業プロファイルリソースの登録
mcpServer.resource(
  'company_profiles',          // リソース名
  '企業のプロファイル情報',     // リソースの説明
  async (params) => {          // リソース取得ハンドラー
    const { symbol } = params || {};
    
    // データベースや外部APIからデータを取得
    const profile = await fetchCompanyProfile(symbol);
    
    return {
      content: [
        {
          type: "text",
          text: profile.description
        }
      ]
    };
  }
);
```

### パラメータ付きリソース

リソースはパラメータを受け取ることができます：

```javascript
// 財務レポートリソース（年次指定可能）
mcpServer.resource(
  'financial_reports',
  '企業の財務レポート',
  async (params) => {
    const { symbol, year } = params || {};
    
    // 特定の年の財務レポートを取得
    const report = await fetchFinancialReport(symbol, year);
    
    return {
      content: [
        {
          type: "text",
          text: report.content
        }
      ]
    };
  }
);
```

## 4. プロンプト（Prompt）の実装

プロンプトはAIモデルの動作を特定の目的に適合させるための指示セットです。

### 基本的なプロンプト実装

```javascript
// 投資アドバイザープロンプトの登録
mcpServer.prompt(
  'investment_advisor',        // プロンプト名
  '投資アドバイザーのペルソナ', // プロンプトの説明
  async () => {               // プロンプト取得ハンドラー
    return {
      content: `
あなたは経験豊富な投資アドバイザーです。以下のガイドラインに従ってアドバイスを提供してください：

1. 常に客観的なデータに基づいて回答する
2. リスクとリターンのバランスを明確に説明する
3. 投資判断は最終的にユーザー自身が行うことを強調する
4. 専門用語を使う場合は必ず解説を付ける
`
    };
  }
);
```

### 条件付きプロンプト

ユーザーの状況に応じて異なるプロンプトを返すこともできます：

```javascript
// 投資スタイルに応じたプロンプト
mcpServer.prompt(
  'investment_style',
  '投資スタイルに応じたアドバイス',
  async (params) => {
    const { risk_tolerance } = params || {};
    
    let promptContent = "あなたは投資アドバイザーです。";
    
    if (risk_tolerance === 'conservative') {
      promptContent += "安全性を最優先したアドバイスを提供してください。";
    } else if (risk_tolerance === 'aggressive') {
      promptContent += "高いリターンを目指した積極的な投資戦略を提案してください。";
    } else {
      promptContent += "バランスの取れたアドバイスを提供してください。";
    }
    
    return { content: promptContent };
  }
);
```

## 5. コンポーネント間の連携

MCPサーバーの各コンポーネントは連携して動作させることができます。

### ツールとリソースの連携

```javascript
// リソースを活用するツール
mcpServer.tool(
  'analyze_company',
  '企業の総合分析',
  { 
    symbol: z.string().describe('株式銘柄コード')
  },
  async (params, extra) => {
    const { symbol } = params;
    
    // 同じサーバー内のリソースを参照
    const profileResource = await extra.getResource('company_profiles', { symbol });
    const financialResource = await extra.getResource('financial_reports', { symbol, year: '2023' });
    
    // 株価データの取得
    const stockData = await getStockPrice(symbol);
    
    // 総合分析を生成
    const analysis = `
# ${symbol}社の総合分析
## 株価情報
${stockData.price} USD (${stockData.change}%)

## 企業概要
${profileResource.content[0].text}

## 財務ハイライト
${financialResource.content[0].text}
`;
    
    return {
      content: [
        {
          type: "text",
          text: analysis
        }
      ]
    };
  }
);
```

### プロンプトとツールの連携

```javascript
// プロンプトを活用するツール
mcpServer.tool(
  'get_investment_advice',
  '投資アドバイスを提供',
  { 
    symbol: z.string().describe('株式銘柄コード'),
    risk_tolerance: z.enum(['conservative', 'moderate', 'aggressive']).describe('リスク許容度')
  },
  async (params, extra) => {
    const { symbol, risk_tolerance } = params;
    
    // 適切なプロンプトを取得
    const advisorPrompt = await extra.getPrompt('investment_style', { risk_tolerance });
    
    // 企業データとプロンプトを組み合わせる
    const stockData = await getStockPrice(symbol);
    const companyProfile = await extra.getResource('company_profiles', { symbol });
    
    const advice = `
${advisorPrompt.content}

対象企業: ${symbol}
現在株価: ${stockData.price} USD
変動率: ${stockData.change}%

企業概要:
${companyProfile.content[0].text}

上記情報に基づいた投資アドバイス:
`;
    
    return {
      content: [
        {
          type: "text",
          text: advice
        }
      ]
    };
  }
);
```

## 6. クライアント側での呼び出し

これらのコンポーネントは、AI実行環境（Cursor IDEなど）から以下のように呼び出されます：

### ツールの呼び出し

```javascript
// AIモデル側からのツール呼び出し
const stockResult = await client.callTool("get_stock_price", { symbol: "AAPL" });
// stockResultには株価情報が含まれる
```

### リソースの取得

```javascript
// AIモデル側からのリソース取得
const profileResult = await client.getResource("company_profiles", { symbol: "AAPL" });
// profileResultには企業プロファイルが含まれる
```

### プロンプトの取得

```javascript
// AIモデル側からのプロンプト取得
const promptResult = await client.getPrompt("investment_advisor");
// promptResultにはAIの動作指示が含まれる
```

## 7. 実装上の注意点

- ツール、リソース、プロンプトのレスポンスは常に `{ content: [...] }` の形式で返す
- リソースは大きすぎるとコンテキスト制限に達する可能性があるため、適切なサイズに調整する
- プロンプトはAIモデルの動作を完全に制御するものではなく、推奨や方向付けとして機能する
- エラー処理を適切に行い、クライアント側にわかりやすいエラーメッセージを返す

MCPサーバーの実装を通じて、AIモデルの能力を大幅に拡張し、特化されたユースケースに対応することができます。 