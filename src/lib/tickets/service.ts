import { enrollPreviewMail, type PreviewMailProof } from "./preview-mail";
import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import {
  CONSENT_VERSION,
  RECEIPT_NOTE,
  TicketError,
  email,
  eventInput,
  eventState,
  integer,
  record,
  reservationInput,
  statusLabels,
  text,
  jst,
  type TicketEvent,
  type TicketPerformance,
  type Reservation,
  type MailJob,
} from "./domain";
export type Row = Record<string, unknown>;
export interface Query {
  query(sql: string, args?: unknown[]): Promise<Row[]>;
}
export interface Database extends Query {
  transaction<T>(fn: (q: Query) => Promise<T>): Promise<T>;
}
export type MailPayload = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
  previewTest?: PreviewMailProof;
};
export type MailSender = (mail: MailPayload) => Promise<void>;
const scrypt = (password: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) =>
    scryptCallback(
      password,
      salt,
      64,
      { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    ),
  );
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export const tokenHash = hash;
export function keyed(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}
export async function passwordHash(
  password: string,
  salt = randomBytes(16).toString("hex"),
) {
  const out = await scrypt(password, salt);
  return `scrypt$32768$${salt}$${out.toString("hex")}`;
}
export async function passwordMatches(password: string, encoded: string) {
  if (!/^scrypt\$32768\$[0-9a-f]{32}\$[0-9a-f]{128}$/.test(encoded))
    return false;
  const candidate = await passwordHash(password, encoded.split("$")[2]);
  return timingSafeEqual(Buffer.from(candidate), Buffer.from(encoded));
}
export function challenge(secret: string, ip: string, now = Date.now()) {
  const data = Buffer.from(
    JSON.stringify({ id: randomUUID(), at: now, ip: keyed(ip, secret) }),
  ).toString("base64url");
  return data + "." + keyed(data, secret);
}
export function checkChallenge(
  token: string,
  secret: string,
  ip: string,
  now = Date.now(),
) {
  const [data, signature] = token.split(".");
  if (
    !data ||
    !signature ||
    !/^[0-9a-f]{64}$/.test(signature) ||
    !timingSafeEqual(Buffer.from(keyed(data, secret)), Buffer.from(signature))
  )
    throw new TicketError(400, "フォームを再読み込みしてください。");
  let value;
  try {
    value = JSON.parse(Buffer.from(data, "base64url").toString());
  } catch {
    throw new TicketError(400, "フォームを再読み込みしてください。");
  }
  if (
    !value ||
    typeof value.at !== "number" ||
    typeof value.id !== "string" ||
    value.ip !== keyed(ip, secret) ||
    now - value.at < 3000 ||
    now - value.at > 30 * 60 * 1000
  )
    throw new TicketError(
      400,
      "3秒以上おいて再送信するか、フォームを再読み込みしてください。",
    );
  return hash(token);
}
export async function rateLimit(
  db: Query,
  key: string,
  limit: number,
  seconds: number,
) {
  const rows = await db.query(
    `INSERT INTO ticket_rate_limits(key,hits,expires_at) VALUES($1,1,now()+$2*interval '1 second')
 ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN ticket_rate_limits.expires_at<=now() THEN 1 ELSE ticket_rate_limits.hits+1 END,
 expires_at=CASE WHEN ticket_rate_limits.expires_at<=now() THEN now()+$2*interval '1 second' ELSE ticket_rate_limits.expires_at END RETURNING hits`,
    [key, seconds],
  );
  if (Number(rows[0].hits) > limit)
    throw new TicketError(
      429,
      "操作回数が上限に達しました。しばらく時間をおいてください。",
    );
}
export async function audit(
  q: Query,
  admin: string,
  action: string,
  target: string,
) {
  await q.query(
    "INSERT INTO ticket_audit(admin_id,action,target_id) VALUES($1,$2,$3)",
    [admin, action, target],
  );
}
const publicEventFields =
  "id,title,starts_at,venue,price,opens_at,closes_at,enabled,max_quantity,capacity,news_slug,live_slug,version";
