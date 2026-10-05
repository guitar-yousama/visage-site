import type { MetadataRoute } from "next";
import { newsItems, releases } from "@/lib/site-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://visage-site.vercel.app";
  const paths = ["/", "/news", "/live", "/music", "/video", "/member", "/profile", ...newsItems.map(item => `/news/${item.slug}`), ...releases.map(item => `/music/${item.slug}`)];
  return paths.map((path) => ({ url: `${base}${path}`, changeFrequency: "weekly", priority: path === "/" ? 1 : .7 }));
}
