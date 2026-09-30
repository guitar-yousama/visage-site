import Link from "next/link";
import { socialLinks } from "@/lib/site-data";
import styles from "./footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.top}>
        <Link className={styles.mark} href="/" data-reveal>VISAGE</Link>
        <p data-reveal style={{ "--reveal-delay": "80ms" } as React.CSSProperties}>We Rise from Beautiful Decay</p>
        <span data-reveal style={{ "--reveal-delay": "140ms" } as React.CSSProperties}>KUMAMOTO / JAPAN</span>
      </div>
      <div className={styles.bottom}>
        <nav aria-label="公式ソーシャルリンク" data-reveal style={{ "--reveal-delay": "200ms" } as React.CSSProperties}>{socialLinks.map((item) => <a key={item.platform} href={item.href} target="_blank" rel="noreferrer">{item.platform}<span className="sr-only">（新しいタブで開く）</span></a>)}</nav>
        <small data-reveal style={{ "--reveal-delay": "280ms" } as React.CSSProperties}>© VISAGE</small>
      </div>
    </footer>
  );
}
