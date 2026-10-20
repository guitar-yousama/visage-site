// Server-only callers use these pure validators before creating any DB connection.
import { TicketError } from "./domain";
type Environment = Record<string, string | undefined>;
export function isTicketPreview(env: Environment) {
  return env.VERCEL_ENV === "preview" || env.VERCEL_TARGET_ENV === "preview";
}
export function validatePreviewDatabase(env: Environment) {
  if (!isTicketPreview(env)) return;
  try {
    const url = new URL(env.DATABASE_URL ?? "");
    const entries = [...url.searchParams.keys()];
    if (
      env.TICKET_PREVIEW_DB_BRANCH !== "visage-development" ||
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      url.hostname !== "ep-dawn-salad-b7oywtz6.c-13.us-east-1.aws.neon.tech" ||
      url.pathname !== "/neondb" ||
      (url.port !== "" && url.port !== "5432") ||
      !url.username ||
      !url.password ||
      url.hash ||
      url.searchParams.get("sslmode") !== "verify-full" ||
      entries.some((key) => !["sslmode", "channel_binding"].includes(key)) ||
      new Set(entries).size !== entries.length ||
      env.NODE_TLS_REJECT_UNAUTHORIZED === "0"
    )
      throw Error();
  } catch {
    throw new TicketError(503, "Previewの開発DB接続設定を確認してください。");
  }
}
export function validatePreviewOrigin(env: Environment) {
  if (!isTicketPreview(env)) return;
  try {
    const value = env.TICKET_SITE_ORIGIN;
    const url = new URL(value ?? "");
    if (
      url.protocol !== "https:" ||
      !url.hostname.endsWith(".vercel.app") ||
      url.hostname === "visage-site.vercel.app" ||
      url.username ||
      url.password ||
      url.port ||
      url.search ||
      url.hash ||
      value !== url.origin
    )
      throw Error();
  } catch {
    throw new TicketError(503, "Previewの確認用URLを設定中です。");
  }
}
