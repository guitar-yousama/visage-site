import { randomUUID } from "node:crypto";
import {
  checkOrigin,
  currentAdmin,
  failure,
  ipAddress,
  jsonBody,
  login,
  logout,
  privateHeaders,
  requireAdmin,
  response,
  secret,
  sendGmail,
  service,
} from "@/lib/tickets/server";
import { database, configured } from "@/lib/tickets/database";
import {
  challenge,
  checkChallenge,
  keyed,
  rateLimit,
  audit,
} from "@/lib/tickets/service";
import {
  integer,
  record,
  reservationsCsv,
  text,
  TicketError,
  uuidPattern,
  statusLabels,
} from "@/lib/tickets/domain";
import { performanceCatalogue } from "@/lib/tickets/catalogue";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const uuid = (value: string) => {
  if (!uuidPattern.test(value))
    throw new TicketError(400, "IDを確認してください。");
  return value;
};
function filters(url: URL) {
  const eventId = url.searchParams.get("eventId") || undefined;
  if (eventId) uuid(eventId);
  const status = url.searchParams.get("status") || undefined;
  if (status && !Object.hasOwn(statusLabels, status))
    throw new TicketError(400, "ステータスを確認してください。");
  const search = text(
    url.searchParams.get("search") ?? "",
    "検索語",
    100,
    true,
  );
  const page = Number(url.searchParams.get("page") ?? "1");
  integer(page, 1, 10000);
  return { eventId, status, search, page };
}
async function dispatch(request: Request, path: string[]) {
  const method = request.method;
  const action = path.join("/");
  const url = new URL(request.url);
  if (method !== "GET") checkOrigin(request);
  if (method === "GET" && action === "events") {
    if (!configured())
      return response({
        events: [],
        configured: false,
        serverNow: new Date().toISOString(),
      });
    return response({
      events: await service().publicEvents(),
      configured: true,
      serverNow: new Date().toISOString(),
    });
  }
  if (method === "GET" && action === "challenge") {
    // A signed, IP-bound, single-use form nonce; public GET never returns reservation data.
    await rateLimit(database(), "challenge-global", 1000, 900);
    await rateLimit(
      database(),
      `challenge:${keyed(ipAddress(request), secret())}`,
      30,
      900,
    );
    return response({ token: challenge(secret(), ipAddress(request)) });
  }
  if (method === "POST" && action === "reserve") {
    const v = record(await jsonBody(request));
    if (v.website !== "")
      throw new TicketError(400, "送信内容を確認してください。");
    await rateLimit(
      database(),
      `attempt:${keyed(ipAddress(request), secret())}`,
      15,
      900,
    );
    const key = checkChallenge(
      text(v.token, "フォーム", 1024),
      secret(),
      ipAddress(request),
    );
    const s = service();
    const result = await s.submit(v, key, keyed(ipAddress(request), secret()));
    if (!result.duplicate) {
      try {
        await s.deliver(result.id, sendGmail);
      } catch {
        /* The reservation + mail jobs are already durably stored. */
      }
    }
    return response({ receipt: result.receipt }, 201);
  }
  if (method === "POST" && action === "login") {
    const v = record(await jsonBody(request));
    return login(
      text(v.id, "ログインID", 100),
      text(v.password, "パスワード", 200),
      request,
    );
  }
  if (method === "POST" && action === "logout") return logout();
  if (method === "GET" && action === "session")
    return response({ authenticated: Boolean(await currentAdmin()) });
  const admin = await requireAdmin();
  const s = service();
  if (method === "GET" && action === "admin/events")
    return response({
      events: await s.events(),
      performances: performanceCatalogue,
    });
  if (method === "POST" && action === "admin/events") {
    const v = record(await jsonBody(request));
    return response({ event: await s.saveEvent(v, admin) }, 201);
  }
  if (
    method === "PATCH" &&
    path.length === 3 &&
    path[0] === "admin" &&
    path[1] === "events"
  ) {
    const v = record(await jsonBody(request));
    return response({ event: await s.saveEvent(v, admin, uuid(path[2])) });
  }
  if (method === "GET" && action === "admin/reservations")
    return response(await s.list(filters(url)));
  if (method === "GET" && action === "admin/csv") {
    const { rows } = await s.list(filters(url), true);
    const csv = reservationsCsv(rows);
    if (Buffer.byteLength(csv, "utf8") > 4 * 1024 * 1024)
      throw new TicketError(
        400,
        "CSVが大きすぎます。公演や検索条件で絞り込んでください。",
      );
    await audit(database(), admin, "reservation.export", randomUUID());
    return new Response(csv, {
      headers: {
        ...privateHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="visage-tickets.csv"',
      },
    });
  }
  if (method === "GET" && action === "admin/logs")
    return response({
      logs: await database().query(
        "SELECT action,target_id,admin_id,created_at FROM ticket_audit ORDER BY id DESC LIMIT 100",
      ),
    });
  if (
    path[0] === "admin" &&
    path[1] === "reservations" &&
    (path.length === 3 || path.length === 4)
  ) {
    const id = uuid(path[2]);
    if (path.length === 3 && method === "GET")
      return response(await s.detail(id));
    if (path.length === 3 && method === "PATCH") {
      await s.edit(id, await jsonBody(request), admin);
      try {
        await s.deliver(id, sendGmail);
      } catch {}
      return response({ ok: true });
    }
    if (path.length === 3 && method === "DELETE") {
      const v = record(await jsonBody(request));
      await s.remove(id, integer(v.version, 1, 2147483647), admin);
      return response({ ok: true });
    }
    if (path[3] === "retry" && method === "POST") {
      const v = record(await jsonBody(request));
      if (v.confirm !== true)
        throw new TicketError(400, "再送の確認が必要です。");
      await s.detail(id);
      await rateLimit(database(), `retry:${id}`, 3, 3600);
      await s.deliver(id, sendGmail, admin);
      return response(await s.detail(id));
    }
  }
  throw new TicketError(404, "ページが見つかりません。");
}
async function handle(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    return await dispatch(request, (await context.params).path);
  } catch (e) {
    return failure(e);
  }
}
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
