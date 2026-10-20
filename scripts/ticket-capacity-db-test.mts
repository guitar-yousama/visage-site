// Explicit opt-in: creates and removes only its own fixture in the approved development DB.
import nextEnv from "@next/env";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { TicketService, type Database } from "../src/lib/tickets/service";
import {
  eventState,
  type TicketEvent,
  type TicketPerformance,
} from "../src/lib/tickets/domain";
nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
if (!process.argv.includes("--development-db"))
  throw Error("開発DB検証には --development-db が必要です。");
try {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(
    url.hostname,
    "ep-dawn-salad-b7oywtz6.c-13.us-east-1.aws.neon.tech",
  );
  assert.equal(url.pathname, "/neondb");
  assert.equal(url.searchParams.get("sslmode"), "verify-full");
} catch {
  console.error(
    "開発DBの接続設定を確認できません。秘密値は出力せず停止します。",
  );
  process.exit(1);
}
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 6,
  connectionTimeoutMillis: 10000,
  statement_timeout: 15000,
});
pool.on("error", () => {});
const db: Database = {
  query: async (sql, args) => (await pool.query(sql, args)).rows,
  transaction: async (fn) => {
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      const v = await fn({
        query: async (sql, args) => (await c.query(sql, args)).rows,
      });
      await c.query("COMMIT");
      return v;
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  },
};
const id = randomUUID(),
  tag = "capacity-test-" + randomUUID();
let stage = "preflight",
  beforeReservations: unknown,
  beforeEvents: unknown;
