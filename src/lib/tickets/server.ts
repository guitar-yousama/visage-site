import { ISOLATED_EVENT_ID, isolatedPerformance, isolatedMailMode } from "./isolated-test";
import { validatePreviewMail } from "./preview-mail";
import type { MailPayload } from "./service";
import "server-only";
import { isTicketPreview, validatePreviewOrigin } from "./preview-safety";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import nodemailer from "nodemailer";
import { database } from "./database";
import { performanceCatalogue } from "./catalogue";
import {
  TicketService,
  tokenHash,
  keyed,
  rateLimit,
  passwordMatches,
  audit,
} from "./service";
import { TicketError, email } from "./domain";
const COOKIE = "visage-ticket-session";
export const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin",
};
export function secret() {
  const s = process.env.TICKET_SECURITY_SECRET;
  if (!s || s.length < 32)
    throw new TicketError(503, "受付設定が完了していません。");
  return s;
}
export function service() {
  if (!process.env.TICKET_ADMIN_EMAIL)
    throw new TicketError(503, "現在受付を準備しています。");
  const admin = email(process.env.TICKET_ADMIN_EMAIL);
  return new TicketService(database(), admin, [...performanceCatalogue, isolatedPerformance(process.env)]);
}
export function ipAddress(request: Request) {
  // Vercel supplies x-vercel-forwarded-for; do not trust a caller-supplied x-forwarded-for in local mode.
  return process.env.VERCEL
    ? (request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() ??
        "unknown")
    : "local";
}
export function checkOrigin(request: Request) {
  validatePreviewOrigin(process.env);
  const expected =
    process.env.TICKET_SITE_ORIGIN ??
    (process.env.NODE_ENV === "production"
      ? "https://visage-site.vercel.app"
      : "http://localhost:3000");
  const origin = request.headers.get("origin");
  if (
    origin !== expected &&
    !(
      process.env.NODE_ENV !== "production" &&
      origin === "http://127.0.0.1:3000"
    )
  )
    throw new TicketError(
      403,
      "送信元を確認できません。ページを再読み込みしてください。",
    );
  if (request.headers.get("sec-fetch-site") === "cross-site")
    throw new TicketError(403, "アクセスできません。");
}
export async function jsonBody(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new TicketError(415, "JSON形式で送信してください。");
  if (Number(request.headers.get("content-length") ?? 0) > 16384)
    throw new TicketError(413, "入力が長すぎます。");
  const reader = request.body?.getReader();
  if (!reader) throw new TicketError(400, "入力内容を確認してください。");
  let size = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 16384) {
      await reader.cancel();
      throw new TicketError(413, "入力が長すぎます。");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new TicketError(400, "入力内容を確認してください。");
  }
}
export function response(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: privateHeaders });
}
export function failure(error: unknown) {
  if (error instanceof TicketError)
    return response({ error: error.message }, error.status);
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  if (code === "23505")
    return response(
      { error: "すでに登録されている関連ページまたは申し込みがあります。" },
      409,
    );
  // Do not log exception objects: DB/SMTP errors can include credentials or personal data.
  return response(
    { error: "処理を完了できませんでした。時間をおいて再度お試しください。" },
    503,
  );
}
export async function currentAdmin() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (
    !token ||
    !/^[0-9a-f]{64}$/.test(token) ||
    !process.env.TICKET_ADMIN_PASSWORD_HASH ||
    !process.env.TICKET_ADMIN_ID
  )
    return null;
  const [row] = await database().query(
    "SELECT admin_id FROM ticket_sessions WHERE token_hash=$1 AND expires_at>now() AND credential_hash=$2 AND admin_id=$3",
    [
      tokenHash(token),
      tokenHash(process.env.TICKET_ADMIN_PASSWORD_HASH),
      process.env.TICKET_ADMIN_ID,
    ],
  );
  return row ? String(row.admin_id) : null;
}
export async function requireAdmin() {
  const admin = await currentAdmin();
  if (!admin) throw new TicketError(401, "ログインしてください。");
  return admin;
}
export async function login(id: string, password: string, request: Request) {
  const db = database();
  const ip = keyed(ipAddress(request), secret());
  await rateLimit(db, `login-ip:${ip}`, 8, 900);
  await rateLimit(db, "login-global", 80, 900);
  const expectedId = process.env.TICKET_ADMIN_ID;
  const encoded = process.env.TICKET_ADMIN_PASSWORD_HASH;
  if (!expectedId || !encoded)
    throw new TicketError(503, "管理者設定が完了していません。");
  // Always run password derivation, even when the supplied ID is wrong.
  const valid = await passwordMatches(password, encoded);
  if (!valid || id !== expectedId)
    throw new TicketError(
      401,
      "ログインIDまたはパスワードを確認してください。",
    );
  const token = randomBytes(32).toString("hex");
  await db.query(
    "INSERT INTO ticket_sessions(token_hash,admin_id,credential_hash,expires_at) VALUES($1,$2,$3,now()+interval '8 hours')",
    [tokenHash(token), expectedId, tokenHash(encoded)],
  );
  await audit(db, expectedId, "session.login", "session");
  await db.query("DELETE FROM ticket_sessions WHERE expires_at<=now()");
  await db.query("DELETE FROM ticket_rate_limits WHERE expires_at<=now()");
  const out = response({ ok: true });
  out.cookies.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 8 * 3600,
  });
  return out;
}
export async function logout() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (token) {
    const [session] = await database().query(
      "DELETE FROM ticket_sessions WHERE token_hash=$1 RETURNING admin_id",
      [tokenHash(token)],
    );
    if (session)
      await audit(
        database(),
        String(session.admin_id),
        "session.logout",
        "session",
      );
  }
  const out = response({ ok: true });
  out.cookies.set(COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return out;
}
export async function sendGmail(mail: MailPayload) {
  if (mail.isolatedEventId === ISOLATED_EVENT_ID) {
    if (isolatedMailMode(mail.to, process.env) === "simulate") return; // Never create an SMTP transport in Preview.
  } else if (isTicketPreview(process.env)) validatePreviewMail(mail, process.env);
  const user = email(process.env.GMAIL_USER ?? "");
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!pass) throw new Error("SMTP_NOT_CONFIGURED");
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 12000,
    disableFileAccess: true,
    disableUrlAccess: true,
    logger: false,
    debug: false,
  });
  try {
    const result = await transporter.sendMail({
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      replyTo: mail.replyTo,
      from: { name: "Visage", address: user },
    });
    if (!result.accepted.length) throw new Error("SMTP_REJECTED");
  } finally {
    transporter.close();
  }
}
