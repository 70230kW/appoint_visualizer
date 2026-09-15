# Spark無料β版の導入

## 1. サイトとルールを公開

CodespacesでFirebase CLIログインを完了した状態で、リポジトリのルートから実行します。

```sh
nvm install 22
nvm use 22
npm ci
npm run deploy:spark
```

自動招待は初期状態で無効です。過去に `VITE_ENABLE_INVITES=true` を設定した場合は削除するかfalseにしてください。SparkではCloud Functionsを利用しません。

## 2. メール認証とアカウント

Firebase Console → Authentication → ログイン方法でメール／パスワードを有効化します。

Authentication → Usersから最初の管理者を追加します。初期パスワードはこのチャットやGitHubへ貼らず、対象者だけに伝えてください。対象者は公開サイトでログインし、「確認メールを送信」を押してメール内のリンクを開きます。Users一覧から対象ユーザーのUIDを控えます。

スタッフも同じ手順でアカウント作成・メール確認を行います。自動サインアップ／招待受諾は無料β版では利用しません。

## 3. 運営用の認証（初回のみ）

手動登録スクリプトはFirebase Admin SDKを使用します。**`firebase login` とAdmin SDK用の認証（ADC）は別です。** プロジェクト管理権限を持つGoogleアカウントでGoogle Cloud CLIからADCを設定してください。サービスアカウント秘密鍵の共有は不要です。

Google Cloud CLIがある環境では次を実行します。

```sh
gcloud auth application-default login --no-launch-browser
gcloud auth application-default set-quota-project appointment-visualizer
npm ci --prefix functions
```

`gcloud: command not found` の場合はGoogle Cloud CLIを導入するか、Google Cloud Shellでリポジトリを開いて実行します。CodespacesのFirebaseログインだけで以下が実行できるという意味ではありません。ADCの認証ファイル・トークンはコミットしないでください。

## 4. 最初の店舗と管理者

`AUTH_UID` を対象者のUIDに置換します。`first-store` は店舗識別子、最後の2項目は管理者の表示名と店舗名です。

```sh
npm run provision -- appointment-visualizer first-store AUTH_UID Admin '管理者名' '店舗名'
```

## 5. スタッフ追加

同じ店舗に追加する対象者の認証済みUIDを指定します。

```sh
npm run provision -- appointment-visualizer first-store STAFF_AUTH_UID Staff 'スタッフ名'
```

対象者はログインし直すか「所属情報を更新」を押します。管理者として追加する場合は `Staff` を `Admin` にします。既存ユーザーの権限変更・別店舗への転属はこのコマンドでは行えません。

二重実行でも人数は増えません。Claims更新のみ失敗した場合も同じコマンドで再試行できます。店舗作成はAdmin登録時だけ可能です。

## 動作確認

- 管理者: スタッフ一覧に登録済みユーザーが表示される。
- スタッフ: 予約の作成・変更・削除が可能、店舗管理は表示されない。
- 自動招待: 発行ボタンはなく、古い招待URLには停止中の案内を表示。
- 別店舗のデータにアクセスできない（Security Rulesは従来のまま）。

## Blazeへの移行

本番データの移行は不要です。`firebase.blaze.json` と保持している `functions/` を使用し、Functionsのデプロイ後に `VITE_ENABLE_INVITES=true` で再ビルドします。無料版で作った所属とClaimsは同じデータモデルです。
