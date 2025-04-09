# Python MCPサーバーのTypeScript移植計画

## 概要

本計画は、Pythonで実装されたMCPサーバー(`mcp_stock_server.py`)をTypeScriptベースのコードに変換し、現在のプロジェクト構造(`grobal_mcp_stock_server`)に適用するための計画を示します。

## 1. 現状分析

### 1.1 Python実装の概要

- ファイル: `C:\Users\niced\Project\create_pptx_with_llm\src\tools\server\mcp_stock_server.py`
- 主な機能:
  - 株価情報取得
  - 株価履歴データ取得
  - 株価分析
  - 株価予測
  - 複数株式比較
- 依存ライブラリ:
  - `yfinance`: Yahoo Financeから株価データの取得
  - `pandas`: データ加工・分析
  - `numpy`: 数値計算・分析

### 1.2 現在のTypeScript実装の状態

- プロジェクト: `grobal_mcp_stock_server`
- 主要構成:
  - `src/services/stockService.ts`: 株価関連のビジネスロジック
  - `src/tools/stockTools.ts`: MCP Tools定義
  - `src/types/stock.ts`: 型定義
  - `src/routes/stockRoutes.ts`: APIルーティング

### 1.3 移植における課題

1. **ライブラリの代替**:
   - `yfinance` → Node.js用の株価データ取得ライブラリへの置換
   - `pandas` → データ処理用のJavaScript/TypeScriptライブラリへの置換
   - `numpy` → 数値計算用のJavaScript/TypeScriptライブラリへの置換
   - `langchain` (create_pandas_data_flame) → OpenAI CodeInterpreterへの置換

2. **アーキテクチャの適応**:
   - Pythonのクラス/関数構造をTypeScriptのサービス/ルーターパターンに変換
   - MCPツール定義の変換
   - スキーマクラスの代替実装
   - OpenAI API初期化プロセスの実装

## 2. 代替ライブラリ選定

### 2.1 `yfinance`の代替

**選定ライブラリ**: `yahoo-finance2`

- 理由:
  - 最も活発にメンテナンスされている
  - TypeScriptサポートあり
  - 豊富なAPIと機能セット
  - ドキュメントが充実

**インストール方法**:
```bash
npm install yahoo-finance2
```

**使用例**:
```typescript
import yahooFinance from 'yahoo-finance2';

// 株価情報取得
const quote = await yahooFinance.quote('AAPL');

// 履歴データ取得
const historical = await yahooFinance.historical('AAPL', {
  period1: '2020-01-01',
  period2: '2020-12-31',
  interval: '1d'
});
```

### 2.2 `pandas`の代替

**選定ライブラリ**: `danfo.js`

- 理由:
  - Pandasライクな使用感
  - TypeScriptサポートあり
  - TensorFlow.jsチームによるサポート
  - データ処理機能が充実

**インストール方法**:
```bash
npm install danfojs-node
```

**使用例**:
```typescript
import * as dfd from 'danfojs-node';

// DataFrameの作成
const df = new dfd.DataFrame(data);

// データフィルタリング
const filtered = df.query(df['close'].gt(100));

// 統計処理
const stats = df.describe();
```

### 2.3 `numpy`の代替

**選定ライブラリ**: `numjs`

- 理由:
  - NumPyライクなAPI
  - 行列操作、ベクトル計算サポート
  - 数値計算機能

**インストール方法**:
```bash
npm install numjs
```

**使用例**:
```typescript
import nj from 'numjs';

// 配列作成
const arr = nj.array([1, 2, 3, 4]);

// 統計計算
const mean = arr.mean();
const std = arr.std();
```

### 2.4 `langchain`の代替 (DataAnalyzerLLM)

**選定ソリューション**: OpenAI CodeInterpreter

- 理由:
  - `langchain`の`create_pandas_data_flame`に依存しているデータ分析機能の代替として最適
  - データフレームの操作と分析が可能
  - Node.js向けの完全な`langchain`代替がない
  - OpenAIのAPIを直接利用することでシンプルな実装が可能

**実装方法と構造化出力の取得**:

現在のOpenAI APIでは、Code Interpreterと構造化JSON出力（`response_format`）を同時に使用できないという制約があります。この制約を回避し、構造化されたデータを確実に取得するための実装方法を以下に示します：

