"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import styles from "./gallery-carousel.module.css";

type Photo = { src: string; width: number; height: number };

export function GalleryCarousel({ photos }: { photos: Photo[] }) {
  const root = useRef<HTMLDivElement>(null);
  const ready = useRef(new Set<number>());
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const element = root.current;
    if (!element || photos.length < 2) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    let hovered = window.matchMedia("(hover: hover) and (pointer: fine)").matches && element.matches(":hover");
    let focused = element.contains(document.activeElement);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sync = () => {
      clearTimeout(timer);
      if (paused || motion.matches || document.hidden || !visible || hovered || focused) return;
      timer = setTimeout(() => {
        const next = (active + 1) % photos.length;
        if (ready.current.has(next)) setActive(next);
        else sync();
      }, 4000);
    };
    const observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      sync();
    }, { threshold: 0.15 });
    const enter = (event: PointerEvent) => { if (event.pointerType === "mouse") { hovered = true; sync(); } };
    const leave = () => { hovered = false; sync(); };
    const focus = () => { focused = true; sync(); };
    const blur = (event: FocusEvent) => {
      focused = element.contains(event.relatedTarget as Node | null);
      sync();
    };
    observer.observe(element);
    element.addEventListener("pointerenter", enter);
    element.addEventListener("pointerleave", leave);
    element.addEventListener("focusin", focus);
    element.addEventListener("focusout", blur);
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", sync);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      element.removeEventListener("pointerenter", enter);
      element.removeEventListener("pointerleave", leave);
      element.removeEventListener("focusin", focus);
      element.removeEventListener("focusout", blur);
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", sync);
    };
  }, [active, paused, photos.length]);

  if (!photos.length) return null;
  const previous = (active - 1 + photos.length) % photos.length;
  const next = (active + 1) % photos.length;
  return <div ref={root} className={styles.gallery} role="region" aria-roledescription="カルーセル" aria-label="Visageライブフォト" data-gallery>
    <div className={styles.stage}>
      {photos.map((photo, index) => (index === active || index === previous || index === next) && <div key={photo.src}
        className={styles.slide} data-active={index === active} aria-hidden={index !== active}
        role="group" aria-roledescription="スライド" aria-label={`${index + 1} / ${photos.length}`}>
        <Image src={photo.src} alt={`Visageライブフォト ${index + 1}`} width={photo.width} height={photo.height}
          className={styles.photo} sizes="(max-width: 700px) 90vw, (max-width: 1440px) 90vw, 1280px"
          loading="lazy" onLoad={() => ready.current.add(index)} />
      </div>)}
    </div>
    <div className={styles.controls}>
      <span className={styles.counter} aria-live={paused ? "polite" : "off"}>{String(active + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}</span>
      <div className={styles.buttons}>
        <button type="button" aria-label="前の写真" onClick={() => setActive(previous)}>←</button>
        <button type="button" className={styles.pause} aria-pressed={paused} aria-label={paused ? "自動再生を再開" : "自動再生を一時停止"} onClick={() => setPaused(value => !value)}>{paused ? "PLAY" : "PAUSE"}</button>
        <button type="button" aria-label="次の写真" onClick={() => setActive(next)}>→</button>
      </div>
    </div>
  </div>;
}
