"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { LIGHTNING_EVENT, LIGHTNING_CANCEL_EVENT, type LightningDetail } from "@/lib/atmosphere-events";

export function HeroMotion({ className, children }: { className: string; children: ReactNode }) {
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = window.matchMedia("(max-width: 700px)");
    const photo = hero.querySelector<HTMLElement>("[data-hero-photo-motion]");
    const flash = hero.querySelector<HTMLElement>("[data-hero-lightning]");
    let visible = false;
    let frame = 0;
    let strike: Animation | undefined;
    const stopStrike = () => { strike?.cancel(); strike = undefined; };
    const canAnimate = () => visible && !document.hidden && !preference.matches;
    const update = () => {
      frame = 0;
      if (!canAnimate()) return;
      const bounds = hero.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, -bounds.top / (bounds.height * .75)));
      // Keep the existing scroll translation below one pixel at typical viewport sizes.
      hero.style.setProperty("--hero-photo-y", `${progress * (photo?.offsetHeight ?? 0) * (mobile.matches ? .0004 : .0006)}px`);
      hero.style.setProperty("--hero-core-y", `${progress * (mobile.matches ? 3 : 7)}px`);
      hero.style.setProperty("--hero-shade", `${progress * .12}`);
    };
    const schedule = () => {
      if (!frame && canAnimate()) frame = requestAnimationFrame(update);
    };
    const sync = () => {
      hero.dataset.heroActive = String(canAnimate());
      if (!canAnimate()) {
        cancelAnimationFrame(frame);
        frame = 0;
        stopStrike();
        if (preference.matches) {
          hero.style.removeProperty("--hero-photo-y");
          hero.style.removeProperty("--hero-core-y");
          hero.style.removeProperty("--hero-shade");
        }
      } else schedule();
    };
    const receiveStrike = (event: Event) => {
      if (!canAnimate() || !flash || typeof flash.animate !== "function") return;
      const detail = (event as CustomEvent<LightningDetail>).detail;
      stopStrike();
      flash.style.setProperty("--strike-x", `${detail.x}%`);
      strike = flash.animate(detail.frames, { duration: detail.duration, easing: "linear" });
      strike.startTime = detail.startedAt;
    };
    const observer = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      sync();
    }, { threshold: 0 });
    observer.observe(hero);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener(LIGHTNING_EVENT, receiveStrike);
    window.addEventListener(LIGHTNING_CANCEL_EVENT, stopStrike);
    document.addEventListener("visibilitychange", sync);
    preference.addEventListener("change", sync);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      stopStrike();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener(LIGHTNING_EVENT, receiveStrike);
      window.removeEventListener(LIGHTNING_CANCEL_EVENT, stopStrike);
      document.removeEventListener("visibilitychange", sync);
      preference.removeEventListener("change", sync);
    };
  }, []);

  return <section ref={heroRef} className={className} aria-labelledby="hero-title" data-hero-motion>{children}</section>;
}
