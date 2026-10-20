import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { mergeEnv } from "../scripts/ticket-admin-setup.mjs";
const nextEnv = createRequire(process.cwd() + "/package.json")("@next/env");

test("admin setup preserves unrelated env entries and safely round-trips scrypt dollar signs", async () => {
  const directory = await mkdtemp(join(tmpdir(), "visage-admin-env-test-"));
  try {
    const original =
      'DATABASE_URL="postgresql://fixture.invalid/test"\nUNRELATED_TEST_VALUE="unchanged"\nTICKET_ADMIN_ID="old-fixture"\n';
    const fixtureHash =
      "scrypt$32768$" + "a".repeat(32) + "$" + "b".repeat(128);
    const updated = mergeEnv(original, {
      TICKET_ADMIN_ID: "fixture-only",
      TICKET_ADMIN_PASSWORD_HASH: fixtureHash,
      TICKET_SECURITY_SECRET: "c".repeat(64),
    });
    await writeFile(join(directory, ".env.local"), updated, { mode: 0o600 });
    const result = nextEnv.loadEnvConfig(
      directory,
      true,
      { info() {}, error() {} },
      true,
    ).parsedEnv;
    assert.equal(result?.TICKET_ADMIN_PASSWORD_HASH, fixtureHash);
    assert.equal(result?.TICKET_ADMIN_ID, "fixture-only");
    assert.equal(result?.TICKET_SECURITY_SECRET, "c".repeat(64));
    assert.equal(result?.DATABASE_URL, "postgresql://fixture.invalid/test");
    assert.equal(result?.UNRELATED_TEST_VALUE, "unchanged");
    assert.equal(
      (await readFile(join(directory, ".env.local"), "utf8")).match(
        /^TICKET_ADMIN_ID=/gm,
      )?.length,
      1,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
