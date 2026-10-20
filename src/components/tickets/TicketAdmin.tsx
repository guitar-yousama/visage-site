"use client";
import { useEffect, useState, type FormEvent } from "react";
import {
  jst,
  eventState,
  statusLabels,
  type MailJob,
  type Reservation,
  type TicketEvent,
  type TicketPerformance,
} from "@/lib/tickets/domain";
import styles from "./tickets.module.css";
type Listing = {
  rows: Reservation[];
  stats: { count: number; quantity: number; pending: number };
  mail: { state: string; count: number }[];
};
async function api(path: string, method = "GET", body?: unknown) {
  const r = await fetch("/api/tickets/" + path, {
    method,
    cache: "no-store",
    ...(body
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const v = await r.json();
  if (!r.ok)
    throw Error(
      r.status === 401 && path !== "login"
        ? "ログインしてください。"
        : (v.error ?? "処理できませんでした。"),
    );
  return v;
}
const message = (e: unknown) =>
  e instanceof Error ? e.message : "処理できませんでした。";
export function TicketAdmin() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [performances, setPerformances] = useState<TicketPerformance[]>([]);
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<{
    reservation: Reservation;
    jobs: MailJob[];
  } | null>(null);
  const [eventEdit, setEventEdit] = useState<TicketEvent | null | undefined>(
    undefined,
  );
  const [logs, setLogs] = useState<
    | {
        action: string;
        target_id: string;
        created_at: string;
        admin_id: string;
      }[]
    | null
  >(null);
  const [refresh, setRefresh] = useState(0);
  const query = new URLSearchParams({
    eventId: filter,
    status,
    search,
    page: String(page),
  }).toString();
  useEffect(() => {
    let active = true;
    api("session")
      .then((v) => {
        if (active) setAuthed(v.authenticated);
      })
      .catch((e) => {
        if (active) {
          setAuthed(false);
          setError(message(e));
        }
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!authed) return;
    let active = true;
    Promise.all([api("admin/events"), api("admin/reservations?" + query)])
      .then(([e, r]) => {
        if (active) {
          setEvents(e.events);
          setPerformances(e.performances);
          setListing(r);
        }
      })
      .catch((e) => {
        if (active) {
          setError(message(e));
          if (message(e) === "ログインしてください。") {
            setAuthed(false);
            setDetail(null);
            setListing(null);
            setLogs(null);
          }
        }
      });
    return () => {
      active = false;
    };
  }, [authed, query, refresh]);
  function report(error: unknown) {
    setError(message(error));
    if (message(error) === "ログインしてください。") {
      setAuthed(false);
      setDetail(null);
      setListing(null);
      setLogs(null);
      setEvents([]);
      setEventEdit(undefined);
    }
  }
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await api("login", "POST", {
        id: f.get("id"),
        password: f.get("password"),
      });
      setAuthed(true);
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    try {
      await api("logout", "POST", {});
      setAuthed(false);
      setListing(null);
      setDetail(null);
      setLogs(null);
      setEvents([]);
      setEventEdit(undefined);
    } catch (e) {
      report(e);
    }
  }
  async function open(id: string) {
    setError("");
    try {
      setDetail(await api("admin/reservations/" + id));
    } catch (e) {
      report(e);
    }
  }
  async function act(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await task();
      setRefresh((n) => n + 1);
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  if (authed === null) return <p role="status">認証状態を確認しています。</p>;
  return (
    <div className={styles.shell}>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {!authed ? (
        <>
          <h2>管理者ログイン</h2>
          <form className={styles.form} onSubmit={login}>
            <label>
              ログインID
              <input
                name="id"
                autoComplete="username"
                maxLength={100}
                required
              />
            </label>
            <label>
              パスワード
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                maxLength={200}
                required
              />
            </label>
            <button disabled={busy}>
              {busy ? "認証しています…" : "ログイン"}
            </button>
          </form>
        </>
      ) : (
        <>
          <div className={styles.actions}>
            <button onClick={logout}>ログアウト</button>
            <button
              onClick={() => {
                setEventEdit(null);
                setDetail(null);
              }}
            >
              受付設定を追加
            </button>
            <button
              onClick={() =>
                void act(async () => {
                  setLogs((await api("admin/logs")).logs);
                })
              }
            >
              管理操作ログ
            </button>
            <button onClick={() => setRefresh((n) => n + 1)}>再読み込み</button>
          </div>
          <div className={styles.filters}>
            <label>
              公演
              <select
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">すべての公演</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              ステータス
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">すべて</option>
                {Object.entries(statusLabels).map(([s, label]) => (
                  <option key={s} value={s}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <form
            className={styles.filters}
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(
                String(new FormData(e.currentTarget).get("search") ?? ""),
              );
              setPage(1);
            }}
          >
            <label>
              名前・メールアドレス・受付番号
              <input name="search" type="search" maxLength={100} />
            </label>
            <button>検索</button>
          </form>
          {listing && (
            <>
              <div className={styles.stats}>
                <div>
                  <span>申し込み件数</span>
                  <strong>{listing.stats.count}</strong>
                </div>
                <div>
                  <span>申し込み枚数合計</span>
                  <strong>{listing.stats.quantity}</strong>
                </div>
                <div>
                  <span>未確定件数</span>
                  <strong>{listing.stats.pending}</strong>
                </div>
              </div>
              <p className={styles.mail}>
                メール状況（選択公演の全申し込み）：
                {listing.mail.length
                  ? listing.mail
                      .map((m) => `${mailLabel(m.state)} ${m.count}通`)
                      .join(" / ")
                  : "送信対象なし"}
              </p>
              <p className={styles.intro}>
                集計はキャンセルを含む申し込み全体です。論理削除済みは除きます。メールの「送信済み」はSMTPサーバーへの引き渡し完了を示します。
              </p>
              <div className={styles.actions}>
                <a
                  className={styles.button}
                  href={"/api/tickets/admin/csv?" + query}
                >
                  CSV出力
                </a>
                <span>
                  検索結果 {listing.stats.count}件 / {page}ページ
                </span>
              </div>
              <div
                className={styles.tableWrap}
                tabIndex={0}
                role="region"
                aria-label="チケット申し込み一覧（横スクロールできます）"
              >
                <table className={styles.table}>
                  <thead>
                    <tr>
                      {[
                        "申込日時",
                        "受付番号",
                        "お名前",
                        "メールアドレス",
                        "公演名",
                        "枚数",
                        "備考",
                        "ステータス",
                        "操作",
                      ].map((s) => (
                        <th scope="col" key={s}>
                          {s}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {listing.rows.map((r) => (
                      <tr key={r.id}>
                        <td>{jst(r.created_at)}</td>
                        <td>{r.receipt}</td>
                        <td>{r.name}</td>
                        <td>{r.email}</td>
                        <td>{r.event_title}</td>
                        <td>{r.quantity}</td>
                        <td>{r.notes || "—"}</td>
                        <td>{statusLabels[r.status]}</td>
                        <td>
                          <button
                            onClick={() => {
                              setEventEdit(undefined);
                              void open(r.id);
                            }}
                          >
                            詳細・編集
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!listing.rows.length && <p>該当する申し込みはありません。</p>}
              <div className={styles.actions}>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((n) => n - 1)}
                >
                  前のページ
                </button>
                <button
                  disabled={page * 30 >= listing.stats.count}
                  onClick={() => setPage((n) => n + 1)}
                >
                  次のページ
                </button>
              </div>
            </>
          )}
          {detail && (
            <section className={styles.panel} aria-label="申し込み詳細">
              <h2>申し込み詳細</h2>
              <p className={styles.receipt}>{detail.reservation.receipt}</p>
              <p>{detail.reservation.event_title}</p>
              <p className={styles.intro}>
                同意日時：{jst(detail.reservation.consent_at)} / 文言：
                {detail.reservation.consent_version}
              </p>
              <ReservationEditor
                key={detail.reservation.id + ":" + detail.reservation.version}
                reservation={detail.reservation}
                max={
                  events.find((e) => e.id === detail.reservation.event_id)
                    ?.max_quantity ?? 20
                }
                disabled={busy}
                onSave={(v) =>
                  void act(async () => {
                    await api(
                      "admin/reservations/" + detail.reservation.id,
                      "PATCH",
                      v,
                    );
                    await open(detail.reservation.id);
                  })
                }
              />
              <h3>メール送信状況</h3>
              <ul className={styles.list}>
                {detail.jobs.map((j) => (
                  <li className={styles.mail} key={j.id}>
                    {(
                      {
                        admin: "管理者通知",
                        receipt: "受付自動返信",
                        status: "ステータス変更通知",
                      } as Record<string, string>
                    )[j.kind] ?? j.kind}
                    ：{mailLabel(j.state)} / 試行 {j.attempts}回{" "}
                    {j.error_code && <small>（{j.error_code}）</small>}
                  </li>
                ))}
              </ul>
              <p className={styles.intro}>
                再送は未送信・失敗分のみです。通信切断時は、すでに届いたメールが再送される場合があります。編集前の情報を含む未送信メール（CONTENT_CHANGED）は再送対象外です。
              </p>
              <div className={styles.actions}>
                <button
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        "未送信・失敗分を再送します。すでに届いたメールが重複する可能性があります。続けますか？",
                      )
                    )
                      void act(async () => {
                        setDetail(
                          await api(
                            "admin/reservations/" +
                              detail.reservation.id +
                              "/retry",
                            "POST",
                            { confirm: true },
                          ),
                        );
                      });
                  }}
                >
                  未送信・失敗メールを再送
                </button>
                <button
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        "この申し込みを論理削除します。よろしいですか？",
                      )
                    )
                      void act(async () => {
                        await api(
                          "admin/reservations/" + detail.reservation.id,
                          "DELETE",
                          { version: detail.reservation.version },
                        );
                        setDetail(null);
                      });
                  }}
                >
                  論理削除
                </button>
                <button onClick={() => setDetail(null)}>詳細を閉じる</button>
              </div>
            </section>
          )}
          <section className={styles.panel}>
            <h2>公演管理</h2>
            <p className={styles.intro}>
              LIVEに登録された公演を選び、受付期間と枚数上限を設定してください。公演タイトル・開催日時・会場・料金はLIVEと共通です。
            </p>
            <ul className={styles.list}>
              {events.map((e) => (
                <li key={e.id}>
                  <strong>{e.title}</strong>
                  <p className={styles.intro}>
                    {jst(e.starts_at)} / {e.venue}
                    <br />
                    受付：{jst(e.opens_at)} 〜 {jst(e.closes_at)}（日本時間） /{" "}
                    {eventState(e).label} / 1申込上限{e.max_quantity}枚
                    <br />
                    総定員：{e.capacity ?? "未設定（総数制限なし）"} /
                    予約済み：{e.reserved_quantity ?? 0}枚 / 残り：
                    {e.remaining_quantity ?? "制限なし"}
                  </p>
                  <div className={styles.actions}>
                    <button
                      onClick={() => {
                        setEventEdit(e);
                        setDetail(null);
                      }}
                    >
                      受付設定を編集
                    </button>
                    <a
                      className={styles.button}
                      href={`/tickets/${e.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      フォーム確認 ↗
                    </a>
                  </div>
                  <small className={styles.intro}>公演ID：{e.id}</small>
                  {e.configuration_issue && (
                    <p className={styles.error}>{e.configuration_issue}</p>
                  )}
                </li>
              ))}
            </ul>
            {eventEdit !== undefined && (
              <EventEditor
                key={eventEdit?.id ?? "new"}
                event={eventEdit}
                performances={performances}
                configuredIds={events.map((event) => event.id)}
                disabled={busy}
                onCancel={() => setEventEdit(undefined)}
                onSave={(v) =>
                  void act(async () => {
                    await api(
                      "admin/events" + (eventEdit ? "/" + eventEdit.id : ""),
                      eventEdit ? "PATCH" : "POST",
                      v,
                    );
                    setEventEdit(undefined);
                  })
                }
              />
            )}
          </section>
          {logs && (
            <section className={styles.panel}>
              <h2>管理操作ログ（直近100件）</h2>
              <ul className={styles.list}>
                {logs.map((l, i) => (
                  <li className={styles.mail} key={i}>
                    {jst(l.created_at)} / {l.admin_id} / {l.action} /{" "}
                    {l.target_id}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
function mailLabel(state: string) {
  return (
    (
      {
        pending: "未送信",
        sending: "送信処理中",
        sent: "送信済み",
        failed: "失敗",
      } as Record<string, string>
    )[state] ?? state
  );
}
function ReservationEditor({
  reservation: r,
  max,
  disabled,
  onSave,
}: {
  reservation: Reservation;
  max: number;
  disabled: boolean;
  onSave: (v: unknown) => void;
}) {
  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        onSave({
          version: r.version,
          name: f.get("name"),
          email: f.get("email"),
          quantity: Number(f.get("quantity")),
          notes: f.get("notes"),
          status: f.get("status"),
          notify: f.get("notify") === "on",
        });
      }}
    >
      <label>
        お名前
        <input name="name" defaultValue={r.name} maxLength={100} required />
      </label>
      <label>
        メールアドレス
        <input
          type="email"
          name="email"
          defaultValue={r.email}
          maxLength={254}
          required
        />
      </label>
      <label>
        枚数
        <select name="quantity" defaultValue={r.quantity}>
          {Array.from({ length: Math.max(max, r.quantity) }, (_, i) => (
            <option key={i} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
      </label>
      <label>
        備考
        <textarea name="notes" defaultValue={r.notes} maxLength={2000} />
      </label>
      <label>
        ステータス
        <select name="status" defaultValue={r.status}>
          {Object.entries(statusLabels).map(([s, l]) => (
            <option key={s} value={s}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.checkbox}>
        <input name="notify" type="checkbox" />
        <span>ステータスが変更された場合、申込者へメールで通知する</span>
      </label>
      <button disabled={disabled}>変更を保存</button>
    </form>
  );
}
const localDate = (value?: string) =>
  value
    ? new Date(Date.parse(value) + 9 * 3600000).toISOString().slice(0, 16)
    : "";
function EventEditor({
  event: e,
  performances,
  configuredIds,
  disabled,
  onSave,
  onCancel,
}: {
  event: TicketEvent | null;
  performances: TicketPerformance[];
  configuredIds: string[];
  disabled: boolean;
  onSave: (v: unknown) => void;
  onCancel: () => void;
}) {
  const [selectedId, setSelectedId] = useState(e?.id ?? "");
  const selected = performances.find((event) => event.id === selectedId);
  return (
    <div className={styles.panel}>
      <h3>{e ? "受付設定を編集" : "受付設定を追加"}</h3>
      <p className={styles.intro}>
        公演情報はNEWS・LIVE側で管理します。ここでは受付設定だけを変更します。日時はすべて日本時間です。
      </p>
      <form
        className={styles.form}
        onSubmit={(ev) => {
          ev.preventDefault();
          const f = new FormData(ev.currentTarget);
          onSave({
            eventId: selectedId,
            version: e?.version,
            opens_at: f.get("opens_at") + ":00+09:00",
            closes_at: f.get("closes_at") + ":00+09:00",
            enabled: f.get("enabled") === "on",
            max_quantity: Number(f.get("max_quantity")),
            capacity:
              String(f.get("capacity") ?? "").trim() === ""
                ? null
                : Number(f.get("capacity")),
          });
        }}
      >
        <label>
          対象公演（LIVE）
          <select
            name="eventId"
            required
            value={selectedId}
            disabled={Boolean(e)}
            onChange={(ev) => setSelectedId(ev.target.value)}
          >
            <option value="">公演を選択してください</option>
            {performances.map((event) => (
              <option
                key={event.id}
                value={event.id}
                disabled={!e && configuredIds.includes(event.id)}
              >
                {event.title}
                {event.archived ? "（過去公演）" : ""}
                {!e && configuredIds.includes(event.id) ? "（設定済み）" : ""}
              </option>
            ))}
          </select>
        </label>
        {!performances.length && (
          <p className={styles.notice}>
            LIVEに公演を登録・公開すると、ここから選択できます。
          </p>
        )}
        {selected && (
          <div className={styles.event}>
            <h3>{selected.title}</h3>
            <dl>
              <dt>公演ID</dt>
              <dd>{selected.id}</dd>
              <dt>開催日時</dt>
              <dd>
                {selected.starts_at
                  ? jst(selected.starts_at) + "（日本時間）"
                  : "未設定"}
              </dd>
              <dt>会場</dt>
              <dd>{selected.venue}</dd>
              <dt>料金</dt>
              <dd>{selected.price || "未設定"}</dd>
              <dt>関連NEWS</dt>
              <dd>{selected.news_slugs.join(" / ") || "なし"}</dd>
            </dl>
            {selected.issues.map((issue) => (
              <p className={styles.error} key={issue}>
                {issue}
              </p>
            ))}
          </div>
        )}
        {e && !selected && (
          <p className={styles.error}>
            対応するLIVEがありません。受付は停止されています。公開側の公演IDを確認してください。
          </p>
        )}
        <label>
          受付開始（日本時間）
          <input
            name="opens_at"
            type="datetime-local"
            required
            defaultValue={localDate(e?.opens_at)}
          />
        </label>
        <label>
          受付締切（日本時間）
          <input
            name="closes_at"
            type="datetime-local"
            required
            defaultValue={localDate(e?.closes_at)}
          />
        </label>
        <label>
          1申込あたりの枚数上限
          <select name="max_quantity" defaultValue={e?.max_quantity ?? 4}>
            {Array.from({ length: 20 }, (_, i) => (
              <option key={i} value={i + 1}>
                {i + 1}枚
              </option>
            ))}
          </select>
        </label>
        <label>
          受付可能な総枚数（空欄は総数制限なし）
          <input
            type="number"
            name="capacity"
            min={1}
            max={1000000}
            step={1}
            defaultValue={e?.capacity ?? ""}
          />
        </label>
        <p className={styles.intro}>
          未確定・確定の予約を定員に算入します。キャンセル・削除済みは除外します。予約済み枚数を下回る定員は設定できません。
        </p>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={e?.enabled ?? false}
          />
          <span>予約受付を有効化（オフで手動停止・オンで再開）</span>
        </label>
        <div className={styles.actions}>
          <button
            disabled={disabled || !selected || selected.issues.length > 0}
          >
            受付設定を保存
          </button>
          <button type="button" onClick={onCancel}>
            編集を閉じる
          </button>
        </div>
      </form>
    </div>
  );
}
