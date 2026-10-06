import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { newsItems } from "@/lib/site-data";
import styles from "@/components/sections/content-lists.module.css";

export function generateStaticParams() { return newsItems.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: PageProps<"/news/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const item = newsItems.find((entry) => entry.slug === slug);
  if (!item) return {};
  const url = `https://visage-site.vercel.app/news/${item.slug}`;
  return { title: item.title, description: item.seoDescription ?? item.body, alternates: { canonical: url },
    ...(item.seoDescription ? {
      openGraph: { title: item.title, description: item.seoDescription, url, type: "article", locale: "ja_JP", siteName: "Visage Official Website", images: [{ url: "/assets/images/hero/hero_02.webp", width: 1920, height: 1080, alt: "熊本を拠点に活動するヴィジュアル系ロックバンド Visage" }] },
      twitter: { card: "summary_large_image", title: item.title, description: item.seoDescription, images: ["/assets/images/hero/hero_02.webp"] },
    } : {}),
  };
}

export default async function NewsArticlePage({ params }: PageProps<"/news/[slug]">) {
  const { slug } = await params;
  const item = newsItems.find((entry) => entry.slug === slug);
  if (!item) notFound();
  const linkPosition = item.bodyLink ? item.body.indexOf(item.bodyLink.text) : -1;
  return <main id="main-content"><article className={styles.newsArticle}>
    <header className={styles.newsArticleHeader} data-reveal>{item.date && <time dateTime={item.date.replaceAll(".", "-")}>{item.date}</time>}<span>{item.category}</span></header>
    <h1 data-reveal style={{ "--reveal-delay": "100ms" } as React.CSSProperties}>{item.title}</h1>
    <div className={`${styles.newsArticleContent} ${item.image ? "" : styles.newsArticleTextOnly}`}>
      {item.image && <Image className={styles.newsArticleImage} src={item.image} alt={`${item.title} 商品画像`} width={1122} height={1402} sizes="(max-width: 700px) 100vw, 42vw" data-reveal="photo" />}
      <div>
        <p className={styles.newsArticleBody} data-reveal style={{ "--reveal-delay": "130ms" } as React.CSSProperties}>{item.bodyLink && linkPosition >= 0 ? <>{item.body.slice(0, linkPosition)}<a href={item.bodyLink.href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline", textUnderlineOffset: ".2em" }}>{item.bodyLink.text}</a>{item.body.slice(linkPosition + item.bodyLink.text.length)}</> : item.body}</p>
        {item.externalUrl && <a className={styles.detailLink} href={item.externalUrl} target="_blank" rel="noopener noreferrer">READ INTERVIEW <span aria-hidden="true">↗</span><span className="sr-only">（新しいタブで開く）</span></a>}
      </div>
    </div>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "Article", headline: item.title, datePublished: item.date?.replaceAll(".", "-"), dateModified: item.date?.replaceAll(".", "-"), mainEntityOfPage: `https://visage-site.vercel.app/news/${item.slug}`, author: { "@id": "https://visage-site.vercel.app/#visage" }, publisher: { "@id": "https://visage-site.vercel.app/#visage" }, about: { "@id": "https://visage-site.vercel.app/#visage" } }) }} />
  </article></main>;
}
