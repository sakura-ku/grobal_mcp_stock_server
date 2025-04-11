import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import { config } from './config/index.js';
import apiRouter from './routes/index.js';
import { z } from 'zod';
import {
  getStockPriceDefinition,
  analyzeStockDefinition,
  getMultipleStockPricesDefinition,
  getStockHistoryDefinition,
  getStockDetailsDefinition,
  searchStocksDefinition,
  analyzePortfolioDefinition,
  analyzeStockTrendTool,
  stockTools,
  // 未実装のメソッドを参照しているためコメントアウト
  // predictStockPriceTool,
  // analyzeTechnicalTool
} from './tools/stockTools.js';
import cors from 'cors';

/**
 * MCPサーバーを設定する関数
 */
async function setupMcpServer() {
  const mcpServer = new McpServer({
    id: 'global-mcp-stock-server',
    name: 'Global MCP Stock Server',
    description: '株式市場の情報を提供するMCPサーバー',
    version: '1.0.0'
  });

  // 基本的な株価関連ツール
  mcpServer.tool(
    getStockPriceDefinition.name,
    getStockPriceDefinition.description,
    { symbol: getStockPriceDefinition.parameters.symbol },
    getStockPriceDefinition.handler
  );

  mcpServer.tool(
    analyzeStockDefinition.name,
    analyzeStockDefinition.description,
    { symbol: analyzeStockDefinition.parameters.symbol },
    analyzeStockDefinition.handler
  );

  mcpServer.tool(
    getMultipleStockPricesDefinition.name,
    getMultipleStockPricesDefinition.description,
    { symbols: getMultipleStockPricesDefinition.parameters.symbols },
    getMultipleStockPricesDefinition.handler
  );

  // 株価履歴データ取得ツール
  mcpServer.tool(
    getStockHistoryDefinition.name,
    getStockHistoryDefinition.description,
    { 
      symbol: getStockHistoryDefinition.parameters.symbol,
      interval: getStockHistoryDefinition.parameters.interval,
      range: getStockHistoryDefinition.parameters.range
    },
    getStockHistoryDefinition.handler
  );

  // 株価詳細情報取得ツール
  mcpServer.tool(
    getStockDetailsDefinition.name,
    getStockDetailsDefinition.description,
    { symbol: getStockDetailsDefinition.parameters.symbol },
    getStockDetailsDefinition.handler
  );

  // 株式検索ツール
  mcpServer.tool(
    searchStocksDefinition.name,
    searchStocksDefinition.description,
    { query: searchStocksDefinition.parameters.query },
    searchStocksDefinition.handler
  );

  // ポートフォリオ分析ツール
  mcpServer.tool(
    analyzePortfolioDefinition.name,
    analyzePortfolioDefinition.description,
    { holdings: analyzePortfolioDefinition.parameters.holdings },
    analyzePortfolioDefinition.handler
  );

  // 株価分析関連のツール - Toolインターフェース実装のため個別にparametersを変換
  mcpServer.tool(
    analyzeStockTrendTool.name,
    analyzeStockTrendTool.description,
    {
      symbol: z.string().describe(analyzeStockTrendTool.parameters.properties.symbol.description),
      period: z.number().optional().describe(analyzeStockTrendTool.parameters.properties.period.description)
    },
    analyzeStockTrendTool.execute
  );

  // 未実装のメソッドを参照しているためコメントアウト
  /*
  // 株価予測ツール
  mcpServer.tool(
    predictStockPriceTool.name,
    predictStockPriceTool.description,
    {
      symbol: z.string().describe(predictStockPriceTool.parameters.properties.symbol.description),
      days: z.number().optional().describe(predictStockPriceTool.parameters.properties.days.description),
      history_period: z.string().optional().describe(predictStockPriceTool.parameters.properties.history_period.description)
    },
    predictStockPriceTool.execute
  );

  // テクニカル分析ツール
  mcpServer.tool(
    analyzeTechnicalTool.name,
    analyzeTechnicalTool.description,
    {
      symbol: z.string().describe(analyzeTechnicalTool.parameters.properties.symbol.description),
      interval: z.enum(['daily', 'weekly', 'monthly']).optional().describe(analyzeTechnicalTool.parameters.properties.interval.description),
      indicators: z.array(z.string()).optional().describe(analyzeTechnicalTool.parameters.properties.indicators.description)
    },
    analyzeTechnicalTool.execute
  );
  */

  return mcpServer;
}

/**
 * サーバーを起動する関数
 * @param port サーバーのポート番号
 * @param host サーバーのホスト名
 * @returns サーバーインスタンス
 */
