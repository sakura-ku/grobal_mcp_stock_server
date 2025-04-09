/**
 * アプリケーションログを管理するシンプルなロガー
 */
export const logger = {
  /**
   * 情報レベルのログを出力
   * @param message ログメッセージ
   * @param args 追加の引数
   */
  info: (message: string, ...args: any[]): void => {
    console.log(`[INFO] ${message}`, ...args);
  },

  /**
   * エラーレベルのログを出力
   * @param message ログメッセージ
   * @param args 追加の引数
   */
  error: (message: string, ...args: any[]): void => {
    console.error(`[ERROR] ${message}`, ...args);
  },

  /**
   * 警告レベルのログを出力
   * @param message ログメッセージ
   * @param args 追加の引数
   */
  warn: (message: string, ...args: any[]): void => {
    console.warn(`[WARN] ${message}`, ...args);
  },

  /**
   * デバッグレベルのログを出力
   * @param message ログメッセージ
   * @param args 追加の引数
   */
  debug: (message: string, ...args: any[]): void => {
    console.debug(`[DEBUG] ${message}`, ...args);
  }
}; 