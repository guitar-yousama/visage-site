import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { currentAdmin } from "@/lib/tickets/server";
import { ISOLATED_EVENT_ID } from "@/lib/tickets/isolated-test";
import { TicketForm } from "@/components/tickets/TicketForm";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { absolute: "非公開テスト｜VISAGE ADMIN" }, robots: { index: false, follow: false } };
export default async function IsolatedTestPage() {
  if (!await currentAdmin()) notFound();
  return <main id="main-content"><h1>管理者専用・非公開予約テスト</h1><p>Previewのメール送信は疑似処理です。実際のメールは送信されません。</p><TicketForm eventId={ISOLATED_EVENT_ID} isolated /></main>;
}
