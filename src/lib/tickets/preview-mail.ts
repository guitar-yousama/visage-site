import { createHmac, timingSafeEqual } from "node:crypto";
import { email } from "./domain";
import { validatePreviewDatabase, validatePreviewOrigin } from "./preview-safety";

type Environment = Record<string, string | undefined>;
export type PreviewMailProof = {
  reservationId: string;
  jobId: string;
  kind: "admin" | "receipt";
  createdAt: string;
  run: string;
  signature: string;
};
type Message = { to: string; subject: string; text: string; replyTo?: string };
const denied = () => new Error("PREVIEW_SMTP_DISABLED");

function configuration(env: Environment, now: number) {
  if (
    env.TICKET_PREVIEW_SMTP_ENABLED !== "true" ||
    env.VERCEL !== "1" || env.VERCEL_ENV !== "preview" ||
    (env.VERCEL_TARGET_ENV && env.VERCEL_TARGET_ENV !== "preview") ||
    env.VERCEL_GIT_COMMIT_REF !== "codex/ticket-preview"
  ) throw denied();
  validatePreviewDatabase(env);
  validatePreviewOrigin(env);
  const startText = env.TICKET_PREVIEW_MAIL_START ?? "";
  const endText = env.TICKET_PREVIEW_MAIL_END ?? "";
  const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  const start = Date.parse(startText), end = Date.parse(endText);
  if (!iso.test(startText) || !iso.test(endText) || !Number.isFinite(start) ||
      !Number.isFinite(end) || end <= start || end - start > 3600000 || now < start || now >= end)
    throw denied();
  const run = env.TICKET_PREVIEW_MAIL_RUN ?? "";
  const secret = env.TICKET_SECURITY_SECRET ?? "";
  if (!/^[0-9a-f]{32}$/.test(run) || secret.length < 32) throw denied();
  const values: unknown = JSON.parse(env.TICKET_PREVIEW_MAIL_ALLOWLIST ?? "null");
  if (!Array.isArray(values) || values.length < 1 || values.length > 5) throw denied();
  const allowed = values.map((value) => email(value));
  const sender = email(env.GMAIL_USER ?? "");
  const admin = email(env.TICKET_ADMIN_EMAIL ?? "");
  if (!allowed.includes(admin)) throw denied();
  return { start, end, run, secret, allowed, sender };
}
function signature(mail: Message, proof: Omit<PreviewMailProof, "signature">, env: Environment, secret: string) {
  return createHmac("sha256", secret).update(JSON.stringify([
    "visage-preview-mail-v1", proof.reservationId, proof.jobId, proof.kind,
    proof.createdAt, proof.run, mail.to, mail.subject, mail.text, mail.replyTo ?? null,
    env.GMAIL_USER, env.TICKET_PREVIEW_MAIL_START, env.TICKET_PREVIEW_MAIL_END,
  ])).digest("hex");
}

// Called only while creating the two initial jobs for a new reservation.
// Existing jobs and status notifications are never enrolled retroactively.
export function enrollPreviewMail(mail: Message, context: Omit<PreviewMailProof, "run" | "signature">,
  env: Environment, now = Date.now()): PreviewMailProof | undefined {
  try {
    const config = configuration(env, now);
    const created = Date.parse(context.createdAt);
    if (!Number.isFinite(created) || created < config.start || created > now || created >= config.end ||
        !["admin", "receipt"].includes(context.kind) || !config.allowed.includes(email(mail.to))) return;
    const proof = { ...context, run: config.run };
    return { ...proof, signature: signature(mail, proof, env, config.secret) };
  } catch { return; }
}

export function validatePreviewMail(mail: Message & { previewTest?: PreviewMailProof }, env: Environment, now = Date.now()) {
  try {
    const config = configuration(env, now);
    const proof = mail.previewTest;
    if (!proof || !/^[0-9a-f-]{36}$/.test(proof.reservationId) || !/^[0-9a-f-]{36}$/.test(proof.jobId) ||
        proof.run !== config.run || !["admin", "receipt"].includes(proof.kind) ||
        !/^[0-9a-f]{64}$/.test(proof.signature) || !config.allowed.includes(email(mail.to))) throw denied();
    if (proof.kind === "admin" && email(mail.to) !== email(env.TICKET_ADMIN_EMAIL)) throw denied();
    if (mail.replyTo) email(mail.replyTo);
    const created = Date.parse(proof.createdAt);
    if (!Number.isFinite(created) || created < config.start || created > now || created >= config.end) throw denied();
    const expected = signature(mail, proof, env, config.secret);
    if (!timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(proof.signature, "hex"))) throw denied();
  } catch { throw denied(); }
}
