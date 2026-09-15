import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
const statusList = ["未対応", "対応中", "完了"];
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "./firebase";
import { views, range } from "./calendar";
import { message } from "./errors";
import Admin from "./Admin";
import AppointmentModal from "./AppointmentModal";
export default function Workspace({ session }) {
  const tenantId = session.claims.tenantId,
    isAdmin = session.claims.role === "Admin";
  const [tenant, setTenant] = useState(null),
    [staff, setStaff] = useState([]),
    [appointments, setAppointments] = useState([]),
    [view, setView] = useState("1w"),
    [anchor, setAnchor] = useState(dayjs()),
    [tab, setTab] = useState("calendar"),
    [modal, setModal] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const { start, end, days } = range(anchor, view);
  const base = `tenants/${tenantId}`;
  useEffect(() => {
    const fail = (e) => setError(message(e));
    const a = onSnapshot(doc(db, base), (s) => setTenant(s.data()), fail);
    const b = onSnapshot(
      collection(db, base, "staff"),
      (s) => setStaff(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      fail,
    );
    return () => {
      a();
      b();
    };
  }, [base]);
  useEffect(() => {
    setAppointments([]);
    setLoading(true);
    return onSnapshot(
      query(
        collection(db, base, "appointments"),
        where("datetime", ">=", Timestamp.fromDate(start.toDate())),
        where("datetime", "<", Timestamp.fromDate(end.toDate())),
        orderBy("datetime"),
      ),
      (s) => {
        setAppointments(s.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (e) => {
        setError(message(e));
        setLoading(false);
      },
    );
  }, [base, start.valueOf(), end.valueOf()]);
  async function status(id, value) {
    try {
      await updateDoc(doc(db, base, "appointments", id), { status: value });
    } catch (e) {
      setError(message(e));
    }
  }
  const card = (a) => (
    <article
      key={a.id}
      className={"appointment s" + statusList.indexOf(a.status)}
    >
      <button className="card-main" onClick={() => setModal(a)}>
        <span className="time">
          {dayjs(a.datetime.toDate()).format(
            tab === "kanban" ? "M/D HH:mm" : "HH:mm",
          )}{" "}
          · {a.reason}
        </span>
        <strong>{a.customerName}</strong>
        <span>{a.vehicleName || "車種未指定"}</span>
        <small>
          {staff.find((s) => s.id === a.staffId)?.name || "担当者不明"}
        </small>
      </button>
      <select
        aria-label={`${a.customerName}の対応状況`}
        value={a.status}
        onChange={(e) => status(a.id, e.target.value)}
      >
        {statusList.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
    </article>
  );
  return (
    <main>
      <section className="heading">
        <div>
          <span className="eyebrow">YOUR WORKSPACE</span>
          <h1>{tenant?.name || "店舗"}</h1>
          <p>来店予定と対応状況をまとめて管理</p>
        </div>
        <button className="primary" onClick={() => setModal({})}>
          <Plus size={18} />
          予約を追加
        </button>
      </section>
      <nav>
        {[
          ["calendar", "カレンダー"],
          ["kanban", "カンバン"],
          ...(isAdmin ? [["admin", "店舗管理"]] : []),
        ].map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      {error && (
        <p role="alert" className="error">
          {error}
          <button onClick={() => setError("")}>閉じる</button>
        </p>
      )}
      {tab === "admin" ? (
        <Admin base={base} />
      ) : (
        <>
          <section className="toolbar">
            <div className="actions">
              <button
                aria-label="前の期間"
                onClick={() =>
                  setAnchor(
                    view === "1m"
                      ? anchor.subtract(1, "month")
                      : anchor.subtract(days.length, "day"),
                  )
                }
              >
                <ChevronLeft size={18} />
              </button>
              <button onClick={() => setAnchor(dayjs())}>今日</button>
              <button
                aria-label="次の期間"
                onClick={() =>
                  setAnchor(
                    view === "1m"
                      ? anchor.add(1, "month")
                      : anchor.add(days.length, "day"),
                  )
                }
              >
                <ChevronRight size={18} />
              </button>
              <h2>
                {start.format("YYYY年 M月D日")} —{" "}
                {end.subtract(1, "day").format("M月D日")}
              </h2>
            </div>
            {tab === "calendar" && (
              <select
                aria-label="表示期間"
                value={view}
                onChange={(e) => setView(e.target.value)}
              >
                {Object.entries(views).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            )}
          </section>
          <div className="summary">
            <span>
              期間内の予約 <b>{appointments.length}</b> 件
            </span>
            <span>
              完了{" "}
              <b>{appointments.filter((a) => a.status === "完了").length}</b> 件
            </span>
          </div>
          {loading ? (
            <p role="status">予約を読み込み中…</p>
          ) : tab === "calendar" ? (
            <div
              className="calendar"
              style={{ "--cols": view === "1m" ? 7 : Math.min(days.length, 7) }}
            >
              {view === "1m" &&
                Array.from({ length: start.day() }, (_, i) => (
                  <div key={"pad" + i} className="day padding" />
                ))}
              {days.map((d) => (
                <section
                  key={d.format("YYYY-MM-DD")}
                  className={"day " + (d.isSame(dayjs(), "day") ? "today" : "")}
                >
                  <h3>
                    {d.format("D")} <small>{d.format("dd")}</small>
                  </h3>
                  {appointments
                    .filter((a) => dayjs(a.datetime.toDate()).isSame(d, "day"))
                    .map(card)}
                </section>
              ))}
            </div>
          ) : (
            <div className="kanban">
              {statusList.map((s) => (
                <section key={s} className="column">
                  <h3>
                    {s}{" "}
                    <small>
                      {appointments.filter((a) => a.status === s).length}
                    </small>
                  </h3>
                  {appointments.filter((a) => a.status === s).map(card)}
                  {!appointments.some((a) => a.status === s) && (
                    <p className="empty">予約はありません</p>
                  )}
                </section>
              ))}
            </div>
          )}
        </>
      )}
      {modal && (
        <AppointmentModal
          base={base}
          appointment={modal}
          staff={staff}
          close={() => setModal(null)}
        />
      )}
    </main>
  );
}
