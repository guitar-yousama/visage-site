import type { Metadata } from "next";
import { TicketAdmin } from "@/components/tickets/TicketAdmin";
import styles from "@/components/tickets/tickets.module.css";
export const metadata: Metadata = {
  title: { absolute: "VISAGE / ADMIN" },
  robots: { index: false, follow: false, nocache: true },
  referrer: "same-origin",
};
export const dynamic = "force-dynamic";
export default function AdminPage() {
  return (
    <main id="main-content">
      <header className={styles.adminHeader}>
        <p>VISAGE / ADMIN</p>
        <h1>チケット申し込み管理</h1>
      </header>
      <div className={styles.adminContent}><TicketAdmin /></div>
    </main>
  );
}
