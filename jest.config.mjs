/**
 * Jest設定ファイル
 * 
 * ECMAScript Modules (ESM)とTypeScriptを適切にサポートするための設定
 */

export default {
  // Node.jsのESMサポートを有効にする
  testEnvironmentOptions: {
    experimentalVmModule: true
  },
  
  // ts-jestのESMプリセットを使用
  preset: 'ts-jest/presets/default-esm',
  
  // Node.js環境でテストを実行
  testEnvironment: 'node',
  
  // .tsファイルをESMとして扱う
  extensionsToTreatAsEsm: ['.ts'],
  
  // モジュールのインポートパスを.jsなしでも正しく解決できるようにマッピング
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  
  // TypeScriptファイルの変換設定
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { 
      useESM: true,
      // tsconfig.jsonの設定を継承
      tsconfig: 'tsconfig.json'
    }]
  },
  
  // カバレッジレポートの設定
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
    '!src/**/types/**',
    '!src/**/interfaces/**'
  ],
  
  // カバレッジレポートの出力ディレクトリ
  coverageDirectory: 'coverage',
  
  // カバレッジレポートの形式
  coverageReporters: ['text', 'lcov', 'html'],
  
  // テストのタイムアウト設定（ミリ秒）
  testTimeout: 10000,
  
  // テスト実行前の設定
  setupFiles: ['./jest.setup.mjs'],
  
  // テスト実行並列性
  maxWorkers: '50%'
}; 