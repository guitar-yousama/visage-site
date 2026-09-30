import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { releases } from "@/lib/site-data";

export function generateStaticParams() { return releases.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: PageProps<"/music/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const release = releases.find((item) => item.slug === slug);
  return release ? { title: release.title, description: release.description } : {};
}

export default async function ReleasePage({ params }: PageProps<"/music/[slug]">) {
  const { slug } = await params;
  const release = releases.find((item) => item.slug === slug);
  if (!release) notFound();
  return <main id="main-content"><article><h1>{release.title}</h1><p>{release.releaseDate}</p>{release.description && <p>{release.description}</p>}</article></main>;
}
