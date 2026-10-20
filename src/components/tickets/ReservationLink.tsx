"use client";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { eventState, type TicketEvent } from "@/lib/tickets/domain";
export function ReservationLink({
  eventId,
  className,
  fallback,
}: {
  eventId?: string;
  className?: string;
  fallback?: ReactNode;
}) {
  const [event, setEvent] = useState<TicketEvent | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!eventId) return;
    let alive = true;
    let offset = 0;
    let hasEvent = false;
    async function load() {
      try {
        const r = await fetch("/api/tickets/events", { cache: "no-store" });
        if (!r.ok) return;
        const data = await r.json();
        if (alive) {
          const found =
            data.events.find((e: TicketEvent) => e.id === eventId) ?? null;
          hasEvent = Boolean(found);
          setEvent(found);
          offset = Date.parse(data.serverNow) - Date.now();
          setNow(Date.now() + offset);
        }
      } catch {}
    }
    void load();
    const interval = setInterval(() => {
      if (!document.hidden) void load();
    }, 30000);
    const tick = setInterval(() => {
      if (hasEvent && !document.hidden) setNow(Date.now() + offset);
    }, 1000);
    return () => {
      alive = false;
      clearInterval(interval);
      clearInterval(tick);
    };
  }, [eventId]);
  if (!event || event.id !== eventId) return fallback ?? null;
  const state = eventState(event, now);
  return (
    <div className={className}>
      <p>{state.label}</p>
      <Link href={`/tickets/${event.id}`}>
        チケットを申し込む <span aria-hidden="true">↗</span>
      </Link>
    </div>
  );
}
