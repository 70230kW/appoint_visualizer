import React, { useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "./firebase";
import { message } from "./errors";
export default function Login({ invited }) {
  const [register, setRegister] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [info, setInfo] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const d = new FormData(e.target);
    try {
      if (register) {
        const c = await createUserWithEmailAndPassword(
          auth,
          d.get("email"),
          d.get("password"),
        );
        await sendEmailVerification(c.user);
      } else
        await signInWithEmailAndPassword(
          auth,
          d.get("email"),
          d.get("password"),
        );
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth panel">
      <span className="eyebrow">WELCOME BACK</span>
      <h1>{register ? "アカウント登録" : "ログイン"}</h1>
      <p>店舗の予定を、ひと目で。</p>
      <form onSubmit={submit}>
        <label>
          メールアドレス
          <input type="email" name="email" required autoComplete="email" />
        </label>
        <label>
          パスワード
          <input
            type="password"
            name="password"
            minLength={6}
            required
            autoComplete={register ? "new-password" : "current-password"}
          />
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="primary" disabled={busy}>
          {busy ? "処理中…" : register ? "登録する" : "ログイン"}
        </button>
      </form>
      {invited && (
        <button className="link" onClick={() => setRegister(!register)}>
          {register ? "ログインに戻る" : "初めての方はこちら"}
        </button>
      )}
      <button
        className="link"
        onClick={async () => {
          const email = document.querySelector("input[name=email]").value;
          if (!email) {
            setError("メールアドレスを入力してください");
            return;
          }
          try {
            await sendPasswordResetEmail(auth, email);
            setInfo("該当アカウントがある場合、再設定メールが届きます。");
          } catch (e) {
            setError(message(e));
          }
        }}
      >
        パスワードを忘れた方
      </button>
      <p role="status">{info}</p>
    </main>
  );
}
