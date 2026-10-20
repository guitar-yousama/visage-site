import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import {
  buildPerformanceCatalogue,
  performanceId,
} from "../src/lib/tickets/catalogue";
import { PGlite } from "@electric-sql/pglite";
import {
  TicketService,
  challenge,
  checkChallenge,
  passwordHash,
  passwordMatches,
  rateLimit,
  type Database,
  type MailPayload,
} from "../src/lib/tickets/service";
import {
  CONSENT_VERSION,
  eventState,
  eventInput,
  reservationInput,
  reservationsCsv,
  type TicketEvent,
  type TicketPerformance,
} from "../src/lib/tickets/domain";

test("ticket system: PostgreSQL-compatible local emulator (NOT remote persistence/SMTP)", async (t) => {
  const pg = new PGlite();
  await pg.exec(
    await readFile(new URL("../db/tickets.sql", import.meta.url), "utf8"),
  );
  const db: Database = {
    query: async (sql, args) =>
      (await pg.query(sql, args)).rows as Record<string, unknown>[],
    transaction: (fn) =>
      pg.transaction(async (tx) =>
        fn({
          query: async (sql, args) =>
            (await tx.query(sql, args)).rows as Record<string, unknown>[],
        }),
      ),
  };
  const now = Date.now();
  const iso = (ms: number) => new Date(ms).toISOString();
  const input = {
    eventId: randomUUID(),
    title: "TEST LIVE",
    starts_at: iso(now + 86400000),
    venue: "TEST VENUE",
    price: "前売 2,000円",
    opens_at: iso(now - 3600000),
    closes_at: iso(now + 3600000),
    enabled: true,
    max_quantity: 4,
    news_slug: null,
    live_slug: null,
  };
  const catalogue: TicketPerformance[] = [
    {
      id: input.eventId,
      title: input.title,
      starts_at: input.starts_at,
      venue: input.venue,
      price: input.price,
      live_slug: "test-live",
      news_slugs: [],
      archived: false,
      issues: [],
    },
  ];
  const s = new TicketService(db, "admin@example.test", catalogue);
  let event: TicketEvent;
  let id = "";
  let version = 1;
  await t.test(
    "event creation, validation, optimistic locking and server deadline states",
    async () => {
      event = (await s.saveEvent(
        input,
        "test-admin",
      )) as unknown as TicketEvent;
      assert.equal(eventState(event, now).code, "open");
      assert.equal(eventState(event, now + 3600000).code, "closed");
      assert.equal(
        eventState({ ...event, enabled: false }, now).code,
        "paused",
      );
      assert.equal(
        eventState({ ...event, opens_at: iso(now + 1000) }, now).code,
        "before",
      );
      assert.throws(() =>
        eventInput({ ...input, closes_at: iso(now - 7200000) }),
      );
      await assert.rejects(
        s.saveEvent({ ...input, version: 999 }, "test-admin", event.id),
      );
    },
  );
  await t.test(
    "ADMIN only configures a published performance: identity and content are server-owned",
    async () => {
      assert.equal(event.id, input.eventId);
      await assert.rejects(
        s.saveEvent({ ...input, eventId: randomUUID() }, "test-admin"),
      );
      await assert.rejects(
        s.saveEvent(
          { ...input, eventId: catalogue[0].id, version: 1 },
          "test-admin",
          randomUUID(),
        ),
      );
      const saved = (await s.saveEvent(
        {
          ...input,
          version: 1,
          title: "forged",
          venue: "forged",
          price: "forged",
          starts_at: iso(now + 999999999),
        },
        "test-admin",
        event.id,
      )) as unknown as TicketEvent;
      assert.equal(saved.id, input.eventId);
      assert.equal(saved.title, catalogue[0].title);
      assert.equal(saved.venue, catalogue[0].venue);
      assert.equal(saved.price, catalogue[0].price);
      event = saved;
    },
  );
  await t.test(
    "published content updates flow to forms; invalid or removed sources fail closed",
    async () => {
      const original = { ...catalogue[0] };
      catalogue[0].title = "UPDATED TITLE";
      catalogue[0].venue = "UPDATED VENUE";
      const list = await s.publicEvents();
      assert.equal(list[0].title, "UPDATED TITLE");
      assert.equal(list[0].venue, "UPDATED VENUE");
      catalogue[0].starts_at = iso(now + 1000);
      assert.equal((await s.events())[0].enabled, false);
      assert.equal((await s.publicEvents())[0].enabled, false);
      await assert.rejects(
        s.submit(
          {
            eventId: event.id,
            name: "test",
            email: "blocked@example.test",
            quantity: 1,
            consent: true,
          },
          randomUUID(),
          "source-test",
        ),
      );
      catalogue.splice(0, 1);
      assert.equal((await s.publicEvents()).length, 0);
      await assert.rejects(
        s.submit(
          {
            eventId: event.id,
            name: "test",
            email: "blocked@example.test",
            quantity: 1,
            consent: true,
          },
          randomUUID(),
          "source-test",
        ),
      );
      catalogue.push(original);
      assert.equal((await s.publicEvents()).length, 1);
    },
  );
  await t.test(
    "pause and resume preserve the same performance ID and reservation URL",
    async () => {
      const paused = (await s.saveEvent(
        { ...input, version: event.version, enabled: false },
        "test-admin",
        event.id,
      )) as unknown as TicketEvent;
      assert.equal(paused.id, event.id);
      assert.equal(eventState(paused, now).label, "受付停止中");
      const resumed = (await s.saveEvent(
        { ...input, version: paused.version, enabled: true },
        "test-admin",
        event.id,
      )) as unknown as TicketEvent;
      assert.equal(resumed.id, event.id);
      assert.equal(eventState(resumed, now).label, "申し込み可能");
      event = resumed;
    },
  );
  const form = () => ({
    eventId: event.id,
    name: "テスト申込者",
    email: "guest@example.test",
    quantity: 2,
    notes: "<script>alert(1)</script>",
    consent: true,
  });
  await t.test(
    "signed form nonce: timing, signature, expiry and IP binding",
    () => {
      const key = "a".repeat(40);
      const token = challenge(key, "test-ip", now - 4000);
      assert.equal(checkChallenge(token, key, "test-ip", now).length, 64);
      assert.throws(() => checkChallenge(token + "0", key, "test-ip", now));
      assert.throws(() => checkChallenge(token, key, "other-ip", now));
      assert.throws(() =>
        checkChallenge(challenge(key, "test-ip", now), key, "test-ip", now),
      );
      assert.throws(() => checkChallenge(token, key, "test-ip", now + 1800000));
    },
  );
  await t.test(
    "server validation, consent, quantity and missing events",
    async () => {
      assert.throws(() => reservationInput({ ...form(), consent: false }));
      assert.throws(() =>
        reservationInput({ ...form(), email: "bad\r\n@example.test" }),
      );
      await assert.rejects(
        s.submit({ ...form(), quantity: 5 }, randomUUID(), "ip-a"),
      );
      await assert.rejects(
        s.submit({ ...form(), eventId: randomUUID() }, randomUUID(), "ip-a"),
      );
    },
  );
  await t.test(
    "reservation persists with consent version; idempotent resend; duplicate email rejected",
    async () => {
      const key = randomUUID();
      const r = await s.submit(form(), key, "ip-a");
      id = r.id;
      assert.match(r.receipt, /^V-[A-F0-9]{16}$/);
      const again = await s.submit(form(), key, "ip-a");
      assert.equal(r.receipt, again.receipt);
      assert.equal(again.duplicate, true);
      await assert.rejects(
        s.submit({ ...form(), name: "changed" }, key, "ip-a"),
      );
      await assert.rejects(s.submit(form(), randomUUID(), "ip-a"));
      const detail = await new TicketService(
        db,
        "admin@example.test",
        catalogue,
      ).detail(id);
      assert.equal(detail.reservation.consent_version, CONSENT_VERSION);
      assert.equal(detail.jobs.length, 2);
      assert.equal(detail.reservation.quantity, 2);
    },
  );
  await t.test(
    "SMTP failure does not lose saved reservation; failed jobs can be retried",
    async () => {
      await s.deliver(id, async () => {
        throw Error("SIMULATED SMTP FAILURE");
      });
      assert.equal(
        (await s.detail(id)).jobs.filter((j) => j.state === "failed").length,
        2,
      );
      const sent: MailPayload[] = [];
      await s.deliver(
        id,
        async (mail) => {
          sent.push(mail);
        },
        "test-admin",
      );
      assert.equal(sent.length, 2);
      assert.equal(sent[0].to, "admin@example.test");
      assert.equal(sent[1].to, "guest@example.test");
      assert.match(sent[1].text, /予約の確定を保証するものではありません/);
      assert.equal(
        (await s.detail(id)).jobs.filter((j) => j.state === "sent").length,
        2,
      );
      await s.deliver(id, async () => {
        throw Error("ALREADY SENT MUST NOT BE CALLED");
      });
      assert.equal(
        (await s.detail(id)).jobs.every((j) => j.state === "sent"),
        true,
      );
    },
  );
  await t.test(
    "edit, optional status notification and stale edits rejected",
    async () => {
      const r = (await s.detail(id)).reservation;
      await s.edit(
        id,
        { ...r, quantity: 3, status: "confirmed", notify: true },
        "test-admin",
      );
      version = 2;
      const detail = await s.detail(id);
      assert.equal(detail.reservation.status, "confirmed");
      assert.equal(detail.jobs.length, 3);
      await assert.rejects(
        s.edit(id, { ...r, status: "cancelled" }, "test-admin"),
      );
      await s.deliver(id, async (mail) => {
        assert.match(mail.text, /予約ステータス：確定/);
      });
    },
  );
  await t.test("filter, search, totals, CSV injection defense", async () => {
    const list = await s.list({
      eventId: event.id,
      search: "テスト",
      status: "confirmed",
    });
    assert.equal(list.rows.length, 1);
    assert.equal(list.stats.quantity, 3);
    assert.equal(list.stats.pending, 0);
    const csv = reservationsCsv([
      { ...list.rows[0], name: '=HYPERLINK("bad")', notes: "\t@bad" },
    ]);
    assert.ok(csv.startsWith("\uFEFF"));
    assert.ok(csv.includes("'=HYPERLINK"));
    assert.ok(csv.includes("'\t@bad"));
  });
  await t.test(
    "disabled / expired / not-yet-open events reject at server, not just in UI",
    async () => {
      for (const mode of ["paused", "closed", "before"]) {
        const values = {
          ...input,
          news_slug: null,
          live_slug: null,
          ...(mode === "paused"
            ? { enabled: false }
            : mode === "closed"
              ? { opens_at: iso(now - 7200000), closes_at: iso(now - 1000) }
              : { opens_at: iso(now + 100000) }),
        };
        values.eventId = randomUUID();
        catalogue.push({
          ...catalogue[0],
          id: values.eventId,
          live_slug: "test-" + mode,
        });
        const e = (await s.saveEvent(
          values,
          "test-admin",
        )) as unknown as TicketEvent;
        await assert.rejects(
          s.submit(
            { ...form(), eventId: e.id, email: mode + "@example.test" },
            randomUUID(),
            "ip-other",
          ),
        );
      }
    },
  );
  await t.test(
    "durable login/submit throttle helper rejects above limit",
    async () => {
      await rateLimit(db, "test-rate", 2, 900);
      await rateLimit(db, "test-rate", 2, 900);
      await assert.rejects(rateLimit(db, "test-rate", 2, 900));
      assert.equal(
        (
          await db.query("SELECT hits FROM ticket_rate_limits WHERE key=$1", [
            "test-rate",
          ])
        )[0].hits,
        3,
      );
    },
  );
  await t.test(
    "scrypt password verification and stored session expiry",
    async () => {
      const encoded = await passwordHash("a-strong-test-password");
      assert.equal(
        await passwordMatches("a-strong-test-password", encoded),
        true,
      );
      assert.equal(await passwordMatches("wrong-password", encoded), false);
      assert.equal(await passwordMatches("wrong", "plaintext"), false);
      await db.query(
        "INSERT INTO ticket_sessions(token_hash,admin_id,credential_hash,expires_at) VALUES('test-token','test-admin','cred',now()-interval '1 second')",
      );
      assert.equal(
        (
          await db.query(
            "SELECT * FROM ticket_sessions WHERE token_hash='test-token' AND expires_at>now()",
          )
        ).length,
        0,
      );
    },
  );
  await t.test(
    "soft delete hides PII from lists and details; audit trail exists",
    async () => {
      await s.remove(id, version, "test-admin");
      await assert.rejects(s.detail(id));
      assert.equal((await s.list({ eventId: event.id })).rows.length, 0);
      const logs = await db.query(
        "SELECT action FROM ticket_audit ORDER BY id",
      );
      assert.ok(logs.some((l) => l.action === "reservation.update"));
      assert.ok(logs.some((l) => l.action === "reservation.delete"));
    },
  );
  await t.test(
    "a request waiting on a lock cannot pass after the closing time",
    async () => {
      const at = Date.now();
      const eventId = randomUUID();
      catalogue.push({
        ...catalogue[0],
        id: eventId,
        live_slug: "wait-lock-test",
      });
      await s.saveEvent(
        {
          ...input,
          eventId,
          opens_at: iso(at - 10000),
          closes_at: iso(at + 500),
        },
        "test-admin",
      );
      const slow: Database = {
        ...db,
        transaction: (fn) =>
          db.transaction((q) =>
            fn({
              query: async (sql, args) => {
                if (
                  sql.includes("pg_advisory_xact_lock") &&
                  String(args?.[0]).endsWith("wait@example.test")
                )
                  await new Promise((resolve) => setTimeout(resolve, 700));
                return q.query(sql, args);
              },
            }),
          ),
      };
      await assert.rejects(
        new TicketService(slow, "admin@example.test", catalogue).submit(
          {
            eventId,
            name: "waiting",
            email: "wait@example.test",
            quantity: 1,
            consent: true,
          },
          randomUUID(),
          "wait-lock-ip",
        ),
        /予約受付終了/,
      );
    },
  );
  await pg.close();
});

