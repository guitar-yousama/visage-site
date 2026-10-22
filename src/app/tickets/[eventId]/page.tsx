import type { Metadata } from "next";
import styles from "@/components/tickets/tickets.module.css";
import { notFound } from "next/navigation";
import { SectionPage } from "@/components/sections/SectionPage";
import { TicketForm } from "@/components/tickets/TicketForm";
import { performanceCatalogue } from "@/lib/tickets/catalogue";
import { uuidPattern } from "@/lib/tickets/domain";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): Promise<Metadata> {
  const { eventId } = await params;
  return {
    title: { absolute: "TICKET RESERVATION｜Visage（ヴィサージュ）公式サイト" },
    description:
      "Visageの公演別ライブチケット申し込み。受付期間と公演情報をご確認ください。",
    alternates: {
      canonical: `https://visage-site.vercel.app/tickets/${eventId}`,
    },
    robots: { index: false, follow: true },
    openGraph: {
      title: "TICKET RESERVATION｜Visage",
      url: `https://visage-site.vercel.app/tickets/${eventId}`,
      type: "website",
    },
  };
}
export default async function TicketEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  if (!uuidPattern.test(eventId) || !performanceCatalogue.some(event => event.id === eventId.toLowerCase() && event.reservationMode === "internal")) notFound();
  return (
    <div className={styles.page}>
      <SectionPage
        index="TICKET"
        title="TICKET RESERVATION"
        description="VISAGE / LIVE TICKETS"
      >
        <TicketForm eventId={eventId} />
      </SectionPage>
    </div>
  );
}
