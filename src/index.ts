import { createMcpServer } from '@modelcontextprotocol/sdk';

// サーバー設定
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const HOST = process.env.HOST || 'localhost';

// MCPサーバーインスタンスの作成
const server = createMcpServer({
  // サーバーの説明情報
  info: {
    title: 'Global Stock MCP Server',
    description: '株式市場データと分析のためのMCPサーバー',
    version: '1.0.0',
  },
});

// ツールを登録する場所
// 例: server.registerTool('get_stock_price', getStockPrice);

// サーバー起動
server.listen(PORT, HOST, () => {
  console.log(`MCP Server is running at http://${HOST}:${PORT}`);
  console.log('Press Ctrl+C to stop the server');
});

// 終了ハンドラ
const handleShutdown = () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
};

// シグナルハンドラの設定
process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);