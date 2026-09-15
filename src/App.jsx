import React, { useEffect, useState } from "react";
import {
  onIdTokenChanged,
  signOut,
  sendEmailVerification,
} from "firebase/auth";
import { CalendarDays, Sun, Moon, LogOut } from "lucide-react";
import { auth, configured } from "./firebase";
import { message } from "./errors";
import { invitesEnabled } from "./features";
import Login from "./Login";
import Accept from "./Accept";
import Workspace from "./Workspace";
export default function App() {
  const [session, setSession] = useState(null),
    [loading, setLoading] = useState(configured),
    [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [theme, setTheme] = useState(() => {
    try {
      return (
        localStorage.getItem("theme") ||
        (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      );
    } catch {
      return "light";
    }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("theme", theme);
    } catch {}
  }, [theme]);
  useEffect(() => {
    if (!configured) return;
    return onIdTokenChanged(auth, async (user) => {
      try {
        const token = user ? await user.getIdTokenResult() : null;
        setSession(user ? { user, claims: token.claims } : null);
      } catch (e) {
        setError(message(e));
      } finally {
        setLoading(false);
      }
    });
  }, []);
  const invite = new URLSearchParams(location.hash.replace(/^#/, ""));
  return (
    <>
      <header>
        <div className="brand">
          <CalendarDays />
          <div>
            あぽびじゅ<small>APPOINTMENT VISUALIZER</small>
          </div>
        </div>
        <div className="actions">
          <button
            aria-label="テーマを切替"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          {session && (
            <button
              onClick={() => signOut(auth).catch((e) => setError(message(e)))}
            >
              <LogOut size={16} />
              ログアウト
            </button>
          )}
        </div>
      </header>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {!configured ? (
        <main className="auth panel">
          <h1>あぽびじゅへようこそ</h1>
          <p>接続設定が完了していません。管理者にお問い合わせください。</p>
        </main>
      ) : loading ? (
        <main>読み込み中…</main>
      ) : invite.has("token") && !invitesEnabled ? (
        <main className="auth panel">
          <h1>招待リンクの受付は停止中です</h1>
          <p>店舗への参加は運営担当者にお問い合わせください。</p>
          <a href="/">ログイン画面へ戻る</a>
        </main>
      ) : !session ? (
        <Login invited={invite.has("token")} />
      ) : invite.has("token") ? (
        <Accept session={session} invite={invite} />
      ) : session.claims.tenantId ? (
        <Workspace
          key={session.user.uid + session.claims.tenantId}
          session={session}
        />
      ) : (
        <main className="auth panel">
          <h1>店舗への登録をお待ちください</h1>
          <p>
            運営担当者に店舗への登録を依頼してください。登録後に所属情報を更新すると利用を開始できます。
          </p>
          <p>{session.user.email}</p>
          {!session.user.emailVerified && (
            <>
              <p>初回はメールアドレスの確認が必要です。</p>
              <button
                onClick={() =>
                  sendEmailVerification(session.user)
                    .then(() =>
                      setNotice(
                        "確認メールを送信しました。メール内のリンクを開いてください。",
                      ),
                    )
                    .catch((e) => setError(message(e)))
                }
              >
                確認メールを送信
              </button>
            </>
          )}
          <button
            onClick={() =>
              session.user
                .reload()
                .then(() => session.user.getIdToken(true))
                .catch((e) => setError(message(e)))
            }
          >
            所属情報を更新
          </button>
        </main>
      )}
    </>
  );
}
