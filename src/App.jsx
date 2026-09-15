import React, { useEffect, useState } from "react";
import { onIdTokenChanged, signOut } from "firebase/auth";
import { CalendarDays, Sun, Moon, LogOut } from "lucide-react";
import { auth, configured } from "./firebase";
import { message } from "./errors";
import Login from "./Login";
import Accept from "./Accept";
import Workspace from "./Workspace";
export default function App() {
  const [session, setSession] = useState(null),
    [loading, setLoading] = useState(configured),
    [error, setError] = useState("");
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
      {!configured ? (
        <main className="auth panel">
          <h1>あぽびじゅへようこそ</h1>
          <p>接続設定が完了していません。管理者にお問い合わせください。</p>
        </main>
      ) : loading ? (
        <main>読み込み中…</main>
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
          <h1>店舗への招待をお待ちください</h1>
          <p>管理者から届いた招待リンクを開くと利用を開始できます。</p>
          <button
            onClick={() =>
              session.user.getIdToken(true).catch((e) => setError(message(e)))
            }
          >
            所属情報を更新
          </button>
        </main>
      )}
    </>
  );
}
