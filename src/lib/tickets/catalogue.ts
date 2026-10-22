import { createHash } from "node:crypto";
import {
  liveEvents,
  newsItems,
  type LiveEvent,
  type NewsItem,
} from "../site-data";
import { uuidPattern, type TicketPerformance } from "./domain";

// Stable fallback for existing content. Set eventId explicitly before renaming a LIVE slug.
export function performanceId(event: Pick<LiveEvent, "slug" | "eventId">) {
  if (event.eventId) {
    if (!uuidPattern.test(event.eventId))
      throw new Error("LIVEの公演IDが不正です。");
    return event.eventId.toLowerCase();
  }
  const bytes = createHash("sha256")
    .update("visage-live:" + event.slug)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 128;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export function buildPerformanceCatalogue(
  lives: LiveEvent[],
  news: NewsItem[],
): TicketPerformance[] {
  const used = new Set<string>();
  const performances = lives.map((live) => {
    const id = performanceId(live);
    if (used.has(id)) throw new Error("LIVEの公演IDが重複しています。");
    used.add(id);
    const issues: string[] = [];
    const dateTime = `${live.date}T${live.startTime}:00+09:00`;
    const validDate =
      /^\d{4}-\d{2}-\d{2}$/.test(live.date) &&
      /^([01]\d|2[0-3]):[0-5]\d$/.test(live.startTime ?? "") &&
      Number.isFinite(Date.parse(dateTime)) &&
      new Date(Date.parse(dateTime) + 9 * 3600000)
        .toISOString()
        .slice(0, 10) === live.date;
    if (!validDate) issues.push("LIVEの開催日・開演時刻を設定してください。");
    if (!live.venue.trim()) issues.push("LIVEの会場を設定してください。");
    if (!live.admission?.trim()) issues.push("LIVEの料金を設定してください。");
    return {
      id,
      reservationMode: live.reservationMode ?? (live.ticketUrl ? "external" : "none"),
      title: live.eventName,
      starts_at: validDate ? new Date(dateTime).toISOString() : null,
      venue: live.venue,
      price: [live.admission, live.drinkCharge].filter(Boolean).join("\n"),
      live_slug: live.slug,
      news_slugs: news
        .filter((n) => n.eventId?.toLowerCase() === id)
        .map((n) => n.slug),
      archived: Boolean(live.archived),
      issues,
    };
  });
  for (const article of news)
    if (article.eventId && !used.has(article.eventId.toLowerCase()))
      throw new Error("NEWSの公演IDに対応するLIVEがありません。");
  return performances;
}
export const performanceCatalogue = buildPerformanceCatalogue(
  liveEvents,
  newsItems,
);
