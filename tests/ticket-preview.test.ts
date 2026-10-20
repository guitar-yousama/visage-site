import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isTicketPreview,
  validatePreviewDatabase,
  validatePreviewOrigin,
} from "../src/lib/tickets/preview-safety";
const development =
  "postgresql://fixture:fixture@ep-dawn-salad-b7oywtz6.c-13.us-east-1.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require";
test("Preview rejects unintended DB targets and TLS/connection-string overrides before connecting", () => {
  const env = {
    VERCEL_ENV: "preview",
    DATABASE_URL: development,
    TICKET_PREVIEW_DB_BRANCH: "visage-development",
  };
  assert.doesNotThrow(() => validatePreviewDatabase(env));
  assert.throws(
    () =>
      validatePreviewDatabase({ ...env, TICKET_PREVIEW_DB_BRANCH: undefined }),
    /Preview/,
  );
  for (const value of [
    undefined,
    development.replace("ep-dawn-salad-b7oywtz6", "production"),
    development.replace("/neondb?", "/other?"),
    development.replace("verify-full", "require"),
    development + "&host=production.invalid",
    development + "&sslmode=disable",
    development + "&uselibpqcompat=true",
  ])
    assert.throws(
      () => validatePreviewDatabase({ ...env, DATABASE_URL: value }),
      /Preview/,
    );
  assert.throws(
    () =>
      validatePreviewDatabase({ ...env, NODE_TLS_REJECT_UNAUTHORIZED: "0" }),
    /Preview/,
  );
  assert.doesNotThrow(() =>
    validatePreviewDatabase({ VERCEL_ENV: "production" }),
  );
  assert.equal(isTicketPreview({ VERCEL_TARGET_ENV: "preview" }), true);
});
test("Preview requires its explicit HTTPS origin; no production or localhost fallback", () => {
  const env = { VERCEL_ENV: "preview" };
  for (const value of [
    undefined,
    "http://localhost:3000",
    "https://visage-site.vercel.app",
    "https://fixture.vercel.app/path",
    "https://fixture.vercel.app/",
    "https://${VERCEL_URL}",
  ])
    assert.throws(
      () => validatePreviewOrigin({ ...env, TICKET_SITE_ORIGIN: value }),
      /Preview/,
    );
  assert.doesNotThrow(() =>
    validatePreviewOrigin({
      ...env,
      TICKET_SITE_ORIGIN: "https://fixture.vercel.app",
    }),
  );
  assert.doesNotThrow(() =>
    validatePreviewOrigin({ VERCEL_ENV: "production" }),
  );
});
