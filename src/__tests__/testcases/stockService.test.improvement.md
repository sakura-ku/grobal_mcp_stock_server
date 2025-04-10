# StockService テスト改善提案

## 現在の問題点

テスト実行の結果、以下の主要な問題点が確認されました：

1. **モック化の問題**：
   - `yahooFinance.quote.mockResolvedValueOnce is not a function` などのエラーが発生
   - ESモジュールとJestのモック機能の互換性問題

2. **Yahoo Finance API接続エラー**：
   - `No set-cookie header present in Yahoo's response` エラーが発生
   - Yahoo FinanceのAPIが変更された可能性

3. **テストカバレッジの制限**：
   - パラメータバリデーションのテストは成功しているが、正常系のテストが失敗している
   - プライベートメソッドのテストが未実装

## 改善提案

### 1. モック化の改善

#### 方法1: ファクトリー関数でモックを生成

```typescript
// yahooFinanceのモックを改善
jest.mock('yahoo-finance2', () => {
  // ファクトリー関数を使用
  return {
    __esModule: true,
    default: {
      quote: jest.fn().mockImplementation(() => Promise.resolve({
        shortName: 'Apple Inc.',
        regularMarketPrice: 150.25,
        // その他の必要なプロパティ
      })),
      historical: jest.fn().mockImplementation(() => Promise.resolve([])),
      quoteSummary: jest.fn().mockImplementation(() => Promise.resolve({})),
      search: jest.fn().mockImplementation(() => Promise.resolve({ quotes: [] })),
    }
  };
});
```

#### 方法2: jest.spyOnを使用したモック

```typescript
// yahooFinanceのインポートを保持
import yahooFinance from 'yahoo-finance2';

// テスト内でspyOnを使用
beforeEach(() => {
  jest.spyOn(yahooFinance, 'quote').mockResolvedValue({
    shortName: 'Apple Inc.',
    // その他のプロパティ
  });
  // 他のメソッドも同様にモック
});

afterEach(() => {
  jest.restoreAllMocks();
});
```

#### 方法3: テスト用のモックサービス作成

```typescript
// src/__tests__/mocks/yahooFinanceMock.ts
const mockQuote = jest.fn();
const mockHistorical = jest.fn();
// その他のメソッド

const yahooFinanceMock = {
  quote: mockQuote,
  historical: mockHistorical,
  // その他のモックメソッド
};

export default yahooFinanceMock;

// テストファイル内
jest.mock('yahoo-finance2', () => require('../mocks/yahooFinanceMock').default);
```

### 2. Yahoo Finance API問題の対策

#### 方法1: 依存性注入パターンの導入

```typescript
// stockService.ts 修正
class StockService {
  private apiClient;
  
  constructor(apiClient = yahooFinance) {
    this.apiClient = apiClient;
  }
  
  async getStockPrice(symbol: string): Promise<StockData> {
    // this.apiClient.quote を使用
  }
}

// テスト内でモッククライアント注入
const mockClient = { quote: jest.fn().mockResolvedValue({...}) };
const testService = new StockService(mockClient);
```

#### 方法2: 代替APIの検討

- Alpha Vantage API
- Finnhub API
- Polygon.io

などを代替として検討し、アダプタパターンで実装

### 3. テストカバレッジの向上

#### プライベートメソッドのテスト

```typescript
// src/__tests__/utils/technicalIndicators.test.ts
import { calculateSMA, calculateEMA } from '../../utils/technicalIndicators';

describe('Technical Indicators', () => {
  test('calculateSMA should correctly compute Simple Moving Average', () => {
    const prices = [1, 2, 3, 4, 5];
    expect(calculateSMA(prices, 3)).toBeCloseTo(4); // (3+4+5)/3
  });
  
  // 他の指標も同様にテスト
});
```

#### データプロバイダーの利用

```typescript
// テストデータの定義
const testCases = [
  { name: '上昇トレンドのケース', data: [...], expected: 'bullish' },
  { name: '下降トレンドのケース', data: [...], expected: 'bearish' },
  { name: 'レンジ相場のケース', data: [...], expected: 'neutral' },
];

// 各テストケースを実行
test.each(testCases)('$name', ({ data, expected }) => {
  const result = analyzeStockTrend(data);
  expect(result.trend).toBe(expected);
});
```

## プロジェクト構成の改善提案

### 1. テスト環境の整備

```json
// jest.config.js
module.exports = {
  preset: 'ts-jest/presets/js-with-ts-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!(yahoo-finance2)/)'
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  setupFilesAfterEnv: ['./jest.setup.js']
};

// jest.setup.js
jest.mock('yahoo-finance2', () => ({
  quote: jest.fn(),
  historical: jest.fn(),
  // その他のメソッド
}));
```

### 2. アーキテクチャの改善

```typescript
// src/adapters/yahooFinanceAdapter.ts
export class YahooFinanceAdapter implements StockDataProvider {
  async getStockPrice(symbol: string): Promise<StockData> {
    // yahooFinance.quote の実装
  }
  // 他のメソッド
}

// src/services/stockService.ts
export class StockService {
  constructor(private dataProvider: StockDataProvider) {}
  
  async getStockPrice(symbol: string): Promise<StockData> {
    if (!symbol) {
      throw new InvalidParameterError('銘柄コードは必須です');
    }
    return this.dataProvider.getStockPrice(symbol);
  }
}

// 実際の使用
const yahooAdapter = new YahooFinanceAdapter();
const stockService = new StockService(yahooAdapter);

// テスト時
const mockAdapter = { getStockPrice: jest.fn() };
const testService = new StockService(mockAdapter);
```

## 次のステップ

1. **モック設定の修正**:
   - 上記の提案からプロジェクトに最適な方法を選択
   - ESMとJestの互換性を確保する設定の見直し

2. **テスト戦略の見直し**:
   - ユニットテストとインテグレーションテストの分離
   - スタブとモックの適切な使い分け

3. **依存性の整理**:
   - 外部APIへの依存を抽象化
   - テスト可能性を高めるためのインターフェース導入

4. **テストカバレッジの測定**:
   - Jestのカバレッジレポート機能の活用
   - CI/CDパイプラインでのテスト自動化 