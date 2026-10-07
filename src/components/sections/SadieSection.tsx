"use client";
import Image from "next/image";
import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";
import styles from "./sadie-section.module.css";
import homeStyles from "./home-sections.module.css";
import { SectionHeading } from "@/components/ui/Editorial";

const sadieUrl = "https://visage-sadie.studio.site/";

type SadieBanner = { src: string; width: number; height: number };

// Supply only the user's original banner; never substitute another image.
export function SadieSection({ banner }: { banner?: SadieBanner }) {
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const image = section.querySelector<HTMLElement>("[data-sadie-image]");
    if (!image) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { image.dataset.zoomActive = "true"; observer.disconnect(); }
    }, { threshold: .15 });
    observer.observe(image);
    return () => observer.disconnect();
  }, []);
  return (
    <section ref={sectionRef} className={homeStyles.section} aria-labelledby="sadie-title">
      <div className={styles.gateway}>
        <SectionHeading index="08" title="MEET SADIE" note="OFFICIAL CHARACTER" id="sadie-title" />
        <p className={styles.description} data-reveal style={{ "--reveal-delay": "120ms" } as CSSProperties}>Visageの世界を案内する、魔界最強（候補）の愛くるしい案内人。</p>
        {banner && <a className={styles.banner} href={sadieUrl} target="_blank" rel="noopener noreferrer" data-reveal style={{ "--reveal-delay": "160ms" } as CSSProperties}>
          <Image className={styles.bannerImage} data-sadie-image src={banner.src} alt="Visage公式キャラクターSadie（サディ）" width={banner.width} height={banner.height} sizes="(max-width: 400px) calc(100vw - 40px), (max-width: 1066px) 90vw, 960px" />
          <span className={styles.bannerCopy}>
            <span className={styles.bannerTitle}>What’s Sadie?</span>
            <span className={styles.bannerBody}>魔界からやってきた、Visageワールドの案内人。</span>
          </span>
          <span className="sr-only">Sadie公式サイトへ（新しいタブで開く）</span>
        </a>}
        <a className={styles.cta} href={sadieUrl} target="_blank" rel="noopener noreferrer" data-reveal style={{ "--reveal-delay": "200ms" } as CSSProperties}>
          <span>ENTER SADIE&apos;S WORLD<span className="sr-only">（新しいタブで開く）</span></span><i aria-hidden="true">↗</i>
        </a>
      </div>
    </section>
  );
}