try {
  const c = await pool.connect();
  try {
    const stream = (
      c as unknown as {
        connection: { stream: { encrypted?: boolean; authorized?: boolean } };
      }
    ).connection.stream;
    assert.ok(stream.encrypted && stream.authorized);
  } finally {
    c.release();
  }
  beforeReservations = await db.query(
    "SELECT * FROM ticket_reservations ORDER BY id",
  );
  beforeEvents = await db.query("SELECT * FROM ticket_events ORDER BY id");
  assert.equal((beforeReservations as unknown[]).length, 3);
  const now = Date.now();
  const source: TicketPerformance = {
    id,
    title: "定員検証専用（架空公演）",
    starts_at: new Date(now + 86400000).toISOString(),
    venue: "検証用",
    price: "検証用",
    live_slug: "capacity-test-only",
    news_slugs: [],
    archived: false,
    issues: [],
  };
  const s = new TicketService(db, "admin@example.invalid", [source]);
  let event = (await s.saveEvent(
    {
      eventId: id,
      opens_at: new Date(now - 60000).toISOString(),
      closes_at: new Date(now + 3600000).toISOString(),
      max_quantity: 4,
      capacity: 3,
      enabled: true,
    },
    tag,
  )) as unknown as TicketEvent;
  const read = async () => (await s.events()).find((e) => e.id === id)!;
  const settings = async (capacity: number | null) => {
    event = (await s.saveEvent(
      {
        eventId: id,
        opens_at: new Date(String(event.opens_at)).toISOString(),
        closes_at: new Date(String(event.closes_at)).toISOString(),
        max_quantity: 4,
        capacity,
        enabled: true,
        version: event.version,
      },
      tag,
      id,
    )) as unknown as TicketEvent;
  };
  const submit = (quantity: number) =>
    s.submit(
      {
        eventId: id,
        name: "架空の定員検証者",
        email: randomUUID() + "@example.invalid",
        quantity,
        notes: "開発DB専用・メール送信なし",
        consent: true,
      },
      randomUUID(),
      randomUUID(),
    );
  const edit = async (
    reservationId: string,
    changes: Record<string, unknown>,
  ) => {
    const { reservation } = await s.detail(reservationId);
    await s.edit(
      reservationId,
      { ...reservation, ...changes, notify: false },
      tag,
    );
  };
  const rejects = async (fn: Promise<unknown>) =>
    assert.rejects(
      fn,
      (e: unknown) =>
        typeof e === "object" &&
        e !== null &&
        "status" in e &&
        e.status === 409,
    );
  stage = "capacity";
  const a = await submit(2);
  assert.equal((await read()).remaining_quantity, 1);
  await rejects(submit(2));
  const b = await submit(1);
  assert.equal(eventState(await read()).code, "full");
  await rejects(submit(1));
  console.log("PASS: 定員内予約・残数超過拒否・定員到達による自動受付終了");
  stage = "admin-edits";
  await rejects(edit(b.id, { quantity: 2 }));
  await rejects(settings(2));
  await edit(a.id, { status: "confirmed" });
  assert.equal((await read()).remaining_quantity, 0);
  await edit(a.id, { status: "cancelled" });
  assert.equal((await read()).remaining_quantity, 2);
  assert.equal(eventState(await read()).code, "open");
  await edit(b.id, { quantity: 3 });
  assert.equal((await read()).remaining_quantity, 0);
  await rejects(edit(a.id, { status: "pending" }));
  await edit(b.id, { quantity: 1 });
  await edit(a.id, { status: "pending" });
  assert.equal((await read()).remaining_quantity, 0);
  await s.remove(a.id, (await s.detail(a.id)).reservation.version, tag);
  assert.equal((await read()).remaining_quantity, 2);
  await edit(b.id, { status: "cancelled" });
  assert.equal((await read()).reserved_quantity, 0);
  console.log(
    "PASS: pending/confirmed算入・キャンセル/削除除外・枚数変更・復活時超過拒否・定員引下げ拒否",
  );
  stage = "concurrent-reservations";
  await settings(1);
  const race = await Promise.allSettled([submit(1), submit(1)]);
  assert.equal(race.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(
    race.filter((r) => r.status === "rejected" && r.reason?.status === 409)
      .length,
    1,
  );
  assert.equal((await read()).reserved_quantity, 1);
  console.log("PASS: 残り1枚への同時申込2件は1件だけ成功、定員超過なし");
  const winner = race.find(
    (r) => r.status === "fulfilled",
  ) as PromiseFulfilledResult<{ id: string }>;
  stage = "concurrent-edit";
  await settings(2);
  const editRace = await Promise.allSettled([
    edit(winner.value.id, { quantity: 2 }),
    submit(1),
  ]);
  assert.equal(editRace.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(
    editRace.filter((r) => r.status === "rejected" && r.reason?.status === 409)
      .length,
    1,
  );
  assert.equal((await read()).reserved_quantity, 2);
  console.log("PASS: 管理者の枚数増加と新規申込の競合でも超過なし");
  stage = "unlimited";
  await settings(null);
  await submit(4);
  assert.equal((await read()).remaining_quantity, null);
  const jobs = await db.query(
    "SELECT state,count(*)::int AS count,max(attempts)::int AS attempts,count(sent_at)::int AS sent FROM ticket_mail_jobs j JOIN ticket_reservations r ON r.id=j.reservation_id WHERE r.event_id=$1 GROUP BY state",
    [id],
  );
  // Edits/deletion intentionally invalidate old pending jobs; no SMTP attempt is permitted.
  assert.ok(jobs.some((j) => j.state === "pending"));
  assert.ok(
    jobs.every(
      (j) =>
        ["pending", "failed"].includes(String(j.state)) &&
        j.attempts === 0 &&
        j.sent === 0,
    ),
  );
  console.log(
    "PASS: 定員未設定は総数制限なし、新規メールジョブ作成・送信試行0件（編集で無効化されたジョブを含む）",
  );
} catch {
  console.error("FAIL: " + stage + "（秘密値保護のためエラー詳細は非表示）");
  process.exitCode = 1;
} finally {
  try {
    await db.transaction(async (q) => {
      await q.query("SELECT id FROM ticket_events WHERE id=$1 FOR UPDATE", [
        id,
      ]);
      await q.query(
        "DELETE FROM ticket_mail_jobs WHERE reservation_id IN (SELECT id FROM ticket_reservations WHERE event_id=$1)",
        [id],
      );
      await q.query("DELETE FROM ticket_reservations WHERE event_id=$1", [id]);
      await q.query("DELETE FROM ticket_events WHERE id=$1", [id]);
      await q.query("DELETE FROM ticket_audit WHERE admin_id=$1", [tag]);
    });
    if (beforeReservations) {
      assert.deepEqual(
        await db.query("SELECT * FROM ticket_reservations ORDER BY id"),
        beforeReservations,
      );
      assert.deepEqual(
        await db.query("SELECT * FROM ticket_events ORDER BY id"),
        beforeEvents,
      );
      console.log(
        "PASS: 検証専用データのみ片付け済み。既存予約3件・既存公演設定は完全一致で保持。",
      );
    }
  } catch {
    console.error(
      "検証データの片付け/既存データの照合に失敗。追加操作は停止してください。",
    );
    process.exitCode = 1;
  }
  await pool.end();
}
