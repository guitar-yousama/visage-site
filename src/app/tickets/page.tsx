import type { Metadata } from "next";
import styles from "@/components/tickets/tickets.module.css";
import { SectionPage } from "@/components/sections/SectionPage";
import { TicketForm } from "@/components/tickets/TicketForm";
export const metadata: Metadata = {
  title: { absolute: "TICKET RESERVATION｜Visage（ヴィサージュ）公式サイト" },
  description:
    "Visageのライブチケット申し込み。公演情報と受付期間をご確認のうえお申し込みください。",
  alternates: { canonical: "https://visage-site.vercel.app/tickets" },
  openGraph: {
    title: "TICKET RESERVATION｜Visage",
    description: "Visageのライブチケット申し込み。",
    url: "https://visage-site.vercel.app/tickets",
    type: "website",
  },
};
export default function TicketsPage() {
  return (
    <div className={styles.page}>
      <SectionPage
        index="TICKET"
        title="TICKET RESERVATION"
        description="VISAGE / LIVE TICKETS"
      >
        <TicketForm />
      </SectionPage>
    </div>
  );
}
