# あぽびじゅ — 無料β版

店舗ごとの来店予約を管理するReact / Vite / Firebaseアプリ。現在は **Firebase Sparkプラン** 用です。予約CRUD、カレンダー6期間、カンバン、店舗分離、Admin / Staff、テーマ切替を利用できます。スタッフは運営が登録します。

## 公開（Codespaces）

```sh
git pull --ff-only origin chore/firebase-project
nvm install 22
nvm use 22
npm ci
npm run deploy:spark
```

`deploy:spark` はビルド後、Firestore Rules / indexes と Hosting のみを `appointment-visualizer` に公開します。Cloud Functions・Scheduler・Cloud Buildはデプロイしません。Firebase CLIのログインが必要です。無料枠の上限は適用されます。

提供されたFirebase Web設定は組み込み済みです。フロントエンドに環境変数がなくても接続します。他プロジェクトやエミュレーター利用時は `.env.example` を参照。

## 最初の管理者・スタッフ

[無料版の導入手順](docs/spark-setup.md) を参照してください。**Webサイトの公開だけでは、店舗と所属ユーザーは作成されません。**

## 検証

Node.js 22 / Java 21を推奨します。

```sh
npm ci --prefix functions
npm test
npm run test:rules
npm run test:provision
npm run build
```

テストは `demo-appoint` エミュレーターのみで動きます。将来用の招待処理は `npm run test:functions` で検証します。

## 将来Blazeに移行する場合

1. 課金プランを変更し、`firebase.blaze.json` でFunctionsとSchedulerをデプロイ。
2. 招待処理の動作確認後、環境変数 `VITE_ENABLE_INVITES=true` を設定して `npm run deploy:blaze` を実行。
3. 自動招待の画面が有効になります。既存の店舗・スタッフ・予約・Claimsはそのまま利用できます。

現時点のデフォルトは無料版です。`firebase.json` にFunctions設定を含めていません。過去にBlazeで公開済みのFunctionsを停止する操作ではありません。本プロジェクトではFunctionsの公開は未完了でした。

## 移行と設計

旧データは提供されていません。`scripts/migrate.cjs` は既存顧客・予約をコピーするドライラン対応のテンプレートです。スタッフUID対応を確認し、バックアップを取ってから実行してください。

[詳細設計の実装メモ](docs/implementation.md) は当初のBlaze構成の記録です。無料版では本READMEと [Spark導入手順](docs/spark-setup.md) を優先してください。
