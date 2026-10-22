import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { liveEvents, type LiveEvent } from "../src/lib/site-data";
import { buildPerformanceCatalogue, performanceId } from "../src/lib/tickets/catalogue";
import { TicketService, type Database } from "../src/lib/tickets/service";
import { eventState, type TicketEvent } from "../src/lib/tickets/domain";

const eclipse = liveEvents.find(event => event.slug === "visage-vs-gheme-eclipse")!;

test("ECLIPSE retains the exact original external URL including all parameters; internal reservations require opt-in", () => {
  // Snapshot of the pre-change URL, including every original query parameter.
  assert.equal(createHash("sha256").update(eclipse.ticketUrl!).digest("hex"), "341278aeedd45ff18b6ebf221a5b7a7d9a5dac7c09dfcf2e4543b0959191a04a");
  assert.equal(new URL(eclipse.ticketUrl!).origin, "https://eclipse-visage-gheme.spicy-badge-3006.chatgpt.site");
  assert.equal(eclipse.reservationMode, "external");
  const future: LiveEvent = { ...eclipse, slug: "future-fixture", eventId: randomUUID(), ticketUrl: undefined, reservationMode: undefined };
  const catalogue = buildPerformanceCatalogue([eclipse, future], []);
  assert.equal(catalogue[0].reservationMode, "external");
  assert.equal(catalogue[1].reservationMode, "none");
  assert.equal(buildPerformanceCatalogue([{ ...future, reservationMode: "internal" }], [])[0].reservationMode, "internal");
});

test("Legacy enabled ECLIPSE DB row cannot expose a form or accept reservations; history survives; future opt-in still works", async () => {
  const pg = new PGlite();
  try {
    await pg.exec(await readFile(new URL("../db/tickets.sql", import.meta.url), "utf8"));
    const db: Database = {
      query: async (sql, args) => (await pg.query(sql, args)).rows as Record<string, unknown>[],
      transaction: fn => pg.transaction(tx => fn({ query: async (sql, args) => (await tx.query(sql, args)).rows as Record<string, unknown>[] })),
    };
    const now = Date.now();
    const eclipseId = performanceId(eclipse);
    // Deliberately leave an enabled legacy row, so disabling a DB setting is not the safeguard.
    await db.query("INSERT INTO ticket_events(id,title,starts_at,venue,price,opens_at,closes_at,enabled,max_quantity) VALUES($1,$2,$3,'Fixture','Fixture',$4,$5,true,2)", [eclipseId, eclipse.eventName, new Date(now + 86400000).toISOString(), new Date(now - 60000).toISOString(), new Date(now + 60000).toISOString()]);
    await db.query("INSERT INTO ticket_reservations(id,receipt,event_id,event_title,name,email,quantity,consent_version,request_key,request_hash) VALUES($1,'LEGACY-PRESERVED',$2,'Fixture','Fixture','fixture@example.invalid',1,'fixture',$3,'fixture')", [randomUUID(), eclipseId, randomUUID()]);
    const future: LiveEvent = { ...eclipse, slug: "future-fixture", eventId: randomUUID(), reservationMode: "internal", date: new Date(now+86400000).toISOString().slice(0,10), ticketUrl: undefined };
    const sources = buildPerformanceCatalogue([eclipse, future], []);
    const service = new TicketService(db, "admin@example.test", sources);
    assert.deepEqual(await service.publicEvents(), []);
    const stored = (await service.events()).find(event => event.id === eclipseId)!;
    assert.equal(eventState(stored).code, "paused");
    const input = { eventId: eclipseId, name: "Fixture", email: "guest@example.test", quantity: 1, notes: "", consent: true };
    const noQueries: Database = { query: async()=>{ throw Error("Unexpected DB query"); }, transaction: async()=>{ throw Error("Unexpected DB write"); } };
    await assert.rejects(new TicketService(noQueries, "admin@example.test", sources).submit(input, randomUUID(), "fixture"), /対象ではありません/);
    await assert.rejects(service.saveEvent({ eventId: eclipseId }, "fixture-admin"), /LIVE/);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM ticket_reservations"))[0].n, 1);
    const futureEvent = await service.saveEvent({ eventId: future.eventId, opens_at: new Date(now-60000).toISOString(), closes_at: new Date(now+60000).toISOString(), enabled: true, max_quantity: 2, capacity: 3 }, "fixture-admin") as unknown as TicketEvent;
    const created = await service.submit({ ...input, eventId: futureEvent.id }, randomUUID(), "fixture-ip");
    assert.ok(created.receipt);
    assert.deepEqual((await service.publicEvents()).map(event=>event.id), [futureEvent.id]);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM ticket_reservations WHERE receipt='LEGACY-PRESERVED'"))[0].n, 1);
  } finally { await pg.close(); }
});
