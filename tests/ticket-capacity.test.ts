import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { TicketService, type Database } from "../src/lib/tickets/service";
import {
  eventInput,
  eventState,
  type TicketEvent,
  type TicketPerformance,
} from "../src/lib/tickets/domain";

test("capacity: migration preserves data; occupancy, cancellation and edits stay consistent", async () => {
  const pg = new PGlite();
  try {
    // Exercise the migration against the previous schema, not just fresh installs.
    const schema = await readFile(
      new URL("../db/tickets.sql", import.meta.url),
      "utf8",
    );
    const old = schema
      .replace(/ capacity integer CHECK[^\n]+\n/, "")
      .replace(/CREATE INDEX ticket_reservations_capacity[\s\S]*?;\n/, "");
    await pg.exec(old);
    const migration = await readFile(
      new URL("../db/migrations/001-event-capacity.sql", import.meta.url),
      "utf8",
    );
    await pg.exec(migration);
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
    const source: TicketPerformance = {
      id: randomUUID(),
      title: "CAPACITY TEST",
      starts_at: new Date(now + 86400000).toISOString(),
      venue: "TEST",
      price: "TEST",
      live_slug: "capacity-test",
      news_slugs: [],
      archived: false,
      issues: [],
    };
    const service = new TicketService(db, "admin@example.invalid", [source]);
    let event = (await service.saveEvent(
      {
        eventId: source.id,
        opens_at: new Date(now - 60000).toISOString(),
        closes_at: new Date(now + 3600000).toISOString(),
        max_quantity: 5,
        capacity: 3,
        enabled: true,
      },
      "test",
    )) as unknown as TicketEvent;
    const body = (name: string, quantity: number) => ({
      eventId: source.id,
      name: "架空テスト",
      email: name + "@example.invalid",
      quantity,
      notes: "",
      consent: true,
    });
    const get = async () => (await service.events())[0];
    const settings = () => ({
      ...event,
      eventId: source.id,
      starts_at: new Date(String(event.starts_at)).toISOString(),
      opens_at: new Date(String(event.opens_at)).toISOString(),
      closes_at: new Date(String(event.closes_at)).toISOString(),
    });
    const edit = async (id: string, change: Record<string, unknown>) => {
      const { reservation } = await service.detail(id);
      await service.edit(
        id,
        { ...reservation, ...change, notify: false },
        "test",
      );
    };
    const a = await service.submit(body("one", 2), randomUUID(), "ip-one");
    assert.equal((await get()).reserved_quantity, 2);
    assert.equal((await get()).remaining_quantity, 1);
    await assert.rejects(
      service.submit(body("too-many", 2), randomUUID(), "ip-two"),
      /残り受付可能枚数/,
    );
    const b = await service.submit(body("two", 1), randomUUID(), "ip-three");
    assert.equal(eventState(await get()).code, "full");
    await assert.rejects(
      service.submit(body("full", 1), randomUUID(), "ip-four"),
      /定員/,
    );
    await edit(a.id, { status: "confirmed" });
    assert.equal((await get()).remaining_quantity, 0);
    await assert.rejects(edit(b.id, { quantity: 2 }), /定員|残り受付/);
    await edit(a.id, { status: "cancelled" });
    assert.equal((await get()).remaining_quantity, 2);
    assert.equal(eventState(await get()).code, "open");
    await edit(b.id, { quantity: 3 });
    assert.equal((await get()).remaining_quantity, 0);
    await assert.rejects(edit(a.id, { status: "pending" }), /定員|残り受付/);
    await edit(b.id, { quantity: 1 });
    await edit(a.id, { status: "pending" });
    assert.equal((await get()).remaining_quantity, 0);
    await assert.rejects(
      service.saveEvent({ ...settings(), capacity: 2 }, "test", source.id),
      /定員|残り受付/,
    );
    event = (await service.saveEvent(
      { ...settings(), capacity: null },
      "test",
      source.id,
    )) as unknown as TicketEvent;
    assert.equal((await get()).remaining_quantity, null);
    assert.equal(eventState(await get()).code, "open");
    await service.submit(body("unlimited", 5), randomUUID(), "ip-five");
    await service.remove(
      a.id,
      (await service.detail(a.id)).reservation.version,
      "test",
    );
    assert.equal((await get()).reserved_quantity, 6);
    assert.throws(() => eventInput({ ...settings(), capacity: 0 }), /数値/);
    assert.throws(() => eventInput({ ...settings(), capacity: 1.5 }), /数値/);
  } finally {
    await pg.close();
  }
});
