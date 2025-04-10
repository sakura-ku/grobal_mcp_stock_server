# OpenAIServiceテストケース

## 概要
OpenAIServiceはOpenAI APIとの通信を担当するシングルトンサービスです。本テストでは、サービスの初期化と各メソッドの機能を検証します。

## シングルトンパターンのテスト
- [x] getInstance()メソッドが常に同じインスタンスを返すことを確認

## 初期化テスト
- [x] 正しいAPIキーが設定されている場合、インスタンスが正常に初期化されることを確認

## getClient()メソッドテスト
- [x] 初期化成功後、正常にクライアントインスタンスを返すことを確認

## createChatCompletion()メソッドテスト
- [x] 正常なパラメータで呼び出した場合、APIからのレスポンスが期待通りの構造で返ることを確認
- [x] APIエラー発生時、適切なExternalApiErrorがスローされることを確認

## createCodeInterpreterCompletion()メソッドテスト
- [x] 正常なメッセージで呼び出した場合、コードインタプリタを含むレスポンスが期待通りの構造で返ることを確認
- [x] APIエラー発生時、適切なExternalApiErrorがスローされることを確認

## createStructuredJsonCompletion()メソッドテスト
- [x] 正常なメッセージとJSONスキーマで呼び出した場合、構造化JSONレスポンスが期待通りの構造で返ることを確認
- [x] APIエラー発生時、適切なExternalApiErrorがスローされることを確認

## extractJsonFromCodeInterpreter()メソッドテスト
- [x] コードインタプリタの出力からJSONを正しく抽出できることを確認
- [x] JSON部分がない場合、nullを返すことを確認
- [x] 不正なJSON形式の場合、nullを返すことを確認

## 特記事項
- OpenAIのResponseについては、指定した構造通りの返却が取得できることを確認しました
- TypeScriptの型関連の問題がいくつか発生しましたが、anyキャストを使用して回避しました
- `createStructuredJsonCompletion`メソッドでは、messagesに「json」という単語を含める必要があることがわかりました
- Jest + ESM(ECMAScript Modules)環境での設定に多少の困難がありましたが、package.jsonの設定で解決しました