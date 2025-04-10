// OpenAIクラスのモック
export class OpenAI {
  apiKey: string;
  timeout: number;
  maxRetries: number;

  constructor(config: { apiKey: string; timeout?: number; maxRetries?: number }) {
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 3;
  }

  // ChatCompletionsのモック
  chat = {
    completions: {
      create: jest.fn().mockImplementation(async (params) => {
        if (!this.apiKey || this.apiKey === 'invalid-key') {
          throw new Error('Invalid API key');
        }

        // レスポンス形式に応じてモックを返す
        if (params.response_format?.type === 'json_object') {
          return {
            id: 'mock-completion-id',
            object: 'chat.completion',
            created: Date.now(),
            model: params.model || 'gpt-4-turbo',
            choices: [
              {
                index: 0,
                message: {
                  role: 'assistant',
                  content: '{"result": "success", "data": {"value": 42}}',
                },
                finish_reason: 'stop',
              },
            ],
            usage: {
              prompt_tokens: 100,
              completion_tokens: 50,
              total_tokens: 150,
            },
          };
        }

        // コードインタプリタの場合
        if (params.tools && params.tools.some((t: { type?: string; function?: { name?: string } }) => t.function?.name === 'code_interpreter')) {
          return {
            id: 'mock-completion-id',
            object: 'chat.completion',
            created: Date.now(),
            model: params.model || 'gpt-4-turbo',
            choices: [
              {
                index: 0,
                message: {
                  role: 'assistant',
                  content: 'Here is the result of the analysis',
                  tool_calls: [
                    {
                      id: 'call_123',
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
                finish_reason: 'tool_calls',
              },
            ],
            usage: {
              prompt_tokens: 100,
              completion_tokens: 50,
              total_tokens: 150,
            },
          };
        }

        // 通常のチャット完了
        return {
          id: 'mock-completion-id',
          object: 'chat.completion',
          created: Date.now(),
          model: params.model || 'gpt-4-turbo',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: 'This is a mock response from OpenAI API',
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 50,
            total_tokens: 150,
          },
        };
      }),
    },
  };
}

// デフォルトエクスポートも設定
export default OpenAI;