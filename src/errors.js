export function message(e) {
  return (
    {
      "auth/invalid-credential":
        "メールアドレスまたはパスワードを確認してください。",
      "auth/email-already-in-use":
        "登録済みのメールアドレスです。ログインしてください。",
      "auth/weak-password": "パスワードは6文字以上にしてください。",
      "auth/too-many-requests": "しばらく待ってから再試行してください。",
      "permission-denied":
        "アクセス権限がありません。管理者に確認してください。",
    }[e.code] ||
    e.message ||
    "処理に失敗しました。"
  );
}
