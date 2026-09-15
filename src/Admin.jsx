import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import { collection, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "./firebase";
import { message } from "./errors";
export default function Admin({ base }) {
  const [staff, setStaff] = useState([]),
    [invites, setInvites] = useState([]),
    [role, setRole] = useState("Staff"),
    [link, setLink] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const fail = (e) => setError(message(e));
    const a = onSnapshot(
      collection(db, base, "staff"),
      (s) => setStaff(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      fail,
    );
    const b = onSnapshot(
      collection(db, base, "invites"),
      (s) => setInvites(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      fail,
    );
    return () => {
      a();
      b();
    };
  }, [base]);
  return (
    <section className="panel admin">
      <h2>スタッフ</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>名前</th>
              <th>メールアドレス</th>
              <th>権限</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.email}</td>
                <td>{s.role === "Admin" ? "管理者" : "スタッフ"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>メンバーを招待</h2>
      <p>招待リンクは7日間有効です。参加する方に個別に共有してください。</p>
      <div className="actions">
        <select
          aria-label="招待する権限"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="Staff">スタッフ</option>
          <option value="Admin">管理者</option>
        </select>
        <button
          className="primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const { data } = await httpsCallable(
                functions,
                "createInvite",
              )({ role });
              setLink(
                `${location.origin}/#tenant=${encodeURIComponent(data.tenantId)}&token=${data.token}`,
              );
            } catch (e) {
              setError(message(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          招待リンクを発行
        </button>
      </div>
      {link && (
        <label>
          招待リンク（この画面を閉じる前にコピー）
          <input readOnly value={link} onFocus={(e) => e.target.select()} />
          <button
            onClick={() =>
              navigator.clipboard
                .writeText(link)
                .catch(() => setError("リンクを選択してコピーしてください"))
            }
          >
            コピー
          </button>
        </label>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <h2>招待履歴</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>権限</th>
              <th>有効期限</th>
              <th>状態</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {invites.map((i) => {
              const expired = i.expiresAt.toMillis() <= Date.now();
              return (
                <tr key={i.id}>
                  <td>{i.role}</td>
                  <td>
                    {dayjs(i.expiresAt.toDate()).format("YYYY/MM/DD HH:mm")}
                  </td>
                  <td>
                    {i.revoked
                      ? "失効済み"
                      : i.acceptedBy
                        ? "受諾済み"
                        : expired || i.expired
                          ? "期限切れ"
                          : "未使用"}
                  </td>
                  <td>
                    {!i.used && !expired && (
                      <button
                        disabled={busy}
                        onClick={async () => {
                          setBusy(true);
                          try {
                            await httpsCallable(
                              functions,
                              "revokeInvite",
                            )({ id: i.id });
                          } catch (e) {
                            setError(message(e));
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        失効させる
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