export class TicketService {
  constructor(
    public db: Database,
    private adminEmail: string,
    private catalogue: TicketPerformance[],
    private mailEnvironment: Record<string, string | undefined> = process.env,
  ) {}
  async events() {
    const rows = (await this.db.query(
      `SELECT ${publicEventFields}, (SELECT coalesce(sum(quantity),0)::int FROM ticket_reservations r WHERE r.event_id=ticket_events.id AND r.deleted_at IS NULL AND r.status IN ('pending','confirmed')) AS reserved_quantity FROM ticket_events ORDER BY starts_at DESC`,
    )) as unknown as TicketEvent[];
    return rows.map((row) =>
      this.bindSource({
        ...row,
        remaining_quantity:
          row.capacity == null
            ? null
            : Math.max(0, row.capacity - (row.reserved_quantity ?? 0)),
      }),
    );
  }
  async saveEvent(value: unknown, admin: string, id?: string) {
    const raw = record(value);
    const source = this.catalogue.find(
      (event) => event.id === String(raw.eventId).toLowerCase(),
    );
    if (!source || source.reservationMode !== "internal" || source.issues.length || !source.starts_at)
      throw new TicketError(
        400,
        "LIVEに登録された公演情報を確認してください。",
      );
    if (id && id !== source.id)
      throw new TicketError(400, "既存受付の公演IDは変更できません。");
    const v = eventInput({
      ...raw,
      ...source,
      news_slug: source.news_slugs[0] ?? null,
    });
    return this.db.transaction(async (q) => {
      if (id) {
        await q.query("SELECT id FROM ticket_events WHERE id=$1 FOR UPDATE", [
          id,
        ]);
        await this.checkCapacity(q, id, v.capacity, 0);
      }
      const args = [
        v.title,
        v.starts_at,
        v.venue,
        v.price,
        v.opens_at,
        v.closes_at,
        v.enabled,
        v.max_quantity,
        v.capacity,
        v.news_slug,
        v.live_slug,
      ];
      const rows = id
        ? await q.query(
            `UPDATE ticket_events SET title=$1,starts_at=$2,venue=$3,price=$4,opens_at=$5,closes_at=$6,enabled=$7,max_quantity=$8,capacity=$9,news_slug=$10,live_slug=$11,version=version+1 WHERE id=$12 AND version=$13 RETURNING ${publicEventFields}`,
            [...args, id, integer(raw.version, 1, 2147483647)],
          )
        : await q.query(
            `INSERT INTO ticket_events(title,starts_at,venue,price,opens_at,closes_at,enabled,max_quantity,capacity,news_slug,live_slug,id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING ${publicEventFields}`,
            [...args, source.id],
          );
      if (!rows.length)
        throw new TicketError(
          409,
          "公演情報が更新されています。再読み込みしてください。",
        );
      await audit(
        q,
        admin,
        id ? "event.update" : "event.create",
        String(rows[0].id),
      );
      return rows[0];
    });
  }
  private async checkCapacity(
    q: Query,
    eventId: string,
    capacity: number | null,
    additional: number,
    excludeId?: string,
  ) {
    // Call only after locking the parent event row. Count both pending and confirmed seats.
    if (capacity == null) return;
    const [row] = await q.query(
      "SELECT coalesce(sum(quantity),0)::int AS used FROM ticket_reservations WHERE event_id=$1 AND deleted_at IS NULL AND status IN ('pending','confirmed') AND ($2::uuid IS NULL OR id<>$2::uuid)",
      [eventId, excludeId ?? null],
    );
    const remaining = Math.max(0, capacity - Number(row.used));
    if (additional > remaining || Number(row.used) > capacity)
      throw new TicketError(
        409,
        remaining === 0
          ? "予約受付終了（定員に達しました）"
          : `残り受付可能枚数は${remaining}枚です。枚数を変更してください。`,
      );
  }
  private async lockReservationEvent(q: Query, id: string) {
    // All writers lock event -> reservation, including cancellation and soft deletion.
    const [reservation] = await q.query(
      "SELECT event_id FROM ticket_reservations WHERE id=$1 AND deleted_at IS NULL",
      [id],
    );
    if (!reservation) throw new TicketError(404, "申し込みが見つかりません。");
    const [event] = await q.query(
      "SELECT capacity FROM ticket_events WHERE id=$1 FOR UPDATE",
      [reservation.event_id],
    );
    return {
      id: String(reservation.event_id),
      capacity: event.capacity as number | null,
    };
  }
  private bindSource(stored: TicketEvent): TicketEvent {
    const source = this.catalogue.find((event) => event.id === stored.id);
    if (!source || source.reservationMode !== "internal" || source.issues.length || !source.starts_at)
      return {
        ...stored,
        enabled: false,
        configuration_issue: "対応するLIVE公演情報が未設定または不完全です。",
      };
    const info = {
      title: source.title,
      starts_at: source.starts_at,
      venue: source.venue,
      price: source.price,
      live_slug: source.live_slug,
      news_slug: source.news_slugs[0] ?? null,
    };
    if (Date.parse(String(stored.closes_at)) > Date.parse(source.starts_at))
      return {
        ...stored,
        ...info,
        enabled: false,
        configuration_issue:
          "LIVE開催日時が変更されています。受付締切を見直してください。",
      };
    return { ...stored, ...info };
  }
  async publicEvents() {
    // Keep an invalid-but-configured source visible as paused; never restore its old external CTA.
    return (await this.events()).filter((event) =>
      this.catalogue.some((source) => source.id === event.id && source.reservationMode === "internal"),
    );
  }
  async submit(value: unknown, requestKey: string, ipKey: string) {
    const v = reservationInput(value);
    if (!this.catalogue.some(source => source.id === v.eventId && source.reservationMode === "internal"))
      throw new TicketError(404, "この公演は新しい予約システムの対象ではありません。");
    const digest = hash(JSON.stringify(v));
    return this.db.transaction(async (q) => {
      // Serialize duplicate submissions by signed form nonce, without storing raw IP.
      await q.query("SELECT pg_advisory_xact_lock(hashtext($1))", [requestKey]);
      const previous = await q.query(
        "SELECT id,receipt,request_hash FROM ticket_reservations WHERE request_key=$1",
        [requestKey],
      );
      if (previous.length) {
        if (previous[0].request_hash !== digest)
          throw new TicketError(
            409,
            "送信済みです。新しい申し込みはフォームを再読み込みしてください。",
          );
        return {
          id: String(previous[0].id),
          receipt: String(previous[0].receipt),
          duplicate: true,
        };
      }
      await rateLimit(q, `submit-ip:${ipKey}`, 3, 900);
      await rateLimit(
        q,
        `submit-email:${hash(v.email)}:${v.eventId}`,
        3,
        86400,
      );
      await rateLimit(q, "submit-global", 200, 86400);
      const rows = await q.query(
        `SELECT ${publicEventFields} FROM ticket_events WHERE id=$1 FOR UPDATE`,
        [v.eventId],
      );
      if (!rows.length) throw new TicketError(404, "公演が見つかりません。");
      const e = this.bindSource(rows[0] as unknown as TicketEvent);
      if (v.quantity > e.max_quantity)
        throw new TicketError(
          400,
          `この公演は${e.max_quantity}枚まで申し込めます。`,
        );
      // The same normalized email cannot make a second active reservation for this event.
      await q.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        v.eventId + v.email,
      ]);
      const duplicate = await q.query(
        "SELECT id FROM ticket_reservations WHERE event_id=$1 AND email=$2 AND deleted_at IS NULL AND status<>'cancelled'",
        [v.eventId, v.email],
      );
      if (duplicate.length)
        throw new TicketError(
          409,
          "このメールアドレスでのお申し込みは受付済みです。枚数変更などは主催者へご連絡ください。",
        );
      await this.checkCapacity(q, e.id, e.capacity, v.quantity);
      // Read the wall clock after acquiring all locks, not the transaction start time.
      const [clock] = await q.query("SELECT clock_timestamp() AS server_now");
      const state = eventState(e, new Date(String(clock.server_now)).getTime());
      if (state.code !== "open") throw new TicketError(409, state.label);
      const id = randomUUID();
      const receipt = "V-" + randomBytes(8).toString("hex").toUpperCase();
      const [r] = await q.query(
        `INSERT INTO ticket_reservations(id,receipt,event_id,event_title,name,email,quantity,notes,consent_version,request_key,request_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [
          id,
          receipt,
          e.id,
          e.title,
          v.name,
          v.email,
          v.quantity,
          v.notes,
          CONSENT_VERSION,
          requestKey,
          digest,
        ],
      );
      const details = `公演名：${e.title}\n開催：${jst(e.starts_at)}（日本時間）\n会場：${e.venue}\n料金：${e.price}\n受付番号：${receipt}\n申込日時：${jst(String(r.created_at))}（日本時間）\nお名前：${v.name}\nメールアドレス：${v.email}\n申し込み枚数：${v.quantity}\n備考：${v.notes || "なし"}`;
      const createdAt = r.created_at instanceof Date
        ? r.created_at.toISOString()
        : new Date(String(r.created_at)).toISOString();
      await this.enqueue(q, id, "admin", {
        to: this.adminEmail,
        replyTo: v.email,
        subject: `[Visage] チケット申し込み ${receipt}`,
        text: details,
      }, createdAt);
      await this.enqueue(q, id, "receipt", {
        to: v.email,
        subject: `[Visage] チケットお申し込み受付 ${receipt}`,
        text: `チケットのお申し込みを受け付けました。\n\n${details}\n\n${RECEIPT_NOTE}`,
      }, createdAt);
      return { id, receipt, duplicate: false };
    });
  }
  async enqueue(q: Query, id: string, kind: string, payload: MailPayload, createdAt?: string) {
    const jobId = randomUUID();
    if (createdAt && (kind === "admin" || kind === "receipt")) {
      const proof = enrollPreviewMail(payload, { reservationId: id, jobId, kind, createdAt }, this.mailEnvironment);
      if (proof) payload = { ...payload, previewTest: proof };
    }
    await q.query(
      "INSERT INTO ticket_mail_jobs(id,reservation_id,kind,payload) VALUES($1,$2,$3,$4)",
      [jobId, id, kind, JSON.stringify(payload)],
    );
  }
  async list(
    filters: {
      eventId?: string;
      search?: string;
      status?: string;
      page?: number;
    },
    csv = false,
  ) {
    const args: unknown[] = [];
    const conditions = ["deleted_at IS NULL"];
    if (filters.eventId) {
      args.push(filters.eventId);
      conditions.push(`event_id=$${args.length}`);
    }
    if (filters.status) {
      args.push(filters.status);
      conditions.push(`status=$${args.length}`);
    }
    if (filters.search) {
      args.push("%" + filters.search.replace(/[\\%_]/g, "\\$&") + "%");
      conditions.push(
        `(name ILIKE $${args.length} OR email ILIKE $${args.length} OR receipt ILIKE $${args.length})`,
      );
    }
    const where = conditions.join(" AND ");
    const [stats] = await this.db.query(
      `SELECT count(*)::int AS count,coalesce(sum(quantity),0)::int AS quantity,count(*) FILTER(WHERE status='pending')::int AS pending FROM ticket_reservations WHERE ${where}`,
      args,
    );
    const rows = (await this.db.query(
      `SELECT id,receipt,event_id,event_title,created_at,name,email,quantity,notes,status,version,consent_at,consent_version,deleted_at FROM ticket_reservations WHERE ${where} ORDER BY created_at DESC,id DESC LIMIT ${csv ? 10001 : 30} OFFSET ${csv ? 0 : ((filters.page ?? 1) - 1) * 30}`,
      args,
    )) as unknown as Reservation[];
    if (csv && rows.length > 10000)
      throw new TicketError(
        400,
        "出力対象が1万件を超えています。公演で絞り込んでください。",
      );
    const mail = await this.db.query(
      `SELECT j.state,count(*)::int AS count FROM ticket_mail_jobs j JOIN ticket_reservations r ON r.id=j.reservation_id WHERE r.deleted_at IS NULL ${filters.eventId ? "AND r.event_id=$1" : ""} GROUP BY j.state`,
      filters.eventId ? [filters.eventId] : [],
    );
    return { rows, stats, mail };
  }
  async detail(id: string) {
    const [row] = await this.db.query(
      "SELECT id,receipt,event_id,event_title,created_at,name,email,quantity,notes,status,version,consent_at,consent_version,deleted_at FROM ticket_reservations WHERE id=$1 AND deleted_at IS NULL",
      [id],
    );
    if (!row) throw new TicketError(404, "申し込みが見つかりません。");
    const jobs = await this.db.query(
      "SELECT id,reservation_id,kind,state,attempts,error_code,sent_at FROM ticket_mail_jobs WHERE reservation_id=$1 ORDER BY created_at",
      [id],
    );
    return {
      reservation: row as unknown as Reservation,
      jobs: jobs as unknown as MailJob[],
    };
  }
  async edit(id: string, value: unknown, admin: string) {
    const v = record(value);
    const status = text(
      v.status,
      "ステータス",
      20,
    ) as keyof typeof statusLabels;
    if (!Object.hasOwn(statusLabels, status))
      throw new TicketError(400, "ステータスを確認してください。");
    const name = text(v.name, "お名前", 100);
    const address = email(v.email);
    const qty = integer(v.quantity, 1, 20);
    const notes = text(v.notes ?? "", "備考", 2000, true);
    const version = integer(v.version, 1, 2147483647);
    return this.db.transaction(async (q) => {
      const lockedEvent = await this.lockReservationEvent(q, id);
      const [previous] = await q.query(
        "SELECT r.*,e.max_quantity FROM ticket_reservations r JOIN ticket_events e ON e.id=r.event_id WHERE r.id=$1 AND r.deleted_at IS NULL FOR UPDATE OF r",
        [id],
      );
      if (!previous) throw new TicketError(404, "申し込みが見つかりません。");
      if (qty !== previous.quantity && qty > Number(previous.max_quantity))
        throw new TicketError(400, "公演の枚数上限を超えています。");
      await q.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        String(previous.event_id) + address,
      ]);
      if (status !== "cancelled") {
        const dup = await q.query(
          "SELECT id FROM ticket_reservations WHERE event_id=$1 AND email=$2 AND id<>$3 AND deleted_at IS NULL AND status<>'cancelled'",
          [previous.event_id, address, id],
        );
        if (dup.length)
          throw new TicketError(
            409,
            "同一公演・メールアドレスの有効な申し込みがあります。",
          );
      }
      await this.checkCapacity(
        q,
        lockedEvent.id,
        lockedEvent.capacity,
        status === "cancelled" ? 0 : qty,
        id,
      );
      const changed = await q.query(
        "UPDATE ticket_reservations SET name=$1,email=$2,quantity=$3,notes=$4,status=$5,version=version+1 WHERE id=$6 AND version=$7 RETURNING id",
        [name, address, qty, notes, status, id, version],
      );
      if (!changed.length)
        throw new TicketError(
          409,
          "別の操作で更新されています。再読み込みしてください。",
        );
      // Prevent accidentally notifying an old address from a queued original message after editing PII.
      if (
        address !== previous.email ||
        name !== previous.name ||
        qty !== previous.quantity ||
        notes !== previous.notes
      )
        await q.query(
          "UPDATE ticket_mail_jobs SET state='failed',error_code='CONTENT_CHANGED' WHERE reservation_id=$1 AND state IN ('pending','failed')",
          [id],
        );
      if (v.notify === true && status !== previous.status)
        await this.enqueue(q, id, "status", {
          to: address,
          subject: `[Visage] 予約状況のお知らせ ${previous.receipt}`,
          text: `${name} 様\n\n公演：${previous.event_title}\n受付番号：${previous.receipt}\n枚数：${qty}\n予約ステータス：${statusLabels[status]}\n${status === "pending" ? RECEIPT_NOTE : ""}`,
        });
      await audit(q, admin, "reservation.update", id);
    });
  }
  async remove(id: string, version: number, admin: string) {
    await this.db.transaction(async (q) => {
      await this.lockReservationEvent(q, id);
      const rows = await q.query(
        "UPDATE ticket_reservations SET deleted_at=now(),version=version+1 WHERE id=$1 AND version=$2 AND deleted_at IS NULL RETURNING id",
        [id, version],
      );
      if (!rows.length)
        throw new TicketError(409, "申し込みが更新されています。");
      await q.query(
        "UPDATE ticket_mail_jobs SET state='failed',error_code='DELETED' WHERE reservation_id=$1 AND state IN ('pending','failed')",
        [id],
      );
      await audit(q, admin, "reservation.delete", id);
    });
  }
  async deliver(id: string, send: MailSender, admin?: string) {
    if (admin) await audit(this.db, admin, "mail.retry", id);
    // Expired leases are uncertain: do not automatically resend a message the SMTP server may have accepted.
    await this.db.query(
      "UPDATE ticket_mail_jobs SET state='failed',error_code='DELIVERY_UNKNOWN' WHERE reservation_id=$1 AND state='sending' AND claimed_at<now()-interval '5 minutes'",
      [id],
    );
    const token = randomUUID();
    const jobs = await this.db.query(
      `UPDATE ticket_mail_jobs SET state='sending',claimed_at=now(),claim_token=$2,attempts=attempts+1 WHERE reservation_id=$1 AND state IN ${admin ? "('pending','failed')" : "('pending')"} AND error_code IS DISTINCT FROM 'CONTENT_CHANGED' AND error_code IS DISTINCT FROM 'DELETED' AND EXISTS(SELECT 1 FROM ticket_reservations r WHERE r.id=$1 AND r.deleted_at IS NULL) RETURNING id,payload`,
      [id, token],
    );
    for (const job of jobs) {
      try {
        await send(job.payload as MailPayload);
        await this.db.query(
          "UPDATE ticket_mail_jobs SET state='sent',sent_at=now(),error_code=NULL WHERE id=$1 AND claim_token=$2",
          [job.id, token],
        );
      } catch {
        await this.db.query(
          "UPDATE ticket_mail_jobs SET state='failed',error_code='SMTP_FAILED' WHERE id=$1 AND claim_token=$2",
          [job.id, token],
        );
      }
    }
  }
}
