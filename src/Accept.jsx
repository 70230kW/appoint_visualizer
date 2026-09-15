import React, { useEffect, useState } from "react";
import { sendEmailVerification } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import { message } from "./errors";
export default function Accept({ session, invite }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [info, setInfo] = useState("");
  async function accept(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await session.user.reload();
      await session.user.getIdToken(true);
      await httpsCallable(
        functions,
        "onInviteAccept",
      )({
        tenantId: invite.get("tenant"),
        token: invite.get("token"),
        name: new FormData(e.target).get("name"),
      });
      await session.user.getIdToken(true);
      location.hash = "";
      location.reload();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth panel">
      <h1>店舗に参加する</h1>
      <p>{session.user.email}</p>
      <p>メール認証を完了してから招待を受諾してください。</p>
      <button
        disabled={busy}
        onClick={async () => {
          try {
            await sendEmailVerification(session.user);
            setInfo("認証メールを送信しました。");
          } catch (e) {
            setError(message(e));
          }
        }}
      >
        認証メールを送信
      </button>
      <p role="status">{info}</p>
      <form onSubmit={accept}>
        <label>
          表示名
          <input name="name" required maxLength={100} />
        </label>
        <button className="primary" disabled={busy}>
          {busy ? "参加処理中…" : "招待を受諾する"}
        </button>
      </form>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </main>
  );
}
