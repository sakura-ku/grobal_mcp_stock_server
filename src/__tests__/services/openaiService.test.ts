import { jest } from '@jest/globals';
import { openaiService } from '../../services/openaiService.js';
import { ExternalApiError } from '../../errors/index.js';

// configをモック化
jest.mock('../../config/index.js', () => ({
  default: {
    openai: {
      apiKey: 'test-api-key',
      timeout: 1000,
      maxRetries: 1,
    },
  },
}));

// OpenAI SDKをモック化
jest.mock('openai');

// loggerをモック化
jest.mock('../../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('OpenAIService', () => {
  // 各テスト前に実行するセットアップ
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('シングルトンパターン', () => {
    it('getInstance()メソッドが常に同じインスタンスを返すこと', () => {
      // プライベートコンストラクタのテストのため、TypeScriptの制約を迂回してモックを設定する必要がある
      const mockGetInstance = jest.spyOn(openaiService.constructor.prototype, 'getInstance');

      const instance1 = openaiService;
      const instance2 = openaiService;

      expect(instance1).toBe(instance2);
      expect(mockGetInstance).toHaveBeenCalled();

      // モックをリストア
      mockGetInstance.mockRestore();
    });
  });

  describe('getClient()', () => {
    it('初期化成功後、正常にクライアントインスタンスを返すこと', () => {
      const client = openaiService.getClient();
      expect(client).toBeDefined();
    });
  });

  describe('createChatCompletion()', () => {
    it('正常なパラメータで呼び出した場合、APIからのレスポンスが期待通りの構造で返ること', async () => {
      // anyを使用して型エラーを回避
      const mockParams: any = {
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await openaiService.createChatCompletion(mockParams);
      
      expect(response).toBeDefined();
      expect(response.id).toBeDefined();
      expect(response.choices).toBeInstanceOf(Array);
      expect(response.choices.length).toBeGreaterThan(0);
      expect(response.choices[0].message).toBeDefined();
    });

    it('APIエラー発生時、適切なExternalApiErrorがスローされること', async () => {
      // OpenAIクライアントのcreateメソッドを一時的にエラーを投げるようにモック化
      const mockClient = openaiService.getClient();
      const originalCreate = mockClient.chat.completions.create;
      
      // モックの型を修正
      (mockClient.chat.completions.create as any) = jest.fn().mockImplementation(() => {
        return Promise.reject(new Error('API Error'));
      });

      // anyを使用して型エラーを回避
      const mockParams: any = {
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await expect(openaiService.createChatCompletion(mockParams)).rejects.toThrow(ExternalApiError);
      
      // モックを元に戻す
      mockClient.chat.completions.create = originalCreate;
    });
  });

  describe('createCodeInterpreterCompletion()', () => {
    it('正常なメッセージで呼び出した場合、コードインタプリタを含むレスポンスが期待通りの構造で返ること', async () => {
      // anyを使用して型エラーを回避
      const mockMessages: any = [{ role: 'user', content: 'Analyze this data' }];

      const response = await openaiService.createCodeInterpreterCompletion(mockMessages);
      
      expect(response).toBeDefined();
      expect(response.choices[0].message.tool_calls).toBeDefined();
      expect(response.choices[0].message.tool_calls[0].function.name).toBe('code_interpreter');
    });

    it('APIエラー発生時、適切なExternalApiErrorがスローされること', async () => {
      // OpenAIクライアントのcreateメソッドを一時的にエラーを投げるようにモック化
      const mockClient = openaiService.getClient();
      const originalCreate = mockClient.chat.completions.create;
      
      // モックの型を修正
      (mockClient.chat.completions.create as any) = jest.fn().mockImplementation(() => {
        return Promise.reject(new Error('API Error'));
      });

      // anyを使用して型エラーを回避
      const mockMessages: any = [{ role: 'user', content: 'Analyze this data' }];

      await expect(openaiService.createCodeInterpreterCompletion(mockMessages)).rejects.toThrow(ExternalApiError);
      
      // モックを元に戻す
      mockClient.chat.completions.create = originalCreate;
    });
  });

  describe('createStructuredJsonCompletion()', () => {
    it('正常なメッセージとJSONスキーマで呼び出した場合、構造化JSONレスポンスが期待通りの構造で返ること', async () => {
      // anyを使用して型エラーを回避
      const mockMessages: any = [{ role: 'user', content: 'Give me structured data' }];
      const mockSchema = {
        type: 'object',
        properties: {
          result: { type: 'string' },
          data: { 
            type: 'object',
            properties: {
              value: { type: 'number' }
            }
          }
        }
      };

      // 戻り値の型指定
      interface TestResponse {
        result: string;
        data: {
          value: number;
        };
      }

      const response = await openaiService.createStructuredJsonCompletion<TestResponse>(mockMessages, mockSchema);
      
      expect(response).toBeDefined();
      expect(response.result).toBe('success');
      expect(response.data).toBeDefined();
      expect(response.data.value).toBe(42);
    });

    it('APIエラー発生時、適切なExternalApiErrorがスローされること', async () => {
      // OpenAIクライアントのcreateメソッドを一時的にエラーを投げるようにモック化
      const mockClient = openaiService.getClient();
      const originalCreate = mockClient.chat.completions.create;
      
      // モックの型を修正
      (mockClient.chat.completions.create as any) = jest.fn().mockImplementation(() => {
        return Promise.reject(new Error('API Error'));
      });

      // anyを使用して型エラーを回避
      const mockMessages: any = [{ role: 'user', content: 'Give me structured data' }];
      const mockSchema = { type: 'object' };

      await expect(openaiService.createStructuredJsonCompletion(mockMessages, mockSchema)).rejects.toThrow(ExternalApiError);
      
      // モックを元に戻す
      mockClient.chat.completions.create = originalCreate;
    });
  });

  describe('extractJsonFromCodeInterpreter()', () => {
    it('コードインタプリタの出力からJSONを正しく抽出できること', () => {
      const mockCompletion = {
        choices: [
          {
            message: {
              tool_calls: [
                {
                  type: 'function',
                  function: {
                    name: 'code_interpreter',
                    arguments: JSON.stringify({
                      outputs: [
                        {
                          type: 'text',
                          text: '{"analysisResult": {"trend": "positive", "values": [1, 2, 3]}}',
                        },
                      ],
                    }),
                  },
                },
              ],
            },
          },
        ],
      };

      // 戻り値の型指定
      interface TestResult {
        analysisResult: {
          trend: string;
          values: number[];
        };
      }

      const result = openaiService.extractJsonFromCodeInterpreter<TestResult>(mockCompletion);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('analysisResult');
      expect(result?.analysisResult.trend).toBe('positive');
      expect(result?.analysisResult.values).toEqual([1, 2, 3]);
    });

    it('JSON部分がない場合、nullを返すこと', () => {
      const mockCompletion = {
        choices: [
          {
            message: {
              content: 'No JSON here',
            },
          },
        ],
      };

      const result = openaiService.extractJsonFromCodeInterpreter(mockCompletion);
      
      expect(result).toBeNull();
    });

    it('不正なJSON形式の場合、nullを返すこと', () => {
      const mockCompletion = {
        choices: [
          {
            message: {
              tool_calls: [
                {
                  type: 'function',
                  function: {
                    name: 'code_interpreter',
                    arguments: JSON.stringify({
                      outputs: [
                        {
                          type: 'text',
                          text: '{ This is not valid JSON',
                        },
                      ],
                    }),
                  },
                },
              ],
            },
          },
        ],
      };

      const result = openaiService.extractJsonFromCodeInterpreter(mockCompletion);
      
      expect(result).toBeNull();
    });
  });
});