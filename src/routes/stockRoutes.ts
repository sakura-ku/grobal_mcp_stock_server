import { Router, RequestHandler } from 'express';
import { stockService } from '../services/stockService.js';
import { InvalidParameterError } from '../errors/index.js';
import { logger } from '../utils/logger.js';

// 株価関連のルーターを作成
const stockRouter = Router();

/**
 * 単一銘柄の株価取得ハンドラー
 * POST /api/stocks/price
 */
const getStockPriceHandler: RequestHandler = async (req, res) => {
  try {
    const { symbol } = req.body;
    
    if (!symbol) {
      res.status(400).json({ error: '銘柄コードは必須です' });
      return;
    }
    
    const stockData = await stockService.getStockPrice(symbol);
    res.json(stockData);
  } catch (error) {
    logger.error('株価API呼び出しエラー:', error);
    
    if (error instanceof InvalidParameterError) {
      res.status(400).json({ error: error.message });
      return;
    }
    
    res.status(500).json({ error: '内部サーバーエラー' });
  }
};

/**
 * 複数銘柄の株価取得ハンドラー
 * POST /api/stocks/batch
 */
const getBatchStockPricesHandler: RequestHandler = async (req, res) => {
  try {
    const { symbols } = req.body;
    
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      res.status(400).json({ error: '有効な銘柄コードの配列が必要です' });
      return;
    }
    
    const stockDataList = await stockService.getMultipleStockPrices(symbols);
    res.json(stockDataList);
  } catch (error) {
    logger.error('一括株価API呼び出しエラー:', error);
    
    if (error instanceof InvalidParameterError) {
      res.status(400).json({ error: error.message });
      return;
    }
    
    res.status(500).json({ error: '内部サーバーエラー' });
  }
};

/**
 * 株価分析ハンドラー
 * POST /api/stocks/analyze
 */
const analyzeStockHandler: RequestHandler = async (req, res) => {
  try {
    const { symbol } = req.body;
    
    if (!symbol) {
      res.status(400).json({ error: '銘柄コードは必須です' });
      return;
    }
    
    const analysisData = await stockService.analyzeStock(symbol);
    res.json(analysisData);
  } catch (error) {
    logger.error('株価分析API呼び出しエラー:', error);
    
    if (error instanceof InvalidParameterError) {
      res.status(400).json({ error: error.message });
      return;
    }
    
    res.status(500).json({ error: '内部サーバーエラー' });
  }
};

/**
 * 個別銘柄の取得ハンドラー
 * GET /api/stocks/:symbol
 */
const getStockBySymbolHandler: RequestHandler<{ symbol: string }> = async (req, res) => {
  try {
    const { symbol } = req.params;
    
    const stockData = await stockService.getStockPrice(symbol);
    res.json(stockData);
  } catch (error) {
    logger.error('株価API呼び出しエラー:', error);
    
    if (error instanceof InvalidParameterError) {
      res.status(400).json({ error: error.message });
      return;
    }
    
    res.status(500).json({ error: '内部サーバーエラー' });
  }
};

/**
 * 株価履歴データ取得ハンドラー
 * GET /api/stocks/history/:symbol
 */
const getStockHistoryHandler: RequestHandler<{ symbol: string }> = async (req, res) => {
  try {
    const { symbol } = req.params;
    const interval = req.query.interval as 'daily' | 'weekly' | 'monthly' || 'daily';
    const range = req.query.range as string || '1mo';
    
    if (!symbol) {
      res.status(400).json({ error: '銘柄コードは必須です' });
      return;
    }
    
    // interval の妥当性チェック
    if (!['daily', 'weekly', 'monthly'].includes(interval)) {
      res.status(400).json({ error: 'intervalは daily, weekly, monthly のいずれかを指定してください' });
      return;
    }
    
    const historyData = await stockService.getStockHistory(symbol, interval, range);
    res.json(historyData);
  } catch (error) {
    logger.error('株価履歴API呼び出しエラー:', error);
    
    if (error instanceof InvalidParameterError) {
      res.status(400).json({ error: error.message });
      return;
    }
    
    res.status(500).json({ error: '内部サーバーエラー' });
  }
};

/**
 * 株価詳細情報取得ハンドラー
 * GET /api/stocks/details/:symbol
 */
