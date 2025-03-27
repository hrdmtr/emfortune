# EMFortune - 心理占いアプリケーション

TwitterのOAuth連携を活用した心理占いウェブアプリケーションです。簡単な質問に答えるだけで、あなたの性格や適性を診断します。

## 特徴

- 画像選択式の簡単な質問フォーム
- 性格タイプと詳細な診断結果
- 仕事の適性や対人関係の相性診断
- Twitter（X）へ結果のシェア機能
- モバイルフレンドリーなレスポンシブデザイン

## 技術構成

- フロントエンド: HTML, CSS, JavaScript
- バックエンド: Node.js, Express
- テンプレートエンジン: EJS
- 将来的な機能: Twitter OAuth認証, ユーザー履歴管理

## 使い方

1. ホームページから「占いを始める」をクリック
2. 表示される質問に対して、最も自分に当てはまる選択肢を選択
3. 「結果を見る」ボタンをクリックして診断結果を確認
4. 結果をTwitterでシェア、または「もう一度占う」で再度診断を行う

## 開発セットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm start
```

## デプロイ方法 (Render.com)

このプロジェクトはRender.comに簡単にデプロイできます：

1. GitHubにリポジトリをプッシュします
2. [Render.com](https://render.com)にアカウント登録/ログインします
3. ダッシュボードから「New +」→「Web Service」を選択します
4. GitHubリポジトリに接続します
5. 以下の設定を行います：
   - Name: emfortune（任意）
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `node index.js`
6. 「Create Web Service」をクリックしてデプロイを開始します

または、リポジトリのルートにある `render.yaml` ファイルを使用して、「Blueprint」からデプロイすることもできます。

## 今後の開発計画

- Twitter OAuth連携
- 複数の質問セットの追加
- ユーザーアカウント管理
- 診断履歴の保存と分析
- より詳細な相性診断の実装

## ライセンス

ISC

## 制作者

EMFortune Team