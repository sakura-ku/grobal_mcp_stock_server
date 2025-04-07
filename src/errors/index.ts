// 基本的なMCPサーバーエラークラス
export class McpServerError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

// リソースが見つからないエラー
export class NotFoundError extends McpServerError {
  constructor(resource: string) {
    super(`Resource not found: ${resource}`, 404);
  }
}

// 無効なパラメータエラー
export class InvalidParameterError extends McpServerError {
  constructor(parameter: string) {
    super(`Invalid parameter: ${parameter}`, 400);
  }
}

// サードパーティAPIエラー
export class ExternalApiError extends McpServerError {
  constructor(service: string, message: string) {
    super(`Error calling ${service}: ${message}`, 502);
  }
}

// 認証エラー
export class AuthenticationError extends McpServerError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401);
  }
}