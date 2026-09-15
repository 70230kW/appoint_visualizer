# Firebase接続設定

接続先は `appointment-visualizer`。提供された公開Web SDK設定を `src/firebase-config.js` に保存しています。既定のビルドはこの設定を使用し、ホスティング側の環境変数がなくても初期化できます。

`VITE_FIREBASE_*` に値を指定すると上書きできます。異なるprojectIdやエミュレーターを使う場合、apiKey・authDomain・projectId・appIdの全4項目が必要です。空欄で本番設定と別プロジェクトが混ざることを防ぎます。

このWeb設定は管理権限を与えません。Authentication有効化、Firestore Rules、Cloud Functionsのデプロイ、初期管理者の作成は別途必要です。この環境のFirebase CLIは未認証のため、これらの本番操作は未実施です。

Firebase認証済みのCodespaces等でREADMEの初回導入を実施できます。デプロイ先のプロジェクトは `--project appointment-visualizer` で明示してください。Vercelでフロントエンドを公開する場合も、FunctionsとFirestoreのデプロイはFirebase側で必要です。
