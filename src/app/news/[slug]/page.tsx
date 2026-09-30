import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { newsItems } from "@/lib/site-data";
import styles from "@/components/sections/content-lists.module.css";

export function generateStaticParams() { return newsItems.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: PageProps<"/news/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const item = newsItems.find((entry) => entry.slug === slug);
  return item ? { title: item.title, description: item.body } : {};
}

export default async function NewsArticlePage({ params }: PageProps<"/news/[slug]">) {
  const { slug } = await params;
  const item = newsItems.find((entry) => entry.slug === slug);
  if (!item) notFound();
  return <main id="main-content"><article className={styles.newsArticle}>
    <header className={styles.newsArticleHeader} data-reveal>{item.date && <time dateTime={item.date}>{item.date}</time>}<span>{item.category}</span></header>
    <h1 data-reveal style={{ "--reveal-delay": "100ms" } as React.CSSProperties}>{item.title}</h1>
    <div className={styles.newsArticleContent}>
      {item.image && <Image className={styles.newsArticleImage} src={item.image} alt={`${item.title} 商品画像`} width={1122} height={1402} sizes="(max-width: 700px) 100vw, 42vw" data-reveal="photo" />}
      <p className={styles.newsArticleBody} data-reveal style={{ "--reveal-delay": "130ms" } as React.CSSProperties}>{item.body}</p>
    </div>
  </article></main>;
}
