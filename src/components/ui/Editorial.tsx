import Link from "next/link";
import styles from "./editorial.module.css";

export function SectionHeading({ index, title, note, id }: { index: string; title: string; note?: string; id?: string }) {
  return <div className={styles.heading} data-reveal="title"><span>{index}</span><h2 id={id}>{title}</h2>{note && <p>{note}</p>}</div>;
}

export function EditorialLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link className={styles.editorialLink} href={href}><span>{children}</span><i aria-hidden="true">↗</i></Link>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className={styles.emptyState} data-reveal>{children}</p>;
}

export function PageIntro({ index, title, description }: { index: string; title: string; description?: string }) {
  return <header className={styles.pageIntro}><span data-reveal>{index} / VISAGE</span><h1 data-reveal="title" style={{ "--reveal-delay": "100ms" } as React.CSSProperties}>{title}</h1>{description && <p data-reveal style={{ "--reveal-delay": "180ms" } as React.CSSProperties}>{description}</p>}</header>;
}
