"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  CONSENT_TEXT,
  eventState,
  jst,
  type TicketEvent,
} from "@/lib/tickets/domain";
import styles from "./tickets.module.css";
export function TicketForm({ eventId, isolated = false }: { eventId?: string; isolated?: boolean }) {
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const offset = useRef(0);
  const lock = useRef(false);
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch(isolated ? "/api/tickets/isolated/events" : "/api/tickets/events", { cache: "no-store" });
        const data = await r.json();
        if (!r.ok) throw Error(data.error);
        if (!cancelled) {
          setEvents(data.events);
          offset.current = Date.parse(data.serverNow) - Date.now();
          setClock(Date.now() + offset.current);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setError(
            "公演情報を読み込めませんでした。時間をおいて再読み込みしてください。",
          );
          setLoaded(true);
        }
      }
    }
    void load();
    const timer = setInterval(() => void load(), 30000);
    const tick = setInterval(() => setClock(Date.now() + offset.current), 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
      clearInterval(tick);
    };
  }, [isolated]);
  const event = events.find((e) => e.id === eventId);
  const state = event ? eventState(event, clock) : null;
  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    fetch(isolated ? "/api/tickets/isolated/challenge" : "/api/tickets/challenge", { cache: "no-store" })
      .then(async (r) => {
        const v = await r.json();
        if (cancelled) return;
        if (r.ok) setToken(v.token);
        else setError(v.error ?? "現在受付を準備しています。");
      })
      .catch(() => {
        if (!cancelled)
          setError(
            "送信準備に失敗しました。時間をおいて再読み込みしてください。",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [eventId, isolated]);
  async function submit(form: FormData) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const r = await fetch(isolated ? "/api/tickets/isolated/reserve" : "/api/tickets/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          name: form.get("name"),
          email: form.get("email"),
          quantity: Number(form.get("quantity")),
          notes: form.get("notes"),
          consent: form.get("consent") === "on",
          website: form.get("website"),
          token,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setReceipt(data.receipt);
      setTimeout(() => resultRef.current?.focus(), 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "送信できませんでした。");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  if (receipt)
    return (
      <div className={styles.shell} ref={resultRef} tabIndex={-1} role="status">
        <h2>チケットのお申し込みを受け付けました。</h2>
        <p className={styles.intro}>
          お申し込みありがとうございます。内容を確認後、必要に応じてご連絡いたします。なお、この時点では予約確定ではありません。
        </p>
        <p className={styles.receipt}>受付番号：{receipt}</p>
        <p className={styles.intro}>
          受付番号を控えておいてください。受付メールが届かない場合も、上記の番号でお申し込みは保存されています。
        </p>
        <Link className={styles.button} href="/live">
          LIVEへ戻る
        </Link>
      </div>
    );
  return (
    <div className={styles.shell}>
      {!loaded && <p role="status">公演情報を読み込んでいます。</p>}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {loaded && !eventId && (
        <>
          <p className={styles.intro}>
            お申し込みの対象公演をお選びください。申し込み時点では予約確定ではありません。
          </p>
          <ul className={styles.list}>
            {events.map((e) => (
              <li key={e.id}>
                <h2>
                  <Link href={`/tickets/${e.id}`}>{e.title}</Link>
                </h2>
                <p>
                  {jst(e.starts_at)}（日本時間） / {e.venue}
                </p>
                <p className={styles.notice}>{eventState(e, clock).label}</p>
              </li>
            ))}
          </ul>
          {!events.length && (
            <p className={styles.notice}>
              現在ご案内できる予約受付はありません。
            </p>
          )}
        </>
      )}
      {loaded && eventId && !event && (
        <p className={styles.notice}>
          現在この公演の予約フォームはご案内できません。
          <Link href="/live">LIVE情報をご確認ください。</Link>
        </p>
      )}
      {event && (
        <>
          <div className={styles.event}>
            <h2>{event.title}</h2>
            <dl>
              <dt>開催日時</dt>
              <dd>{jst(event.starts_at)}（日本時間）</dd>
              <dt>会場</dt>
              <dd>{event.venue}</dd>
              <dt>料金</dt>
              <dd>{event.price}</dd>
              <dt>受付期間</dt>
              <dd>
                {jst(event.opens_at)} 〜 {jst(event.closes_at)}（日本時間）
              </dd>
            </dl>
            <p className={styles.notice} role="status">
              {state?.label}
            </p>
            {event.capacity != null && (
              <p className={styles.intro}>
                残り受付可能枚数：{event.remaining_quantity ?? 0}
                枚（1申込あたり最大{event.max_quantity}枚）
              </p>
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit(new FormData(e.currentTarget));
            }}
            className={styles.form}
          >
            <fieldset
              disabled={busy || state?.code !== "open"}
              className={styles.fields}
            >
              <label>
                お名前 <small>必須</small>
                <input
                  name="name"
                  autoComplete="name"
                  maxLength={100}
                  required
                />
              </label>
              <label>
                メールアドレス <small>必須</small>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                />
              </label>
              <label>
                申し込み枚数 <small>必須</small>
                <select name="quantity" required>
                  {Array.from(
                    {
                      length: Math.max(
                        1,
                        Math.min(
                          event.max_quantity,
                          event.remaining_quantity ?? event.max_quantity,
                        ),
                      ),
                    },
                    (_, i) => (
                      <option key={i} value={i + 1}>
                        {i + 1}枚
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label>
                備考 <small>任意</small>
                <textarea name="notes" maxLength={2000} rows={5} />
              </label>
              <label className={styles.trap} aria-hidden="true">
                Website
                <input
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  defaultValue=""
                />
              </label>
              <p className={styles.intro}>{CONSENT_TEXT}</p>
              <label className={styles.checkbox}>
                <input name="consent" type="checkbox" required />
                <span>上記の個人情報の取り扱いに同意する</span>
              </label>
              <button
                className={styles.button}
                type="submit"
                disabled={!token || busy || state?.code !== "open"}
              >
                {busy ? "送信しています…" : "チケットを申し込む ↗"}
              </button>
            </fieldset>
            <p className={styles.intro}>
              申し込み時点では予約確定ではありません。
            </p>
            <p role="status" className={styles.intro}>
              {busy
                ? "送信が完了するまで、このページを閉じずにお待ちください。"
                : ""}
            </p>
          </form>
        </>
      )}
    </div>
  );
}