const getStockDetailsHandler: RequestHandler<{ symbol: string }> = async (req, res) => {
  try {
    const { symbol } = req.params;
    
    if (!symbol) {
      res.status(400).json({ error: '銘柄コードは必須です' });
      return;
    }
    
    const detailsData = await stockService.getStockDetails(symbol);
    res.json(detailsData);
  } catch (error) {
    logger.error('株価詳細API呼び出しエラー:', error);
    
    if (error instanceof InvalidParameterError) {
      res.status(400).json({ error: error.message });
      return;
    }
    
    res.status(500).json({ error: '内部サーバーエラー' });
  }
};

/**
 * 株式検索ハンドラー
 * GET /api/stocks/search
 */
const searchStocksHandler: RequestHandler = async (req, res) => {
  try {
    const query = req.query.query as string;
    
    if (!query || query.trim().length === 0) {
      res.status(400).json({ error: '検索クエリは必須です' });
      return;
    }
    
    const searchResults = await stockService.searchStocks(query);
    res.json(searchResults);
  } catch (error) {
    logger.error('株式検索API呼び出しエラー:', error);
    
    if (error instanceof InvalidParameterError) {
      res.status(400).json({ error: error.message });
      return;
    }
    
    res.status(500).json({ error: '内部サーバーエラー' });
  }
};

/**
 * ポートフォリオ分析ハンドラー
 * POST /api/stocks/portfolio
 */
const analyzePortfolioHandler: RequestHandler = async (req, res) => {
  try {
    const { holdings } = req.body;
    
    if (!holdings || !Array.isArray(holdings) || holdings.length === 0) {
      res.status(400).json({ error: '有効な保有銘柄の配列が必要です' });
      return;
    }
    
    // holdings配列の各項目が有効か検証
    const isValid = holdings.every(h => 
      typeof h === 'object' && 
      typeof h.symbol === 'string' && 
      typeof h.quantity === 'number' && 
      h.quantity > 0
    );
    
    if (!isValid) {
      res.status(400).json({ 
        error: '各保有銘柄には symbol(文字列)と quantity(正の数値)が必要です',
        example: [
          { symbol: 'AAPL', quantity: 10, purchasePrice: 150.00 },
          { symbol: 'MSFT', quantity: 5 }
        ]
      });
      return;
    }
    
    const portfolioAnalysis = await stockService.analyzePortfolio(holdings);
    res.json(portfolioAnalysis);
  } catch (error) {
    logger.error('ポートフォリオ分析API呼び出しエラー:', error);
    
    if (error instanceof InvalidParameterError) {
      res.status(400).json({ error: error.message });
      return;
    }
    
    res.status(500).json({ error: '内部サーバーエラー' });
  }
};

/**
 * 株価トレンド分析ハンドラー
 * GET /api/stocks/trend/:symbol
 */
const analyzeStockTrendHandler: RequestHandler<{ symbol: string }> = async (req, res) => {
  try {
    const { symbol } = req.params;
    const periodParam = req.query.period as string;
    const period = periodParam ? parseInt(periodParam, 10) : 60;
    
    if (!symbol) {
      res.status(400).json({ error: '銘柄コードは必須です' });
      return;
    }
    
    if (isNaN(period) || period <= 0) {
      res.status(400).json({ error: '期間は正の整数で指定してください' });
      return;
    }
    
    const trendAnalysis = await stockService.analyzeStockTrend(symbol, period);
    res.json(trendAnalysis);
  } catch (error) {
    logger.error('株価トレンド分析API呼び出しエラー:', error);
    
    if (error instanceof InvalidParameterError) {
      res.status(400).json({ error: error.message });
      return;
    }
    
    res.status(500).json({ error: '内部サーバーエラー' });
  }
};

// ルーターにハンドラーを登録
stockRouter.post('/price', getStockPriceHandler);
stockRouter.post('/batch', getBatchStockPricesHandler);
stockRouter.post('/analyze', analyzeStockHandler);
stockRouter.post('/portfolio', analyzePortfolioHandler);

// 具体的なパスを先に登録
stockRouter.get('/history/:symbol', getStockHistoryHandler);
stockRouter.get('/details/:symbol', getStockDetailsHandler);
stockRouter.get('/search', searchStocksHandler);
stockRouter.get('/trend/:symbol', analyzeStockTrendHandler);

// 汎用的なパスを最後に登録
stockRouter.get('/:symbol', getStockBySymbolHandler);

export default stockRouter; 