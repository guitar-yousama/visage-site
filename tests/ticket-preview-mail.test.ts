import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { enrollPreviewMail, validatePreviewMail } from "../src/lib/tickets/preview-mail";
import { TicketService, type Database, type MailPayload } from "../src/lib/tickets/service";
import type { TicketPerformance } from "../src/lib/tickets/domain";
const now = Date.now();
const env = {
  VERCEL: "1", VERCEL_ENV: "preview", VERCEL_TARGET_ENV: "preview",
  VERCEL_GIT_COMMIT_REF: "codex/ticket-preview", TICKET_PREVIEW_SMTP_ENABLED: "true",
  DATABASE_URL: "postgresql://fixture:fixture@ep-dawn-salad-b7oywtz6.c-13.us-east-1.aws.neon.tech/neondb?sslmode=verify-full",
  TICKET_PREVIEW_DB_BRANCH: "visage-development", TICKET_SITE_ORIGIN: "https://fixture.vercel.app",
  TICKET_SECURITY_SECRET: "fixture-only-secret-0000000000000000000000",
  GMAIL_USER: "sender@example.test", TICKET_ADMIN_EMAIL: "admin@example.test",
  TICKET_PREVIEW_MAIL_ALLOWLIST: JSON.stringify(["admin@example.test", "guest@example.test"]),
  TICKET_PREVIEW_MAIL_RUN: "a".repeat(32),
  TICKET_PREVIEW_MAIL_START: new Date(now - 60000).toISOString(),
  TICKET_PREVIEW_MAIL_END: new Date(now + 600000).toISOString(),
};
const message = { to: "guest@example.test", subject: "Fixture", text: "Fixture body" };
const context = { reservationId: randomUUID(), jobId: randomUUID(), kind: "receipt" as const, createdAt: new Date(now).toISOString() };
const proof = enrollPreviewMail(message, context, env, now)!;
const mail = { ...message, previewTest: proof };

test("Preview SMTP requires every gate; denied messages never reach a transport callback", () => {
  assert.ok(proof);
  assert.doesNotThrow(() => validatePreviewMail(mail, env, now));
  const invalid = [
    { TICKET_PREVIEW_SMTP_ENABLED: undefined }, { TICKET_PREVIEW_SMTP_ENABLED: "false" },
    { VERCEL: undefined }, { VERCEL_ENV: "production" }, { VERCEL_TARGET_ENV: "production" },
    { VERCEL_GIT_COMMIT_REF: "main" }, { VERCEL_GIT_COMMIT_REF: undefined },
    { DATABASE_URL: env.DATABASE_URL.replace("ep-dawn-salad-b7oywtz6", "production") },
    { DATABASE_URL: env.DATABASE_URL.replace("verify-full", "require") },
    { TICKET_PREVIEW_DB_BRANCH: undefined }, { NODE_TLS_REJECT_UNAUTHORIZED: "0" },
    { TICKET_SITE_ORIGIN: "https://visage-site.vercel.app" },
    { TICKET_PREVIEW_MAIL_ALLOWLIST: "[]" }, { TICKET_PREVIEW_MAIL_ALLOWLIST: "not json" },
    { TICKET_PREVIEW_MAIL_ALLOWLIST: JSON.stringify(["guest@example.test"]) },
    { TICKET_PREVIEW_MAIL_ALLOWLIST: JSON.stringify(["admin@example.test", "guest@example.test,other@example.test"]) },
    { TICKET_PREVIEW_MAIL_RUN: "b".repeat(32) }, { TICKET_SECURITY_SECRET: "short" },
    { TICKET_PREVIEW_MAIL_START: new Date(now + 1).toISOString() },
    { TICKET_PREVIEW_MAIL_END: new Date(now).toISOString() },
    { TICKET_PREVIEW_MAIL_END: new Date(now + 7200000).toISOString() },
    { TICKET_PREVIEW_MAIL_START: "invalid" },
  ];
  let transportCalls = 0;
  for (const override of invalid) {
    assert.throws(() => {
      validatePreviewMail(mail, { ...env, ...override }, now);
      transportCalls++;
    }, /PREVIEW_SMTP_DISABLED/);
  }
  assert.equal(transportCalls, 0);
});

