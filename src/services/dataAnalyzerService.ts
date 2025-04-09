import { openaiService } from './openaiService.js';
import { logger } from '../utils/logger.js';
import { ExternalApiError } from '../errors/index.js';
import { z } from 'zod';

/**
 * 分析結果の基本構造
 */
export interface AnalysisResult<T = any> {
  content: string;           // テキスト形式の分析結果
  executedCode?: string;     // 実行されたPythonコード
  structuredData?: T;        // 構造化されたJSON分析結果
  rawResponse?: any;         // デバッグ用の完全なレスポンス
}

/**
 * データ分析LLMサービスクラス
 * OpenAI CodeInterpreterを使用してデータ分析を行います
 */
class DataAnalyzerService {
  private static instance: DataAnalyzerService;
  
  /**
   * シングルトンパターン用のプライベートコンストラクタ
   */
  private constructor() {}
  
  /**
   * DataAnalyzerServiceのシングルトンインスタンスを取得します
   * @returns DataAnalyzerServiceのインスタンス
   */
  public static getInstance(): DataAnalyzerService {
    if (!DataAnalyzerService.instance) {
      DataAnalyzerService.instance = new DataAnalyzerService();
    }
    return DataAnalyzerService.instance;
  }
  
  /**
   * データを分析して結果を返します
   * @param data 分析対象データ
   * @param instructions 分析指示
   * @param expectedSchema 期待する結果のスキーマ（オプション）
   * @returns 分析結果
   */
  public async analyzeData<T = any>(
    data: any, 
    instructions: string,
    expectedSchema?: z.ZodSchema<T>
  ): Promise<AnalysisResult<T>> {
    try {
      logger.info('データ分析開始');
      
      const systemPrompt = `あなたは金融データ分析アシスタントです。以下の指示に従ってください：
1. 提供されたデータをPythonコードで分析してください
2. 分析結果を構造化されたJSONオブジェクトとして作成してください
3. 実行の最後にjson.dumps()を使用してJSONを出力してください
4. 分析は客観的かつ正確に行い、事実に基づいた洞察を提供してください`;
      
      const userPrompt = `以下のデータを分析してください：\n${JSON.stringify(data)}\n\n指示: ${instructions}`;
      
      const response = await openaiService.createCodeInterpreterCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]);
      
      // 応答から必要な情報を抽出
      const message = response.choices[0].message;
      const content = message.content || "";
      
      // CodeInterpreterの入力コードを取得
      let executedCode: string | undefined = undefined;
      
      if (message.tool_calls && message.tool_calls.length > 0) {
        const toolCall = message.tool_calls[0];
        if (toolCall.type === 'function' && toolCall.function.name === 'code_interpreter') {
          executedCode = toolCall.function.arguments || undefined;
        }
      }
      
      // 構造化データを抽出
      const structuredData = openaiService.extractJsonFromCodeInterpreter<T>(response);
      
      // 環境に応じて詳細レスポンスを含める
      const rawResponse = process.env.NODE_ENV === 'development' ? response : undefined;
      
      // スキーマが指定されていれば検証
      if (expectedSchema && structuredData) {
        try {
          // データをスキーマで検証
          expectedSchema.parse(structuredData);
        } catch (error) {
          logger.warn('構造化データがスキーマに適合しません:', error);
        }
      }
      
      logger.info('データ分析完了');
      
