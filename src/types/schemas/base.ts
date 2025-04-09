import { z } from 'zod';

/**
 * 全てのスキーマの基底となるスキーマ
 * 共通のプロパティや検証ロジックはここに追加します
 */
export const BaseSchema = z.object({});
export type BaseSchemaType = z.infer<typeof BaseSchema>;

/**
 * スキーマ検証ユーティリティ関数
 * @param schema Zodスキーマ
 * @param data 検証対象データ
 * @returns 検証結果および検証済みデータまたはエラー
 */
export function validateSchema<T>(schema: z.ZodSchema, data: unknown): { 
  success: boolean; 
  data?: T; 
  error?: string 
} {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData as T };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: JSON.stringify(error.errors, null, 2) 
      };
    }
    return { success: false, error: String(error) };
  }
}

/**
 * スキーマの部分的な検証ユーティリティ関数
 * 渡されたデータの一部のみを検証します（不足しているフィールドはエラーにしない）
 * @param schema Zodスキーマ
 * @param data 検証対象データ
 * @returns 検証結果および検証済みデータまたはエラー
 */
export function validatePartialSchema<T>(schema: z.ZodObject<any>, data: unknown): {
  success: boolean;
  data?: Partial<T>;
  error?: string;
} {
  try {
    // .partial()を使用して全てのフィールドをオプショナルにする
    const partialSchema = schema.partial();
    const validatedData = partialSchema.parse(data);
    return { success: true, data: validatedData as Partial<T> };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: JSON.stringify(error.errors, null, 2) 
      };
    }
    return { success: false, error: String(error) };
  }
}

/**
 * スキーマレジストリ型定義
 * アプリケーション内で利用可能な全てのスキーマを管理します
 */
export type SchemaRegistry = Record<string, z.ZodSchema>;

/**
 * スキーマインポート関数
 * 指定された名前のスキーマを取得します
 * @param schemaName スキーマ名
 * @param registry スキーマレジストリ
 * @returns 対応するZodスキーマまたはnull
 */
export function getSchema(schemaName: string, registry: SchemaRegistry): z.ZodSchema | null {
  return registry[schemaName] || null;
} 