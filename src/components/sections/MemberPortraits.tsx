import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { members } from "@/lib/site-data";
import styles from "./member-portraits.module.css";

export function MemberPortraits({ linked = false }: { linked?: boolean }) {
  return <div className={styles.ensemble} data-member-ensemble>
    {members.map((member, index) => {
      const content = <>
        <div className={styles.portrait}>
          {member.portrait && <Image src={member.portrait} alt={linked ? `${member.name} — ${member.role}` : `${member.name}のアーティスト写真`}
            width={member.portraitWidth ?? 800} height={member.portraitHeight ?? 1000}
            sizes="(max-width: 600px) 78vw, (max-width: 1199px) 40vw, (max-width: 1440px) 17vw, 235px" />}
          <span className={styles.edge} aria-hidden="true" />
        </div>
        <div className={styles.caption}>
          <span className={styles.index}>0{index + 1}</span>
          <div>{linked ? <strong className={styles.name}>{member.name}</strong> : <h2 className={styles.name}>{member.name}</h2>}<p className={styles.role}>{member.role}</p></div>
          {linked && <span className={styles.arrow} aria-hidden="true">↗</span>}
        </div>
      </>;
      const props = { className: styles.member, "data-reveal": "photo", "data-member-portrait": member.name, style: { "--reveal-delay": `${index * 90}ms` } as CSSProperties };
      return linked ? <Link key={member.name} href="/member" {...props}>{content}</Link> : <article key={member.name} {...props}>{content}</article>;
    })}
  </div>;
}