test("NEWS and LIVE catalogue share stable IDs without duplicating public content", () => {
  const live = {
    slug: "new-live",
    eventName: "NEW LIVE",
    date: "2027-01-02",
    startTime: "18:00",
    venue: "TEST HALL",
    admission: "2,000円",
    drinkCharge: "+1DRINK 600円",
  };
  const id = performanceId(live);
  const article = {
    slug: "new-announcement",
    category: "LIVE",
    title: "LIVE NEWS",
    body: "TEST",
    eventId: id,
  };
  const catalogue = buildPerformanceCatalogue(
    [live],
    [article, { ...article, slug: "unrelated-news", eventId: undefined }],
  );
  assert.equal(catalogue[0].id, id);
  assert.deepEqual(catalogue[0].news_slugs, [article.slug]);
  assert.equal(catalogue[0].starts_at, "2027-01-02T09:00:00.000Z");
  assert.equal(catalogue[0].price, "2,000円\n+1DRINK 600円");
  assert.equal(
    buildPerformanceCatalogue([{ ...live, eventName: "renamed title" }], [])[0]
      .id,
    id,
  );
  assert.equal(performanceId({ ...live, slug: "new-slug", eventId: id }), id);
  assert.throws(() =>
    buildPerformanceCatalogue(
      [live, { ...live, slug: "duplicate", eventId: id }],
      [],
    ),
  );
  assert.throws(() =>
    buildPerformanceCatalogue([live], [{ ...article, eventId: randomUUID() }]),
  );
  const incomplete = buildPerformanceCatalogue(
    [{ ...live, startTime: undefined }],
    [],
  );
  assert.equal(incomplete[0].starts_at, null);
  assert.ok(incomplete[0].issues.length);
});
