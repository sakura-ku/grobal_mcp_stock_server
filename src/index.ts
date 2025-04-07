import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import express from 'express';
import { config } from './config/index.js';
import apiRouter from './routes/index.js';
import {
  getStockPriceDefinition,
  analyzeStockDefinition,
  getMultipleStockPricesDefinition
} from './tools/stockTools.js';

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

  // 株価関連ツールの登録
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

    // MCPサーバーの初期化
    const mcpServer = await setupMcpServer();

    // APIルートのマウント
    app.use('/api', apiRouter);

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
                  resultEl.textContent = '取得エラー: ' + err;
                }
              });
              
              // 複数銘柄フォーム
              document.getElementById('multipleForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const symbolsStr = document.getElementById('symbols').value;
                const symbols = symbolsStr.split(',').map(s => s.trim());
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
                  resultEl.textContent = '取得エラー: ' + err;
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
                  resultEl.textContent = '分析エラー: ' + err;
                }
              });
            </script>
          </body>
        </html>
      `);
    });

    // サーバーを起動
    const server = app.listen(port, host, () => {
      console.log(`サーバーが起動しました: http://${host}:${port}`);
      console.log(`APIエンドポイント: http://${host}:${port}/api`);
      console.log(`MCP Webフォーム: http://${host}:${port}/`);
    });

    // 終了処理
    const gracefulShutdown = async () => {
      console.log('サーバーをシャットダウンしています...');
      await mcpServer.close();
      server.close(() => {
        console.log('サーバーが停止しました');
        process.exit(0);
      });
    };

    // シグナルハンドラの設定
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);

    return server;
  } catch (error) {
    console.error('サーバー起動エラー:', error);
    process.exit(1);
  }
}

// スタンドアロンで実行された場合は自動的にサーバーを起動
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}