import { test } from "node:test";
import assert from "node:assert/strict";
import { authDiagnostics } from "../src/lib/tickets/auth-diagnostics";

test("auth diagnostics are Preview-branch-only and expose booleans, never credentials", () => {
  const env = { VERCEL: "1", VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "codex/ticket-isolated-test",
    TICKET_ADMIN_ID: "visage-preview-admin", TICKET_ADMIN_PASSWORD_HASH: `scrypt$32768$${"a".repeat(32)}$${"b".repeat(128)}` };
  for (const override of [{ VERCEL_ENV: "production" }, { VERCEL_TARGET_ENV: "production" },
    { VERCEL_GIT_COMMIT_REF: "main" }, { VERCEL: undefined }]) assert.equal(authDiagnostics({ ...env, ...override }), null);
  const result = authDiagnostics(env)!;
  assert.ok(result.adminIdMatchesExpected && result.passwordHashFormatValid);
  assert.ok(Object.values(result).every(value => typeof value === "boolean"));
  assert.ok(!JSON.stringify(result).includes(env.TICKET_ADMIN_PASSWORD_HASH));
  const bad = authDiagnostics({ ...env, TICKET_ADMIN_ID: "wrong ", TICKET_ADMIN_PASSWORD_HASH: "\"scrypt\\$32768\"\n" })!;
  assert.equal(bad.adminIdMatchesExpected, false);
  assert.ok(bad.adminIdHasOuterWhitespace && bad.passwordHashHasLineBreak && bad.passwordHashHasEscapedDollar);
  assert.equal(bad.passwordHashFormatValid, false);
});