```typescript
import { OpenAI } from 'openai';

// 分析結果の型定義
interface AnalysisResult {
  content: string;           // テキスト形式の分析結果
  executedCode?: string;     // 実行されたPythonコード
  structuredData?: any;      // 構造化されたJSON分析結果
  rawResponse?: any;         // デバッグ用の完全なレスポンス
}

// OpenAI APIの初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// データ分析リクエスト（構造化出力を取得）
async function analyzeDataWithLLM(data: any, instructions: string): Promise<AnalysisResult> {
  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      { 
        role: "system", 
        content: `You are a financial data analysis assistant. Follow these instructions:
        1. Analyze the provided data using Python code
        2. Create a structured JSON object with your analysis results
        3. Print the JSON using json.dumps() at the end of your execution
        4. The JSON structure must include: analysis_summary, key_metrics, trends, and recommendations`
      },
      { 
        role: "user", 
        content: `Analyze the following data:\n${JSON.stringify(data)}\n\nInstructions: ${instructions}` 
      }
    ],
    tools: [{ type: "code_interpreter" }],
  });
  
  const message = response.choices[0].message;
  
  // Code Interpreterの出力からJSONを抽出
  let jsonResult: any = null;
  
  // ツール出力からJSONを探す
  if (message.tool_calls && message.tool_calls.length > 0) {
    const codeOutput = message.tool_calls
      .filter(call => call.type === 'code_interpreter')
      .flatMap(call => call.code_interpreter?.outputs || [])
      .filter(output => output.type === 'text')
      .map(output => output.text)
      .join('\n');
    
    // テキスト出力からJSONを抽出
    try {
      const jsonMatch = codeOutput.match(/({[\s\S]*})/); 
      if (jsonMatch) {
        jsonResult = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse JSON from code output:', e);
    }
  }
  
  // 構造化データを返す
  return {
    content: message.content || "",
    executedCode: message.tool_calls?.[0]?.code_interpreter?.input,
    structuredData: jsonResult,
    rawResponse: process.env.NODE_ENV === 'development' ? response : undefined
  };
}
```

**構造化データの例**:

```json
{
  "analysis_summary": "株価は過去3ヶ月間で上昇トレンドを示しており、特に直近1ヶ月で10.5%上昇しています。",
  "key_metrics": {
    "average_daily_volume": 1250000,
    "beta": 1.2,
    "pe_ratio": 15.7,
    "fifty_day_ma": 145.32,
    "two_hundred_day_ma": 132.18
  },
  "trends": [
    "短期：上昇トレンド",
    "中期：安定",
    "長期：緩やかな上昇"
  ],
  "recommendations": [
    "現在の投資ポジションを維持",
    "価格が135ドル以下に下落した場合は買い増し検討",
    "160ドル以上に上昇した場合は利益確定を検討"
  ]
}
```

### 2.5 OpenAI API初期化とキー管理

**実装方針**:

- 環境変数を使用したAPIキー管理
- APIクライアントの初期化をシングルトンパターンで実装
- リトライロジックを含めたエラーハンドリング

**実装例**:
```typescript
// src/services/openaiService.ts
import { OpenAI } from 'openai';
import { config } from '../config';

class OpenAIService {
  private static instance: OpenAIService;
  private client: OpenAI;

  private constructor() {
    if (!config.openai.apiKey) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }

    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
      timeout: config.openai.timeout || 30000,
      maxRetries: config.openai.maxRetries || 3,
    });
  }

  public static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService();
    }
    return OpenAIService.instance;
  }

  public getClient(): OpenAI {
    return this.client;
  }
}

export const openaiService = OpenAIService.getInstance();
export const openai = openaiService.getClient();
```

**設定ファイル更新**:
```typescript
// src/config/index.ts に追加
export const config = {
  // 既存の設定

  // OpenAI API設定
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    timeout: parseInt(process.env.OPENAI_TIMEOUT || '30000'),
    maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || '3'),
  },
};
```

### 2.6 スキーマクラスの代替実装

**実装方針**:

PythonのスキーマクラスをTypeScriptのインターフェースとZodスキーマに置き換える

**使用ライブラリ**: `zod`

**インストール方法**:
```bash
npm install zod
```

**実装例**:
```typescript
// src/types/schemas/base.ts
import { z } from 'zod';

// BaseSchemaの代替として基本的なZodスキーマ定義
export const BaseSchema = z.object({});
export type BaseSchemaType = z.infer<typeof BaseSchema>;

// src/types/schemas/market.ts
import { z } from 'zod';
import { BaseSchema } from './base';

export const MarketSummarySchema = BaseSchema.extend({
  date: z.string(),
  indices: z.array(
    z.object({
      name: z.string(),
      value: z.number(),
      change: z.number(),
      percentChange: z.number(),
    })
  ),
  topGainers: z.array(
    z.object({
      symbol: z.string(),
      name: z.string(),
      price: z.number(),
      change: z.number(),
      percentChange: z.number(),
    })
  ),
  topLosers: z.array(
    z.object({
      symbol: z.string(),
      name: z.string(),
      price: z.number(),
      change: z.number(),
      percentChange: z.number(),
    })
  ),
  marketSentiment: z.string(),
});

export type MarketSummarySchemaType = z.infer<typeof MarketSummarySchema>;

// src/types/schemas/stock.ts
// 同様の方法で他のスキーマも実装
```

