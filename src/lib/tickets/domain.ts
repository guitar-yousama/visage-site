export const CONSENT_VERSION = "2026-10-20-v1";
export const CONSENT_TEXT =
  "入力いただいた情報は、本公演の申し込み管理とご連絡に使用します。";
export const RECEIPT_NOTE =
  "このメールはお申し込みの受付をお知らせするものであり、予約の確定を保証するものではありません。";
export const statusLabels = {
  pending: "未確定",
  confirmed: "確定",
  cancelled: "キャンセル",
} as const;
export type ReservationStatus = keyof typeof statusLabels;
export type TicketPerformance = {
  id: string;
  title: string;
  starts_at: string | null;
  venue: string;
  price: string;
  live_slug: string;
  news_slugs: string[];
  archived: boolean;
  issues: string[];
};
export type TicketEvent = {
  id: string;
  title: string;
  starts_at: string;
  venue: string;
  price: string;
  opens_at: string;
  closes_at: string;
  enabled: boolean;
  max_quantity: number;
  capacity: number | null;
  reserved_quantity?: number;
  remaining_quantity?: number | null;
  news_slug: string | null;
  live_slug: string | null;
  version: number;
  configuration_issue?: string;
};
export type Reservation = {
  id: string;
  receipt: string;
  event_id: string;
  event_title: string;
  created_at: string;
  name: string;
  email: string;
  quantity: number;
  notes: string;
  consent_at: string;
  consent_version: string;
  status: ReservationStatus;
  deleted_at: string | null;
  version: number;
};
export type MailJob = {
  id: string;
  reservation_id: string;
  kind: string;
  state: string;
  attempts: number;
  error_code: string | null;
  sent_at: string | null;
};
export class TicketError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new TicketError(400, "入力内容を確認してください。");
  return value as Record<string, unknown>;
}
export function text(
  value: unknown,
  label: string,
  max: number,
  optional = false,
): string {
  if (
    typeof value !== "string" ||
    (!optional && !value.trim()) ||
    value.length > max ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
  )
    throw new TicketError(
      400,
      `${label}を確認してください（${max}文字以内）。`,
    );
  return value.trim();
}
export function email(value: unknown) {
  const v = text(value, "メールアドレス", 254).toLowerCase();
  if (
    !/^[^\s@<>,;:"()\\\[\]\r\n]+@[^\s@<>,;:"()\\\[\]\r\n]+\.[^\s@<>,;:"()\\\[\]\r\n]+$/.test(
      v,
    )
  )
    throw new TicketError(400, "メールアドレスを確認してください。");
  return v;
}
export function integer(value: unknown, min: number, max: number) {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  )
    throw new TicketError(400, "数値を確認してください。");
  return value;
}
export function eventState(event: TicketEvent, now = Date.now()) {
  if (!event.enabled) return { code: "paused", label: "受付停止中" };
  if (now < Date.parse(event.opens_at))
    return { code: "before", label: "予約受付開始前" };
  if (now >= Date.parse(event.closes_at))
    return { code: "closed", label: "予約受付終了" };
  if (event.remaining_quantity === 0)
    return { code: "full", label: "予約受付終了（定員に達しました）" };
  return { code: "open", label: "申し込み可能" };
}
export function jst(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
export function eventInput(value: unknown) {
  const v = record(value);
  const date = (key: string) => {
    const s = text(v[key], "日時", 40);
    if (!/(Z|\+09:00)$/.test(s) || !Number.isFinite(Date.parse(s)))
      throw new TicketError(
        400,
        "日時には日本時間またはUTCを指定してください。",
      );
    return new Date(s).toISOString();
  };
  const slug = (key: string) => {
    const s = text(v[key] ?? "", "関連ページ", 150, true);
    if (s && !/^[a-z0-9-]+$/.test(s))
      throw new TicketError(400, "関連ページを確認してください。");
    return s || null;
  };
  const data = {
    title: text(v.title, "公演タイトル", 200),
    starts_at: date("starts_at"),
    venue: text(v.venue, "会場", 200),
    price: text(v.price, "料金", 300),
    opens_at: date("opens_at"),
    closes_at: date("closes_at"),
    enabled: v.enabled,
    max_quantity: integer(v.max_quantity, 1, 20),
    capacity: v.capacity == null ? null : integer(v.capacity, 1, 1000000),
    news_slug: slug("news_slug"),
    live_slug: slug("live_slug"),
  };
  if (
    typeof data.enabled !== "boolean" ||
    Date.parse(data.opens_at) >= Date.parse(data.closes_at) ||
    Date.parse(data.closes_at) > Date.parse(data.starts_at)
  )
    throw new TicketError(
      400,
      "受付開始・締切・開催日時の順序を確認してください。",
    );
  return { ...data, enabled: data.enabled as boolean };
}
export function reservationInput(value: unknown) {
  const v = record(value);
  if (v.consent !== true)
    throw new TicketError(400, "個人情報の取り扱いへの同意が必要です。");
  if (!uuidPattern.test(String(v.eventId)))
    throw new TicketError(400, "公演を確認してください。");
  return {
    eventId: String(v.eventId),
    name: text(v.name, "お名前", 100),
    email: email(v.email),
    quantity: integer(v.quantity, 1, 20),
    notes: text(v.notes ?? "", "備考", 2000, true),
    consent: true,
  };
}
export function csvCell(value: unknown) {
  let s = String(value ?? "");
  if (/^[\s\uFEFF]*[=+@-]/.test(s) || /^[\t\r\n]/.test(s)) s = `'${s}`;
  return `"${s.replaceAll('"', '""')}"`;
}
export function reservationsCsv(rows: Reservation[]) {
  const data = [
    [
      "受付日時（日本時間）",
      "受付番号",
      "公演名",
      "お名前",
      "メールアドレス",
      "枚数",
      "備考",
      "ステータス",
    ],
    ...rows.map((r) => [
      jst(r.created_at),
      r.receipt,
      r.event_title,
      r.name,
      r.email,
      r.quantity,
      r.notes,
      statusLabels[r.status],
    ]),
  ];
  return "\uFEFF" + data.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
