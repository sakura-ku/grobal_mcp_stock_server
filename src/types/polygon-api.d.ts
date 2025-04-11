/**
 * Polygon.io API型定義の拡張
 * 
 * このファイルは@polygon.io/client-jsの型定義を拡張し、
 * 実際のAPIレスポンスとTypeScriptの型定義の差異を解消します。
 */

import '@polygon.io/client-js';

declare module '@polygon.io/client-js' {
  // Tickersレスポンス拡張
  interface ITickersResults {
    // 既存の型定義に不足しているプロパティを追加
    sic_description?: string;
    market?: string;
    industry?: string;
  }

  // 株価データレスポンス拡張
  interface IAggregatesResults {
    // 未定義の可能性があるプロパティを明示的にオプショナルに
    c?: number; // 終値
    h?: number; // 高値
    l?: number; // 安値
    o?: number; // 始値
    v?: number; // 出来高
    t?: number; // タイムスタンプ
  }

  // 型チェック用ユーティリティ関数
  export function isValidTickerResponse(data: unknown): data is { 
    results: ITickersResults[];
    status: string;
  };

  export function isValidAggregatesResponse(data: unknown): data is {
    results: IAggregatesResults[];
    status: string;
  };
} 