**スキーマバリデーション実装**:
```typescript
// スキーマ検証ユーティリティ
import { ZodSchema } from 'zod';
import { logger } from '../utils/logger';

export function validateSchema<T>(schema: ZodSchema, data: unknown): { success: boolean; data?: T; error?: string } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData as T };
  } catch (error) {
    logger.error(`Schema validation error: ${error}`);
    return { success: false, error: String(error) };
  }
}

// Pythonのスキーマインポートに相当する機能
export function getValidationSchema(schemaName: string): ZodSchema | null {
  try {
    // スキーママップ
    const schemas: Record<string, ZodSchema> = {
      'MarketSummarySchema': MarketSummarySchema,
      'TrendAnalysisSchema': TrendAnalysisSchema,
      'SimpleForecastSchema': SimpleForecastSchema,
      // 他のスキーマを追加
    };
    
    return schemas[schemaName] || null;
  } catch (error) {
    logger.warning(`Schema load error: ${error}`);
    return null;
  }
}
```

## 3. 実装計画

### 3.1 型定義の拡張 (`src/types/stock.ts`)

既存の型定義を拡張し、以下の追加型を定義:

- 株価履歴データの型
- 株価分析結果の型
- 株価予測結果の型
- 市場概況の型

### 3.2 サービス層の実装 (`src/services/stockService.ts`)

既存のストックサービスを拡張し、以下の機能を追加:

1. **株価情報取得**:
   - 既存の`getStockPrice`メソッドを`yahoo-finance2`を使用して実装

2. **株価履歴データ取得**:
   - 新規メソッド`getHistoricalData`を実装

3. **株価分析**:
   - 既存の`analyzeStock`メソッドを拡張
   - 技術指標の計算を追加

4. **株価予測**:
   - 新規メソッド`predictStockPrice`を実装

5. **複数株式比較**:
   - 新規メソッド`compareStocks`を実装

6. **市場概況取得**:
   - 新規メソッド`getMarketOverview`を実装

### 3.3 ツール定義の実装 (`src/tools/stockTools.ts`)

既存のツール定義を拡張し、以下のMCPツールを追加:

1. **株価履歴取得ツール**: `get_historical_data`
2. **株価予測ツール**: `predict_stock_price` 
3. **株式比較ツール**: `compare_stocks`
4. **市場概況取得ツール**: `market_overview`

### 3.4 ルーター拡張 (`src/routes/stockRoutes.ts`)

既存のルーターに以下のエンドポイントを追加:

1. **GET /api/stocks/history/:symbol?period=1mo**: 株価履歴データ取得
2. **GET /api/stocks/predict/:symbol?days=7**: 株価予測
3. **GET /api/stocks/compare?symbols=AAPL,MSFT,GOOGL**: 複数株式比較
4. **GET /api/market/overview?region=global**: 市場概況取得

## 4. 実装優先順位

機能の重要性と実装の複雑さに基づいて、以下の順序で実装を進める:

1. **ライブラリインストールと型定義拡張**:
   - 必要なライブラリをインストール
   - 型定義ファイルを拡張

2. **基本機能の実装**:
   - 株価情報取得
   - 株価履歴データ取得

3. **分析機能の実装**:
   - 株価分析
   - 市場概況取得

4. **高度な機能の実装**:
   - 株価予測
   - 複数株式比較

## 5. 実装上の注意点

### 5.1 エラーハンドリング

- 外部APIへのリクエスト失敗時の適切なエラーハンドリング
- ユーザーに分かりやすいエラーメッセージの提供

### 5.2 パフォーマンス

- データ取得処理の最適化
- キャッシュ機構の導入検討

### 5.3 テスト

- 各機能のユニットテスト実装
- 外部APIモックを使用したテスト

## 6. 実行スケジュール

| フェーズ | 内容 | 予定 |
|--------|------|------|
| 1 | 環境準備、ライブラリインストール | 1日 |
| 2 | 型定義拡張とインターフェース設計 | 1日 |
| 3 | 基本機能実装 | 2日 |
| 4 | 分析機能実装 | 2日 |
| 5 | 高度機能実装 | 3日 |
| 6 | テスト・バグ修正 | 2日 |
| 7 | ドキュメント整備 | 1日 |

## 7. まとめ

本計画に従って実装を進めることで、Pythonベースの`mcp_stock_server.py`の機能を現在のTypeScriptプロジェクトに効果的に統合できます。必要なライブラリや設計パターンを適切に選択することで、TypeScriptの型安全性を活かしつつ、同等以上の機能を提供できる見込みです。

Pythonライブラリに完全に対応する代替が見つからない機能については、代替手段で実現するか、必要に応じて機能を簡略化して実装します。

## 8. 環境変数の更新

以下の環境変数を追加する必要があります：

```
# OpenAI API設定
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_TIMEOUT=30000
OPENAI_MAX_RETRIES=3
```

`.env.example`ファイルにも同様の変更を加え、ドキュメントを更新します。