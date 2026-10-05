import type { Metadata } from "next";
import Image from "next/image";
import { SectionPage } from "@/components/sections/SectionPage";
import { members } from "@/lib/site-data";
import styles from "@/components/sections/section-page.module.css";

export const metadata: Metadata = { title: "Member", alternates: { canonical: "https://visage-site.vercel.app/member" } };

export default function MemberPage() {
  return <SectionPage index="06" title="MEMBER" description="FIVE VOICES / ONE VISAGE">
    <div className={styles.roster}>{members.map((member, index) => <article className={styles.person} key={member.name} data-reveal style={{ "--reveal-delay": `${(index % 3) * 100}ms` } as React.CSSProperties}><span>0{index + 1}</span>{member.portrait && <Image className={styles.personPhoto} src={member.portrait} alt={`${member.name}のアーティスト写真`} width={member.portraitWidth ?? 800} height={member.portraitHeight ?? 1000} sizes={index === 0 ? "(max-width: 640px) 90vw, 48vw" : "(max-width: 640px) 42vw, 48vw"} data-reveal="photo" />}<h2>{member.name}</h2><p>{member.role}</p></article>)}</div>
  </SectionPage>;
}
