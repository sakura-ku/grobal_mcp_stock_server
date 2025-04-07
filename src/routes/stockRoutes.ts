import { Router, RequestHandler } from 'express';
import { stockService } from '../services/stockService.js';
import { InvalidParameterError } from '../errors/index.js';

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
    console.error('株価API呼び出しエラー:', error);
    
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
    console.error('一括株価API呼び出しエラー:', error);
    
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
    console.error('株価分析API呼び出しエラー:', error);
    
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
    console.error('株価API呼び出しエラー:', error);
    
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
stockRouter.get('/:symbol', getStockBySymbolHandler);

export default stockRouter; 