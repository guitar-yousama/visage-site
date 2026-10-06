import { GalleryCarousel } from "./GalleryCarousel";
import { galleryPhotos } from "@/lib/gallery-data";
import { NovelIntro } from "./NovelIntro";
import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import { liveEvents, newsItems, profileCopy, releases, siteAssets, socialLinks, videos } from "@/lib/site-data";
import { EditorialLink, EmptyState, SectionHeading } from "@/components/ui/Editorial";
import { LiveFeature, VideoList } from "@/components/sections/ContentLists";
import { HeroMotion } from "./HeroMotion";
import { SadieSection } from "./SadieSection";
import { MemberPortraits } from "./MemberPortraits";
import styles from "./home-sections.module.css";

export function Hero() {
  return (
    <HeroMotion className={styles.hero}>

      <div className={styles.heroMeta}><span>ARTIST / VISAGE</span><span>VISUAL KEI / HEAVY ROCK</span></div>
      <div className={styles.heroCore}>
        <h1 id="hero-title"><span className={styles.heroLogoGlow} data-hero-logo-glow>{siteAssets.logo ? <Image className={styles.heroLogo} src={siteAssets.logo.src} alt="" width={siteAssets.logo.width} height={siteAssets.logo.height} loading="eager" sizes="(max-width: 365px) 190px, (max-width: 423px) 52vw, (max-width: 700px) 220px, (max-width: 1547px) 42vw, 650px" /> : "VISAGE"}</span><span className={styles.heroLogoReflection} aria-hidden="true"><i /></span><span className={styles.heroIdentity}>Visage（ヴィサージュ）｜熊本ヴィジュアル系バンド</span></h1>
        <div className={styles.heroFoot}><p>We Rise from Beautiful Decay</p><span>KUMAMOTO / JAPAN</span></div>
      </div>
      {siteAssets.heroPhoto && <div className={styles.heroPhotoFrame} data-ambient-light><div className={styles.heroPhotoMotion} data-hero-photo-motion><Image className={styles.heroPhoto} src={siteAssets.heroPhoto.src} alt="熊本・九州を拠点に活動するヴィジュアル系ロックバンド Visage" width={siteAssets.heroPhoto.width} height={siteAssets.heroPhoto.height} fetchPriority="high" loading="eager" sizes="100vw" /></div><span className={styles.heroScrollShade} aria-hidden="true" /><span className={styles.heroLightning} data-hero-lightning aria-hidden="true" /></div>}
      <a className={styles.scrollCue} href="#latest"><span>SCROLL</span><i aria-hidden="true" /></a>
      <span className={styles.heroIndex} aria-hidden="true">01 — 08</span>
    </HeroMotion>
  );
}

