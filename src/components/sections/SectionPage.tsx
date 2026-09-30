import type { ReactNode } from "react";
import { PageIntro } from "@/components/ui/Editorial";
import styles from "./section-page.module.css";

export function SectionPage({ index, title, description, children }: { index: string; title: string; description?: string; children: ReactNode }) {
  return <main id="main-content"><PageIntro index={index} title={title} description={description} /><div className={styles.content}>{children}</div></main>;
}
