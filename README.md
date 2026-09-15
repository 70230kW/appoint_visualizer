# あぽびじゅ

React / Vite / Firebase による店舗別の来店予約管理アプリです。

## 実装機能

- メール／パスワード認証、メール確認後の招待受諾
- Admin / Staff と店舗単位のアクセス制御
- 7日間・1回限りの招待、失効、日次の期限切れ処理
- 来店予約の追加・編集・削除、担当者・目的・対応状況
- 1日 / 3日 / 5日 / 1週間 / 2週間 / 1か月カレンダー
- 同じ期間の予約を表示するカンバン（状態はセレクトで変更）
- 個人単位のライト／ダークテーマ保存
- スタッフ一覧と招待履歴

## 開発

Node.js 22、Java 21 推奨。

```sh
npm ci
npm ci --prefix functions
cp .env.example .env.local
npm run dev
```

Firebase Console のWebアプリ設定を `.env.local` に入力します。サービスアカウント秘密鍵を `VITE_` 変数に入れないでください。

```sh
npm test
npm run test:rules
npm run test:functions
npm run build
```

ルールとFunctionsテストは `demo-appoint` エミュレーターのみを利用します。ローカル画面からも使う場合は、同じプロジェクトIDと `VITE_USE_EMULATORS=true` を設定し、`npx firebase emulators:start --only auth,firestore,functions --project demo-appoint` を別ターミナルで起動します。

## 初回導入

1. FirebaseプロジェクトでFirestoreとAuthenticationのEmail/Passwordを有効化。
2. Firebase Consoleで最初の管理者ユーザーを作成し、メール認証を完了。
3. 信頼できる環境でApplication Default Credentialsを設定して次を実行。

```sh
node scripts/bootstrap.cjs PROJECT_ID TENANT_ID AUTH_UID '店舗名'
```

4. Webアプリ用の環境変数を設定してビルド。
5. 対象プロジェクトを明示してデプロイ。

```sh
npm run build
npx firebase deploy --project PROJECT_ID --only firestore,functions,hosting
```

6. 管理者としてログインし、店舗管理からスタッフを招待。リンクを開いた人は登録、メール認証、招待受諾の順に操作。

本リポジトリに本番FirebaseプロジェクトIDや認証情報は含めていません。Cloud Functions・Schedulerを利用可能なFirebaseプロジェクトの準備が必要です。

## 移行

元のコード・データはリポジトリに存在しませんでした。移行スクリプトはルートの `customers` / `appointments` を店舗配下へコピーするための出発点です。元データのスキーマ・担当者UID・顧客参照を確認してから利用します。まず移行先テナントとスタッフを用意してください。

```sh
node scripts/migrate.cjs PROJECT_ID TENANT_ID
# ドライラン結果とバックアップ確認後のみ
node scripts/migrate.cjs PROJECT_ID TENANT_ID --apply
```

元データは削除しません。同じIDで異なるデータが移行先に存在すれば中止し、同一データはスキップします。スタッフと認証UIDの対応は自動推定しません。運用中データは書き込みを止めてバックアップ後に移行し、件数と参照を検証してください。

## 設計上の判断と残作業

[実装メモ](docs/implementation.md) を参照してください。
