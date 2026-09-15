import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
const statusList = ["未対応", "対応中", "完了"];
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { message } from "./errors";
export default function AppointmentModal({
  base,
  appointment: a,
  staff,
  close,
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [close]);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const d = Object.fromEntries(new FormData(e.target));
      let customerId = a.customerId;
      if (!customerId) {
        const customer = await addDoc(collection(db, base, "customers"), {
          name: d.customerName,
          contact: "",
          memo: "",
        });
        customerId = customer.id;
      }
      const data = {
        ...d,
        customerId,
        datetime: Timestamp.fromDate(new Date(d.datetime)),
      };
      if (a.id) await updateDoc(doc(db, base, "appointments", a.id), data);
      else await addDoc(collection(db, base, "appointments"), data);
      close();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="overlay">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="panel modal"
      >
        <h2 id="modal-title">{a.id ? "予約を編集" : "新しい予約"}</h2>
        <form onSubmit={save}>
          <label>
            お客様名
            <input
              autoFocus
              required
              name="customerName"
              maxLength={100}
              defaultValue={a.customerName}
            />
          </label>
          <label>
            車種
            <input
              name="vehicleName"
              maxLength={100}
              defaultValue={a.vehicleName}
            />
          </label>
          <div className="form-row">
            <label>
              来店目的
              <select name="reason" defaultValue={a.reason || "試乗"}>
                {["試乗", "商談", "車検"].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label>
              担当者
              <select
                name="staffId"
                required
                defaultValue={a.staffId || staff[0]?.id}
              >
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            来店日時
            <input
              type="datetime-local"
              name="datetime"
              required
              defaultValue={dayjs(a.datetime?.toDate() || new Date()).format(
                "YYYY-MM-DDTHH:mm",
              )}
            />
          </label>
          <label>
            対応状況
            <select name="status" defaultValue={a.status || "未対応"}>
              {statusList.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="actions">
            <button type="button" disabled={busy} onClick={close}>
              キャンセル
            </button>
            <button className="primary" disabled={busy || !staff.length}>
              {busy ? "保存中…" : "保存する"}
            </button>
          </div>
        </form>
        {a.id && (
          <button
            className="danger"
            disabled={busy}
            onClick={async () => {
              if (!confirm("この予約を削除しますか？")) return;
              setBusy(true);
              try {
                await deleteDoc(doc(db, base, "appointments", a.id));
                close();
              } catch (e) {
                setError(message(e));
                setBusy(false);
              }
            }}
          >
            予約を削除
          </button>
        )}
      </section>
    </div>
  );
}
