import Image from "next/image";
import Link from "next/link";
import type { LiveEvent, NewsItem, Release, Video } from "@/lib/site-data";
import { EmptyState } from "@/components/ui/Editorial";
import styles from "./content-lists.module.css";

export function ReleaseList({ releases }: { releases: Release[] }) {
  if (!releases.length) return <EmptyState>音源情報はまだありません。</EmptyState>;
  return <div className={styles.releases}>{releases.map((release) => <article className={styles.release} key={release.slug}>
    {release.artwork && <Image className={styles.artwork} src={release.artwork} alt="" width={500} height={500} sizes="(max-width: 700px) 100vw, 38vw" data-reveal="photo" />}
    <div className={styles.releaseInfo} data-reveal><span className={styles.meta}>{release.type} / {release.releaseDate}</span><h2>{release.title}</h2>{release.description && <p>{release.description}</p>}
      {release.tracks?.length ? <ol>{release.tracks.map((track) => <li key={track}>{track}</li>)}</ol> : null}
      {release.streamingLinks?.map((link) => <a className={styles.streamingLink} key={link.href} href={link.href} target="_blank" rel="noreferrer">{link.label}<span className="sr-only">（新しいタブで開く）</span></a>)}
      <Link className={styles.detailLink} href={`/music/${release.slug}`}>RELEASE DETAILS <span aria-hidden="true">↗</span></Link>
    </div>
  </article>)}</div>;
}

export function LiveList({ events }: { events: LiveEvent[] }) {
  if (!events.length) return <EmptyState>現在お知らせできる公演情報はありません。</EmptyState>;
  const upcoming = events.filter((event) => !event.archived).sort((a, b) => a.date.localeCompare(b.date));
  const archive = events.filter((event) => event.archived).sort((a, b) => b.date.localeCompare(a.date));
  return <>
    {upcoming.length > 0 && <section className={styles.eventGroup}><h2>UPCOMING</h2>{upcoming.map((event) => <LiveFeature event={event} key={event.slug} />)}</section>}
    {archive.length > 0 && <section className={`${styles.eventGroup} ${styles.archiveGroup}`}><h2>ARCHIVE</h2>{archive.map((event) => <article className={styles.event} key={event.slug}><time>{event.date}</time><div><strong>{event.eventName}</strong><p>{event.venue}</p></div></article>)}</section>}
  </>;
}

export function LiveFeature({ event }: { event: LiveEvent }) {
  return <article className={styles.liveFeature}>
    {event.poster && <Image className={styles.eventPoster} src={event.poster} alt={`${event.eventName} 公演フライヤー`} width={800} height={1132} sizes="(max-width: 700px) 100vw, (max-width: 1000px) 42vw, 520px" data-reveal="photo" />}
    <div className={styles.liveDetails} data-reveal style={{ "--reveal-delay": "100ms" } as React.CSSProperties}>
      <p className={styles.liveEyebrow} data-reveal style={{ "--reveal-delay": "100ms" } as React.CSSProperties}>VISAGE / LIVE</p>
      <h3 className={styles.liveTitle} data-reveal style={{ "--reveal-delay": "180ms" } as React.CSSProperties}>{event.eventName}</h3>
      {event.description && <p className={styles.liveDescription} data-reveal style={{ "--reveal-delay": "260ms" } as React.CSSProperties}>{event.description}</p>}
      <dl className={styles.liveMeta} data-reveal style={{ "--reveal-delay": "340ms" } as React.CSSProperties}>
        <div><dt>DATE / VENUE</dt><dd><time dateTime={event.date}>{event.dateLabel ?? event.date}</time><br />{event.venue}</dd></div>
        {(event.openingTime || event.startTime) && <div><dt>DOORS / SHOW</dt><dd>{event.openingTime && `OPEN ${event.openingTime}`}{event.openingTime && event.startTime && " / "}{event.startTime && `START ${event.startTime}`}</dd></div>}
        {event.admission && <div><dt>ADMISSION</dt><dd>{event.admission}</dd></div>}
        {event.drinkCharge && <div><dt>DRINK</dt><dd>{event.drinkCharge}</dd></div>}
      </dl>
      {event.ticketUrl && <div className={styles.ticketBlock} data-reveal style={{ "--reveal-delay": "420ms" } as React.CSSProperties}><p>{event.ticketNote ?? "チケット予約は下記リンクより。"}</p><a href={event.ticketUrl} target="_blank" rel="noopener noreferrer">TICKET RESERVATION <span aria-hidden="true">↗</span><span className="sr-only">（新しいタブで開く）</span></a></div>}
    </div>
  </article>;
}

export function VideoList({ videos }: { videos: Video[] }) {
  if (!videos.length) return <EmptyState>Official videos will appear here when available.</EmptyState>;
  return <div className={styles.videos}>{videos.map((video, index) => <article className={`${styles.video} ${index === 0 ? styles.videoPrimary : ""}`} key={video.slug} data-reveal style={{ "--reveal-delay": `${(index % 2) * 110}ms` } as React.CSSProperties}>
    <a href={video.youtubeUrl} target="_blank" rel="noopener noreferrer" aria-label={`${video.title ?? "YouTube動画"}を見る（新しいタブで開く）`}>
      <Image src={video.thumbnail} alt="" width={480} height={360} sizes={index === 0 ? "(max-width: 700px) 100vw, 58vw" : "(max-width: 700px) 100vw, 38vw"} data-reveal="photo" /><span aria-hidden="true">↗</span>
    </a><div><span className={styles.videoIndex}>0{index + 1} / YOUTUBE</span>{video.date && <time>{video.date}</time>}{video.title && <h2>{video.title}</h2>}</div>
  </article>)}</div>;
}

export function NewsList({ items }: { items: NewsItem[] }) {
  if (!items.length) return <EmptyState>新しいお知らせはありません。</EmptyState>;
  return <div className={styles.news}>{items.map((item, index) => <div key={item.slug} data-reveal style={{ "--reveal-delay": `${(index % 3) * 100}ms` } as React.CSSProperties}><Link className={`${styles.newsRow} ${item.date ? "" : styles.newsNoDate}`} href={`/news/${item.slug}`}>{item.date && <time dateTime={item.date.replaceAll(".", "-")}>{item.date}</time>}<span>{item.category}</span><strong>{item.title}</strong><i aria-hidden="true">↗</i></Link>{item.externalUrl && <a className={styles.externalNewsLink} href={item.externalUrl} target="_blank" rel="noopener noreferrer">READ INTERVIEW <span aria-hidden="true">↗</span><span className="sr-only">（新しいタブで開く）</span></a>}</div>)}</div>;
}
