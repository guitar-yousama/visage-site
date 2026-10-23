import { email, TicketError, type TicketPerformance } from "./domain";
export const ISOLATED_EVENT_ID = "ea0a8f5e-f2ef-4a29-9876-f92520b6b405";
type Env = Record<string, string | undefined>;
export function requireIsolatedAdmin(admin: string | null | undefined): asserts admin is string {
  if (!admin) throw new TicketError(404, "ページが見つかりません。");
}
export function isolatedConfiguration(env: Env, now = Date.now()) {
  const denied = () => new TicketError(409, "非公開テストは停止中、または設定が不完全です。");
  try {
    const start = Date.parse(env.TICKET_ISOLATED_START ?? "");
    const end = Date.parse(env.TICKET_ISOLATED_END ?? "");
    if (env.TICKET_ISOLATED_ENABLED !== "true" || !Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > 3600000 || now < start || now >= end) throw denied();
    const raw: unknown = JSON.parse(env.TICKET_ISOLATED_ALLOWLIST ?? "null");
    if (!Array.isArray(raw) || !raw.length || raw.length > 5) throw denied();
    const allowlist = raw.map(value => email(value));
    return { start, end, allowlist };
  } catch { throw denied(); }
}
export function validateIsolatedRecipient(to: string, env: Env, now = Date.now()) {
  if (!isolatedConfiguration(env, now).allowlist.includes(email(to)))
    throw new TicketError(409, "テスト用に許可された送信先を使用してください。");
}
export function isolatedPerformance(env: Env): TicketPerformance {
  // Never inserted into LIVE/NEWS or the public catalogue. Incomplete settings remain unbookable.
  const end = Date.parse(env.TICKET_ISOLATED_END ?? "");
  return { id: ISOLATED_EVENT_ID, reservationMode: "internal", title: "非公開・予約システム動作確認", starts_at: Number.isFinite(end) ? new Date(end + 86400000).toISOString() : null,
    venue: "オンライン動作確認（来場不要）", price: "無料・テスト専用", live_slug: "isolated-admin-test", news_slugs: [], archived: false,
    issues: Number.isFinite(end) ? [] : ["テスト時間を設定してください。"] };
}

export function isolatedMailMode(to: string, env: Env): "simulate" | "smtp" {
  validateIsolatedRecipient(to, env);
  if (env.VERCEL_ENV === "preview" || env.VERCEL_TARGET_ENV === "preview") return "simulate";
  if (env.TICKET_ISOLATED_SMTP_ENABLED !== "true") throw new TicketError(409, "テストSMTP送信は停止中です。");
  return "smtp";
}