test("Signed enrollment rejects historical jobs, old reservations, changes, other recipients and expired tests", () => {
  for (let i = 0; i < 6; i++) assert.throws(() => validatePreviewMail(message, env, now));
  assert.equal(enrollPreviewMail(message, { ...context, createdAt: new Date(now - 120000).toISOString() }, env, now), undefined);
  for (const changed of [
    { ...mail, to: "other@example.test" }, { ...mail, to: "guest@example.test,admin@example.test" },
    { ...mail, text: "changed" }, { ...mail, subject: "changed" }, { ...mail, replyTo: "other@example.test" },
    { ...mail, previewTest: { ...proof, createdAt: new Date(now - 120000).toISOString() } },
    { ...mail, previewTest: { ...proof, reservationId: randomUUID() } },
    { ...mail, previewTest: { ...proof, kind: "status" as "receipt" } },
    { ...mail, previewTest: { ...proof, signature: "0".repeat(64) } },
  ]) assert.throws(() => validatePreviewMail(changed, env, now));
  assert.throws(() => validatePreviewMail(mail, env, now + 600001));
  const adminMessage = { ...message, to: "admin@example.test" };
  const adminProof = enrollPreviewMail(adminMessage, { ...context, kind: "admin" }, env, now);
  assert.ok(adminProof);
  assert.doesNotThrow(() => validatePreviewMail({ ...adminMessage, previewTest: adminProof }, env, now));
});

test("DB workflow: six legacy failed jobs stay unsent; only new signed receipt/admin jobs are sent to a fake transport", async () => {
  const pg = new PGlite();
  try {
    await pg.exec(await readFile(new URL("../db/tickets.sql", import.meta.url), "utf8"));
    const db: Database = {
      query: async (sql, args) => (await pg.query(sql, args)).rows as Record<string, unknown>[],
      transaction: fn => pg.transaction(tx => fn({ query: async (sql, args) => (await tx.query(sql, args)).rows as Record<string, unknown>[] })),
    };
    const eventId = randomUUID();
    const performance: TicketPerformance = { id: eventId, title: "Fixture", starts_at: new Date(now + 86400000).toISOString(), venue: "Fixture", price: "Fixture", live_slug: "fixture", news_slugs: [], reservationMode: "internal", archived: false, issues: [] };
    const service = new TicketService(db, "admin@example.test", [performance], env);
    await service.saveEvent({ ...performance, eventId, opens_at: new Date(now - 86400000).toISOString(), closes_at: new Date(now + 3600000).toISOString(), enabled: true, max_quantity: 2, capacity: null }, "fixture-admin");
    for (let i = 0; i < 3; i++) {
      const id = randomUUID();
      await db.query("INSERT INTO ticket_reservations(id,receipt,event_id,event_title,name,email,quantity,consent_version,request_key,request_hash,created_at) VALUES($1,$2,$3,'Fixture','Fixture','old@example.invalid',1,'fixture',$4,'fixture',$5)", [id, 'OLD-'+i, eventId, randomUUID(), new Date(now - 86400000).toISOString()]);
      for (const kind of ["admin", "receipt"]) {
        await service.enqueue(db, id, kind, message);
      }
      await db.query("UPDATE ticket_mail_jobs SET state='failed',error_code='SMTP_FAILED' WHERE reservation_id=$1", [id]);
    }
    const legacyIds = (await db.query("SELECT DISTINCT reservation_id FROM ticket_mail_jobs")).map(x=>String(x.reservation_id));
    const sent: MailPayload[] = [];
    const fakeSend = async (value: MailPayload) => { validatePreviewMail(value, env); sent.push(value); };
    for (const id of legacyIds) await service.deliver(id, fakeSend, "fixture-admin");
    assert.equal(sent.length, 0);
    const result = await service.submit({ eventId, name: "Fixture", email: "guest@example.test", quantity: 1, notes: "", consent: true }, randomUUID(), "fixture-ip");
    await service.deliver(result.id, fakeSend);
    assert.equal(sent.length, 2);
    assert.deepEqual(new Set(sent.map(x=>x.to)), new Set(["admin@example.test", "guest@example.test"]));
    await service.deliver(result.id, fakeSend, "fixture-admin");
    assert.equal(sent.length, 2);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM ticket_mail_jobs WHERE state='failed' AND sent_at IS NULL"))[0].n, 6);
  } finally { await pg.close(); }
});
