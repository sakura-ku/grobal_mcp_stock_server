import { OpenAI } from 'openai';
import config from '../config/index.js';
import { logger } from '../utils/logger.js';
import { ExternalApiError } from '../errors/index.js';

/**
 * OpenAI APIサービスクラス
 * シングルトンパターンで実装されており、アプリケーション全体で同じインスタンスを使用します
 */
class OpenAIService {
  private static instance: OpenAIService;
  private client: OpenAI;
  private isInitialized: boolean = false;

  /**
   * プライベートコンストラクタ - シングルトンパターン
   * 直接インスタンス化せず、getInstance()を使用してください
   */
  private constructor() {
    try {
      // システム環境変数からAPIキーを取得
      if (!config.openai.apiKey) {
        logger.error('OPENAI_API_KEYがシステム環境変数に設定されていません');
        throw new ExternalApiError('OpenAI', 'APIキーが設定されていません');
      }

      // OpenAI APIクライアントを初期化
      this.client = new OpenAI({
        apiKey: config.openai.apiKey,
        timeout: config.openai.timeout || 30000,
        maxRetries: config.openai.maxRetries || 3,
      });

      this.isInitialized = true;
      logger.info('OpenAI APIクライアントが初期化されました');
    } catch (error) {
      logger.error('OpenAI APIクライアント初期化エラー:', error);
      throw error instanceof Error
        ? error
        : new ExternalApiError('OpenAI', '初期化に失敗しました');
    }
  }

  /**
   * OpenAIServiceのシングルトンインスタンスを取得します
   * @returns OpenAIServiceのインスタンス
   */
  public static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService();
    }
    return OpenAIService.instance;
  }

  /**
   * OpenAI APIクライアントを取得します
   * @returns OpenAI APIクライアント
   * @throws ExternalApiError クライアントが初期化されていない場合
   */
  public getClient(): OpenAI {
    if (!this.isInitialized) {
      throw new ExternalApiError('OpenAI', 'APIクライアントが初期化されていません');
    }
    return this.client;
  }

  /**
   * OpenAI APIで新しいチャット完了リクエストを作成します
   * @param params チャット完了リクエストのパラメータ
   * @returns チャット完了レスポンス
   */
  // TODO: 将来的には戻り値型をより具体的な型（OpenAI.Chat.Completions.ChatCompletion | Stream<OpenAI.Chat.Completions.ChatCompletionChunk>）に置き換えることを検討する
  public async createChatCompletion(params: OpenAI.Chat.ChatCompletionCreateParams): Promise<any> {
    try {
      logger.info('OpenAI ChatCompletion APIリクエスト開始');
      const response = await this.getClient().chat.completions.create(params);
      logger.info('OpenAI ChatCompletion APIリクエスト完了');
      return response;
    } catch (error) {
      logger.error('OpenAI ChatCompletion APIエラー:', error);
      throw error instanceof Error
        ? new ExternalApiError('OpenAI', error.message)
        : new ExternalApiError('OpenAI', '予期しないエラーが発生しました');
    }
  }

  /**
   * OpenAI APIでコードインタプリタを使用したチャット完了リクエストを作成します
   * @param messages メッセージ配列
   * @param model 使用するモデル（デフォルト: gpt-4-turbo）
   * @returns コードインタプリタを使用したチャット完了レスポンス
   */
  // TODO: 将来的には戻り値型をより具体的な型に置き換えることを検討する
  public async createCodeInterpreterCompletion(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    model: string = 'gpt-4-turbo'
  ): Promise<any> {
    try {
      logger.info('OpenAI CodeInterpreter APIリクエスト開始');
      const response = await this.getClient().chat.completions.create({
        model,
        messages,
        tools: [{ 
          type: 'function', 
          function: {
            name: 'code_interpreter',
            description: 'Executes the Python code provided by the user and returns the output',
            parameters: {
              type: 'object',
              properties: {},
              required: []
            }
          }
        }]
      });
      logger.info('OpenAI CodeInterpreter APIリクエスト完了');
      return response;
    } catch (error) {
      logger.error('OpenAI CodeInterpreter APIエラー:', error);
      throw error instanceof Error
        ? new ExternalApiError('OpenAI', error.message)
        : new ExternalApiError('OpenAI', '予期しないエラーが発生しました');
    }
  }

  /**
   * OpenAI APIで構造化出力を使用したチャット完了リクエストを作成します
   * @param messages メッセージ配列
   * @param jsonSchema 期待するJSONスキーマ
   * @param model 使用するモデル（デフォルト: gpt-4-turbo）
   * @returns 構造化出力を持つチャット完了レスポンス
   */
  public async createStructuredJsonCompletion<T>(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    jsonSchema: object,
    model: string = 'gpt-4-turbo'
  ): Promise<T> {
    try {
      logger.info('OpenAI 構造化JSON APIリクエスト開始');
      const response = await this.getClient().chat.completions.create({
        model,
        messages,
        response_format: { type: 'json_object' },
      });
      
      logger.info('OpenAI 構造化JSON APIリクエスト完了');
      
      // 応答からJSONを抽出して返す
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new ExternalApiError('OpenAI', '有効なレスポンスが返されませんでした');
      }
      
      try {
        return JSON.parse(content) as T;
      } catch (parseError) {
        throw new ExternalApiError('OpenAI', 'JSONの解析に失敗しました');
      }
    } catch (error) {
      logger.error('OpenAI 構造化JSON APIエラー:', error);
      throw error instanceof Error
        ? new ExternalApiError('OpenAI', error.message)
        : new ExternalApiError('OpenAI', '予期しないエラーが発生しました');
    }
  }

  /**
   * コードインタプリタの出力からJSON部分を抽出します
   * @param completion ChatCompletion APIレスポンス
   * @returns 抽出されたJSONオブジェクトまたはnull
   */
  // TODO: completionパラメータの型をany以外のより具体的な型に置き換えることを検討する
  public extractJsonFromCodeInterpreter<T>(completion: any): T | null {
    try {
      const message = completion.choices[0]?.message;
      
      // ツール出力からJSONを探す
      if (message?.tool_calls && message.tool_calls.length > 0) {
        // コードインタプリタの出力を取得
        const outputs: string[] = [];
        
        for (const toolCall of message.tool_calls) {
          if (toolCall.type === 'function' && toolCall.function.name === 'code_interpreter') {
            // 関数の引数からコード出力を探す
            if (toolCall.function && toolCall.function.arguments) {
              try {
                const args = JSON.parse(toolCall.function.arguments);
                if (args.outputs && Array.isArray(args.outputs)) {
                  for (const output of args.outputs) {
                    if (output.type === 'text') {
                      outputs.push(output.text);
                    }
                  }
                }
              } catch (e) {
                logger.warn('コードインタプリタの出力解析エラー:', e);
              }
            }
          }
        }
        
        // 出力からJSONを探す
        const codeOutput = outputs.join('\n');
        
        // テキスト出力からJSONを抽出
        try {
          const jsonMatch = codeOutput.match(/({[\s\S]*})/); 
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]) as T;
          }
        } catch (e) {
          logger.error('JSON解析エラー:', e);
        }
      }
      
      return null;
    } catch (error) {
      logger.error('コードインタプリタ出力からのJSON抽出エラー:', error);
      return null;
    }
  }
}

// シングルトンインスタンスをエクスポート
export const openaiService = OpenAIService.getInstance();
// 便宜上、クライアントも直接エクスポート
export const openai = openaiService.getClient(); 