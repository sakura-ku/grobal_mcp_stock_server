import { Router } from 'express';
import stockRouter from './stockRoutes.js';

/**
 * APIルーターのインデックス
 * 各機能別ルーターをまとめる
 */
const apiRouter = Router();

// 株価関連ルーターをマウント
apiRouter.use('/stocks', stockRouter);

// その他のルーター（将来拡張用）
// - 市場データルーター
// apiRouter.use('/market', marketRouter);
//
// - ポートフォリオルーター
// apiRouter.use('/portfolio', portfolioRouter);
//
// - ユーザー認証ルーター
// apiRouter.use('/auth', authRouter);

export default apiRouter; 