export async function startServer(port: number = config.server.port, host: string = config.server.host) {
  try {
    // Expressアプリケーションの初期化
    const app = express();

    // ミドルウェアの設定
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cors()); // CORSを有効化

    // APIルートのマウント
    app.use('/api', apiRouter);

    // MCPサーバーの初期化
    const mcpServer = await setupMcpServer();
    
    // MCPツール一覧を返すエンドポイント
    app.get('/mcp/tools', (req, res) => {
      console.log('MCPツール一覧が要求されました。登録済みツール数:', stockTools.length);
      res.json(stockTools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters ? tool.parameters : {}
      })));
    });
    
    // MCP プラグイン情報を返すエンドポイント
    app.get('/mcp/plugin/info', (req, res) => {
      console.log('MCPプラグイン情報が要求されました');
      res.json({
        id: 'global-mcp-stock-server',
        name: 'Global MCP Stock Server',
        description: '株式市場の情報を提供するMCPサーバー',
        version: '1.0.0',
        tools: stockTools.map(tool => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters ? tool.parameters : {}
        }))
      });
    });
    
    // トランスポートセッション管理用のオブジェクト
    const transports: {[sessionId: string]: SSEServerTransport} = {};

    // MCPのSSEエンドポイント
    app.get('/mcp', (req, res) => {
      console.log('新しいMCP SSE接続を受信しました');
      try {
        const transport = new SSEServerTransport('/mcp-messages', res);
        transports[transport.sessionId] = transport;
        
        // SSEセッションが閉じられたらトランスポートを削除
        res.on('close', () => {
          console.log(`SSEセッションが閉じられました: ${transport.sessionId}`);
          delete transports[transport.sessionId];
        });
        
        // MCPサーバーとトランスポートを接続
        // connect()は内部でstart()を呼び出すので、個別にstart()を呼び出す必要はない
        mcpServer.connect(transport).then(() => {
          console.log(`MCPサーバーがトランスポートに接続されました: ${transport.sessionId}`);
        }).catch(err => {
          console.error('MCPサーバー接続エラー:', err);
        });
      } catch (error) {
        console.error('MCP SSE接続エラー:', error);
        res.status(500).send('MCP SSE接続エラー');
      }
    });

    // MCPメッセージ受信エンドポイント
    app.post('/mcp-messages', async (req, res) => {
      const sessionId = req.query.sessionId as string;
      console.log(`MCPメッセージを受信しました, セッションID: ${sessionId}`);
      
      const transport = transports[sessionId];
      if (transport) {
        try {
          await transport.handlePostMessage(req, res);
        } catch (error) {
          console.error('MCPメッセージ処理エラー:', error);
          // エラーはhandlePostMessage内で処理されているため、ここではレスポンスを送信しない
        }
      } else {
        console.error(`セッションIDに対応するトランスポートが見つかりません: ${sessionId}`);
        res.status(400).send('セッションIDに対応するトランスポートが見つかりません');
      }
    });
    
    // Expressサーバーの作成
    const httpServer = app.listen(port, host, () => {
      console.log(`サーバーが起動しました: http://${host}:${port}`);
      console.log(`APIエンドポイント: http://${host}:${port}/api`);
      console.log(`MCPエンドポイント: http://${host}:${port}/mcp`);
      console.log(`MCP Webフォーム: http://${host}:${port}/`);
    });

    // フロントエンドのHTMLを提供
    app.get('/', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>株価取得テスト</title>
            <meta charset="utf-8">
            <style>
              body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
              pre { background: #f4f4f4; padding: 10px; border-radius: 4px; }
              .tabs { display: flex; margin-bottom: 20px; }
              .tab { padding: 10px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px 4px 0 0; }
              .tab.active { background: #f4f4f4; border-bottom: none; }
              .panel { display: none; padding: 20px; border: 1px solid #ccc; }
              .panel.active { display: block; }
            </style>
          </head>
          <body>
            <h1>株価API テスト</h1>
            
            <div class="tabs">
              <div class="tab active" data-target="single">単一銘柄取得</div>
              <div class="tab" data-target="multiple">複数銘柄取得</div>
              <div class="tab" data-target="analysis">株価分析</div>
              <div class="tab" data-target="mcp">MCPテスト</div>
            </div>
            
            <div id="single" class="panel active">
              <h2>単一銘柄の株価取得</h2>
              <form id="singleForm">
                <label for="symbol">銘柄コード:</label>
                <input type="text" id="symbol" name="symbol" value="AAPL" required>
                <button type="submit">取得</button>
              </form>
              <h3>結果:</h3>
              <pre id="singleResult">ここに結果が表示されます</pre>
            </div>
            
            <div id="multiple" class="panel">
              <h2>複数銘柄の株価取得</h2>
              <form id="multipleForm">
                <label for="symbols">銘柄コード (カンマ区切り):</label>
                <input type="text" id="symbols" name="symbols" value="AAPL,MSFT,GOOGL" required>
                <button type="submit">取得</button>
              </form>
              <h3>結果:</h3>
              <pre id="multipleResult">ここに結果が表示されます</pre>
            </div>
            
            <div id="analysis" class="panel">
              <h2>株価分析</h2>
              <form id="analysisForm">
                <label for="analysisSymbol">銘柄コード:</label>
                <input type="text" id="analysisSymbol" name="symbol" value="AAPL" required>
                <button type="submit">分析</button>
              </form>
              <h3>結果:</h3>
              <pre id="analysisResult">ここに結果が表示されます</pre>
            </div>
            
            <div id="mcp" class="panel">
              <h2>MCPテスト</h2>
              <p>MCPサーバーに接続して、利用可能なツールを取得します</p>
              <button id="mcpConnect">接続</button>
              <button id="mcpToolsList" disabled>ツール一覧取得</button>
              
              <div id="mcpToolForm" style="display: none; margin-top: 20px;">
                <h3>ツール呼び出し:</h3>
                <form id="toolCallForm">
                  <div>
                    <label for="toolName">ツール名:</label>
                    <select id="toolName" required></select>
                  </div>
                  <div id="toolParams" style="margin-top: 10px;">
                    <!-- パラメータフォームが動的に追加されます -->
                  </div>
                  <button type="submit" style="margin-top: 10px;">実行</button>
                </form>
              </div>
              
              <h3>ログ:</h3>
              <pre id="mcpLog" style="height: 200px; overflow-y: scroll;">MCPログがここに表示されます</pre>
            </div>
            
            <script>
              // タブ切り替え
              document.querySelectorAll('.tab').forEach(tab => {
                tab.addEventListener('click', () => {
                  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
                  
                  tab.classList.add('active');
                  document.getElementById(tab.dataset.target).classList.add('active');
                });
              });
              
              // 単一銘柄フォーム
              document.getElementById('singleForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const symbol = document.getElementById('symbol').value;
                const resultEl = document.getElementById('singleResult');
                
                try {
                  resultEl.textContent = '読み込み中...';
                  const response = await fetch('/api/stocks/price', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ symbol })
                  });
                  
                  const data = await response.json();
                  resultEl.textContent = JSON.stringify(data, null, 2);
                } catch (err) {
                  resultEl.textContent = 'エラーが発生しました: ' + err.message;
                }
              });
              
              // 複数銘柄フォーム
              document.getElementById('multipleForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const symbols = document.getElementById('symbols').value.split(',').map(s => s.trim());
                const resultEl = document.getElementById('multipleResult');
                
                try {
                  resultEl.textContent = '読み込み中...';
                  const response = await fetch('/api/stocks/batch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ symbols })
                  });
                  
                  const data = await response.json();
                  resultEl.textContent = JSON.stringify(data, null, 2);
                } catch (err) {
                  resultEl.textContent = 'エラーが発生しました: ' + err.message;
                }
              });
              
              // 分析フォーム
              document.getElementById('analysisForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const symbol = document.getElementById('analysisSymbol').value;
                const resultEl = document.getElementById('analysisResult');
                
                try {
                  resultEl.textContent = '分析中...';
                  const response = await fetch('/api/stocks/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ symbol })
                  });
                  
                  const data = await response.json();
                  resultEl.textContent = JSON.stringify(data, null, 2);
                } catch (err) {
                  resultEl.textContent = 'エラーが発生しました: ' + err.message;
                }
              });
              
              // MCPクライアント
              let mcpSessionId = null;
              let mcpEventSource = null;
              let messageId = 1;
              let tools = [];
              
              const mcpLog = document.getElementById('mcpLog');
              const logMessage = (msg) => {
                mcpLog.textContent += '\\n' + msg;
                mcpLog.scrollTop = mcpLog.scrollHeight;
              };
              
              document.getElementById('mcpConnect').addEventListener('click', async () => {
                if (mcpEventSource) {
                  mcpEventSource.close();
                }
                
                logMessage('MCPサーバーに接続中...');
                
                // SSE接続を開始
                mcpEventSource = new EventSource('/mcp');
                
                mcpEventSource.addEventListener('endpoint', (e) => {
                  const endpoint = decodeURI(e.data);
                  const [url, params] = endpoint.split('?');
                  const urlParams = new URLSearchParams(params);
                  mcpSessionId = urlParams.get('sessionId');
                  
                  logMessage('接続成功: セッションID = ' + mcpSessionId);
                  document.getElementById('mcpToolsList').disabled = false;
                  
                  // initialize呼び出し
                  sendMcpRequest({
                    jsonrpc: '2.0',
                    id: messageId++,
                    method: 'initialize',
                    params: {
                      protocolVersion: '0.3',
                      clientInfo: {
                        name: 'WebTestClient',
                        version: '1.0.0'
                      },
                      capabilities: {}
                    }
                  });
                });
                
                mcpEventSource.addEventListener('message', (e) => {
                  const message = JSON.parse(e.data);
                  logMessage('受信: ' + JSON.stringify(message, null, 2));
                  
                  // initialize応答を処理
                  if (message.result && message.id === 1) {
                    sendMcpRequest({
                      jsonrpc: '2.0',
                      method: 'initialized'
                    });
                  }
                });
                
                mcpEventSource.onerror = () => {
                  logMessage('SSE接続エラー');
                };
              });
              
              async function sendMcpRequest(request) {
                if (!mcpSessionId) {
                  logMessage('エラー: セッションIDがありません');
                  return;
                }
                
                logMessage('送信: ' + JSON.stringify(request, null, 2));
                
                try {
                  const response = await fetch('/mcp-messages?sessionId=' + mcpSessionId, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(request)
                  });
                  
                  if (!response.ok) {
                    throw new Error('HTTP error: ' + response.status);
                  }
                } catch (err) {
                  logMessage('リクエストエラー: ' + err.message);
                }
              }
              
              // ツール一覧取得
              document.getElementById('mcpToolsList').addEventListener('click', () => {
                sendMcpRequest({
                  jsonrpc: '2.0',
                  id: messageId++,
                  method: 'tools/list',
                  params: {}
                });
              });
              
              // ツール呼び出しフォーム
              document.getElementById('toolCallForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const toolName = document.getElementById('toolName').value;
                const tool = tools.find(t => t.name === toolName);
                const params = {};
                
                // フォームからパラメータを収集
                for (const param of Object.keys(tool.parameters)) {
                  const inputEl = document.getElementById('param-' + param);
                  if (inputEl) {
                    // 数値パラメータの場合は変換
                    const paramType = tool.parameters[param].type;
                    params[param] = paramType === 'number' ? Number(inputEl.value) : inputEl.value;
                  }
                }
                
                sendMcpRequest({
                  jsonrpc: '2.0',
                  id: messageId++,
                  method: 'tools/call',
                  params: {
                    name: toolName,
                    parameters: params
                  }
                });
              });
            </script>
          </body>
        </html>
      `);
    });

    // 終了処理
    const gracefulShutdown = async () => {
      console.log('サーバーをシャットダウンしています...');
      try {
        // mcpServerが存在する場合のみclose()を呼び出す
        if (mcpServer) {
          await mcpServer.close();
        }
        if (httpServer) {
          httpServer.close(() => {
            console.log('サーバーが停止しました');
            process.exit(0);
          });
        } else {
          console.log('サーバーが停止しました');
          process.exit(0);
        }
      } catch (error) {
        console.error('シャットダウンエラー:', error);
        process.exit(1);
      }
    };

    // シグナルハンドラの設定
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);

    console.log('サーバーの設定が完了しました。');
    return httpServer;
  } catch (error) {
    console.error('サーバー起動エラー:', error);
    process.exit(1);
  }
}

// スタンドアロンで実行された場合は自動的にサーバーを起動
if (process.argv[1] === import.meta.url.substring(8) || process.argv[1] === 'dist/index.js' || process.argv[1].includes('index.js')) {
  console.log('スタンドアロンモードでサーバーを起動します...');
  console.log(`実行ファイル: ${process.argv[1]}`);
  console.log(`import.meta.url: ${import.meta.url}`);
  
  startServer().then((server) => {
    console.log('サーバーが正常に起動しました。Ctrl+Cで終了できます。');
  }).catch((error) => {
    console.error('サーバー起動に失敗しました:', error);
    process.exit(1);
  });
} else {
  console.log('モジュールとしてインポートされました。');
  console.log(`実行ファイル: ${process.argv[1]}`);
  console.log(`import.meta.url: ${import.meta.url}`);
  
  // 開発環境やテスト環境では明示的にstartServerを呼び出す
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    console.log('開発環境のため自動的にサーバーを起動します...');
    startServer().then((server) => {
      console.log('サーバーが正常に起動しました。Ctrl+Cで終了できます。');
    }).catch((error) => {
      console.error('サーバー起動に失敗しました:', error);
      process.exit(1);
    });
  }
}