      return {
        content,
        executedCode,
        structuredData: structuredData || undefined,
        rawResponse
      };
    } catch (error) {
      logger.error('データ分析エラー:', error);
      throw error instanceof Error
        ? new ExternalApiError('DataAnalyzer', error.message)
        : new ExternalApiError('DataAnalyzer', '予期しないエラーが発生しました');
    }
  }
  
  /**
   * 株価データを分析します
   * @param stockData 株価データ
   * @param period 分析期間
   * @param instructions 特定の分析指示
   * @returns 株価分析結果
   */
  public async analyzeStockData<T = any>(
    stockData: any,
    period: string,
    instructions: string = '株価データのトレンド分析を行い、主要な統計指標と今後の見通しを提供してください'
  ): Promise<AnalysisResult<T>> {
    try {
      // 分析指示を組み立て
      const enhancedInstructions = `
期間: ${period}の株価データを分析し、以下の観点から調査してください：
1. 価格トレンドの特定と方向性の分析
2. 主要な統計指標（平均、標準偏差、変動率など）
3. テクニカル指標の計算と解釈（RSI、MACD、ボリンジャーバンドなど）
4. サポート/レジスタンスレベルの特定
5. 将来の価格動向に関する見通し
6. リスク評価

${instructions}

結果は次の構造でJSON形式で返してください：
{
  "summary": "分析の概要",
  "trend": {
    "direction": "上昇/下降/横ばい",
    "strength": "強い/中程度/弱い",
    "keyPoints": ["重要ポイント1", "重要ポイント2"]
  },
  "statistics": {
    // 統計値
  },
  "technicalIndicators": {
    // テクニカル指標
  },
  "supportResistance": {
    // サポート/レジスタンスレベル
  },
  "forecast": {
    // 予測
  },
  "riskAssessment": {
    // リスク評価
  }
}
`;
      
      // 分析を実行
      return await this.analyzeData<T>(stockData, enhancedInstructions);
    } catch (error) {
      logger.error('株価データ分析エラー:', error);
      throw error instanceof Error
        ? error
        : new ExternalApiError('DataAnalyzer', '株価データ分析中にエラーが発生しました');
    }
  }
  
  /**
   * 複数銘柄のデータを比較分析します
   * @param stocksData 複数銘柄のデータ
   * @param metrics 分析すべき指標
   * @param instructions 特定の分析指示
   * @returns 比較分析結果
   */
  public async compareStocks<T = any>(
    stocksData: any,
    metrics: string[] = ['price', 'volume', 'volatility', 'performance'],
    instructions: string = '銘柄間の比較分析を行い、相対的なパフォーマンスと今後の見通しを評価してください'
  ): Promise<AnalysisResult<T>> {
    try {
      // 分析指示を組み立て
      const enhancedInstructions = `
複数銘柄（${Object.keys(stocksData).length}銘柄）の比較分析を行い、次の指標について評価してください：
${metrics.map(m => `- ${m}`).join('\n')}

具体的な分析内容：
1. 各銘柄の相対的なパフォーマンス評価
2. 相関関係の分析
3. ボラティリティと安定性の比較
4. リスク調整後リターンの計算
5. 業界/セクター平均との比較（可能な場合）
6. 投資判断の提案

${instructions}

結果は次の構造でJSON形式で返してください：
{
  "summary": "比較分析の概要",
  "individualAssessments": {
    // 各銘柄の評価
  },
  "comparisonMetrics": {
    // 比較指標
  },
  "correlationMatrix": [
    // 相関行列
  ],
  "rankings": {
    // 各指標におけるランキング
  },
  "recommendations": {
    // 投資推奨
  }
}
`;
      
      // 分析を実行
      return await this.analyzeData<T>(stocksData, enhancedInstructions);
    } catch (error) {
      logger.error('株価比較分析エラー:', error);
      throw error instanceof Error
        ? error
        : new ExternalApiError('DataAnalyzer', '株価比較分析中にエラーが発生しました');
    }
  }
  
  /**
   * ポートフォリオ分析を行います
   * @param portfolioData ポートフォリオデータ
   * @param riskFreeRate リスクフリーレート
   * @param instructions 特定の分析指示
   * @returns ポートフォリオ分析結果
   */
  public async analyzePortfolio<T = any>(
    portfolioData: any,
    riskFreeRate: number = 0.01,
    instructions: string = 'ポートフォリオの総合評価、リスク分析、および最適化提案を行ってください'
  ): Promise<AnalysisResult<T>> {
    try {
      // 分析指示を組み立て
      const enhancedInstructions = `
ポートフォリオ分析を行い、以下の観点から評価してください：
1. 総合パフォーマンス評価
2. リスク指標（標準偏差、シャープレシオ、最大ドローダウンなど）
3. セクター配分と多様化の評価
4. 個別銘柄の貢献度分析
5. リスク調整後リターンの計算（リスクフリーレート=${riskFreeRate}を使用）
6. 最適化提案

${instructions}

結果は次の構造でJSON形式で返してください：
{
  "summary": "ポートフォリオ分析の概要",
  "performanceMetrics": {
    // パフォーマンス指標
  },
  "riskMetrics": {
    // リスク指標
  },
  "allocation": {
    // 資産配分分析
  },
  "diversification": {
    // 多様化の評価
  },
  "contributors": {
    // 主要貢献銘柄
  },
  "optimizationSuggestions": {
    // 最適化提案
  }
}
`;
      
      // 分析を実行
      return await this.analyzeData<T>(portfolioData, enhancedInstructions);
    } catch (error) {
      logger.error('ポートフォリオ分析エラー:', error);
      throw error instanceof Error
        ? error
        : new ExternalApiError('DataAnalyzer', 'ポートフォリオ分析中にエラーが発生しました');
    }
  }
}

// シングルトンインスタンスとしてエクスポート
export const dataAnalyzerService = DataAnalyzerService.getInstance(); 