export function HomeSections() {
  const nextShow = liveEvents.filter((event) => !event.archived).sort((a, b) => a.date.localeCompare(b.date))[0];
  const latestItems = [
    ...newsItems.map((item) => ({ date: item.date?.replaceAll(".", "-") ?? "", displayDate: item.date, category: item.category, title: item.title, href: `/news/${item.slug}` })),
    ...liveEvents.filter((event) => !event.archived).map((event) => ({ date: event.date, displayDate: event.dateLabel ?? event.date, category: "LIVE", title: event.eventName, href: "/live" })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);

  return (
    <>
      <section className={styles.section} id="latest">
        <SectionHeading index="01" title="LATEST" note="NEWS / LIVE / INFO" />
        {latestItems.length ? latestItems.map((item, index) => <Link className={`${styles.newsRow} ${item.displayDate ? "" : styles.newsRowNoDate}`} key={`${item.category}-${item.date}-${item.title}`} href={item.href} data-reveal style={{ "--reveal-delay": `${index * 110}ms` } as CSSProperties}>{item.displayDate && <time>{item.displayDate}</time>}<span>{item.category}</span><strong>{item.title}</strong><i aria-hidden="true">↗</i></Link>) : <EmptyState>最新のお知らせはありません。</EmptyState>}
        <div className={styles.endLink}><EditorialLink href="/news">ALL NEWS</EditorialLink></div>
      </section>

      <section className={`${styles.section} ${styles.liveSection}`}>
        <SectionHeading index="02" title="LIVE" note="RAW / PRESENT / HERE" />
        {nextShow ? <><LiveFeature event={nextShow} /><div className={styles.endLink}><EditorialLink href="/live">ALL LIVE INFORMATION</EditorialLink></div></> : <div className={`${styles.liveComposition} ${siteAssets.livePhoto ? styles.liveWithPhoto : ""}`}>
          {siteAssets.livePhoto && <Image className={styles.livePhoto} src={siteAssets.livePhoto.src} alt="Visageのライブ風景" fill sizes="100vw" style={{ objectPosition: siteAssets.livePhoto.objectPosition ?? "center" }} />}
          <p className={styles.liveWhisper}>A BAND MADE<br />FOR THE MOMENT.</p>
          <div className={styles.liveInfo}><span>NEXT SHOW</span><p>公演情報は<br />現在ありません。</p><EditorialLink href="/live">LIVE INFORMATION</EditorialLink></div>
          <span className={styles.liveVertical}>VISAGE — LIVE</span>
        </div>}
      </section>

      <section className={`${styles.section} ${styles.musicSection}`}>
        <SectionHeading index="03" title="MUSIC" note="DARKNESS / HEAVY SOUND" />
        <div className={styles.musicStatement}><p data-reveal>DARKNESS.<br />HEAVY SOUND.<br /><em>BEAUTIFUL DECAY.</em></p><div data-reveal style={{ "--reveal-delay": "140ms" } as CSSProperties}><span>VISAGE</span><EditorialLink href="/music">DISCOGRAPHY</EditorialLink></div></div>
        {releases.length > 0 && <p className={styles.releaseCount}>{releases.length} RELEASE{releases.length === 1 ? "" : "S"}</p>}
      </section>

      <section className={styles.section} id="gallery">
        <SectionHeading index="—" title="GALLERY" note="LIVE / VISAGE" />
        <div data-reveal><GalleryCarousel photos={galleryPhotos} /></div>
      </section>

      <section className={styles.section}>
        <SectionHeading index="04" title="VIDEO" note="IMAGE / SOUND / MOTION" />
        {videos.length ? <VideoList videos={videos} /> : <EmptyState>Official video information will be announced here.</EmptyState>}
        <div className={styles.endLink}><EditorialLink href="/video">ALL VIDEOS</EditorialLink></div>
      </section>

      <section className={styles.profileSection}>
        <div className={styles.profileLabel}><span>05 / PROFILE</span><span>VISUAL KEI / KUMAMOTO</span></div>
        <h2 className={styles.profileHeading} data-reveal>{profileCopy.heading}</h2>
        <p className={styles.profileEntityIntro}>Visage（ヴィサージュ）は、熊本を拠点に活動するヴィジュアル系バンド。美しく退廃的な世界観と、鋭く重いロックサウンドを届けます。</p>
        <NovelIntro paragraphs={profileCopy.paragraphs} className={styles.profileManifesto} emphasisClass={styles.profileEmphasis} closingClass={styles.profileClosing} />
        <div data-reveal style={{ "--reveal-delay": "120ms" } as CSSProperties}><EditorialLink href="/profile">ABOUT VISAGE</EditorialLink></div>
      </section>

      <section className={styles.section}>
        <SectionHeading index="06" title="MEMBER" note="FIVE VOICES / ONE VISAGE" />
        <MemberPortraits linked />
        <div className={styles.endLink}><EditorialLink href="/member">MEET THE MEMBERS</EditorialLink></div>
      </section>

      <section className={`${styles.section} ${styles.socialSection}`} id="follow">
        <SectionHeading index="07" title="FOLLOW" note="FOUR WINDOWS INTO VISAGE" />
        <div className={styles.socialList}>{socialLinks.map((link, index) => <a href={link.href} key={link.platform} target="_blank" rel="noreferrer" title={`Visage Official ${link.platform}`} aria-label={`Visage Official ${link.platform}: ${link.handle}`} data-reveal style={{ "--reveal-delay": `${(index % 2) * 110}ms` } as CSSProperties}><small>{link.role}</small><strong>{link.platform}</strong><span>{link.handle}</span><i aria-hidden="true">↗</i></a>)}</div>
      </section>

      <SadieSection banner={{ src: "/assets/images/sadie/sadiebanner.png", width: 1672, height: 941 }} />
    </>
  );
}
