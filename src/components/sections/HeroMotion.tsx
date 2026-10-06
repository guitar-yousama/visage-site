"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { LIGHTNING_EVENT, LIGHTNING_CANCEL_EVENT, type LightningDetail } from "@/lib/atmosphere-events";

export function HeroMotion({ className, children }: { className: string; children: ReactNode }) {
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const glow = heroRef.current?.querySelector<HTMLElement>("[data-hero-logo-glow]");
    if (!glow) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const normal = "drop-shadow(0 0 3px rgb(155 185 216 / 22%)) drop-shadow(0 0 10px rgb(126 160 201 / 13%))";
    const dim = "drop-shadow(0 0 2px rgb(155 185 216 / 7%)) drop-shadow(0 0 6px rgb(126 160 201 / 4%))";
    const bright = "drop-shadow(0 0 5px rgb(155 185 216 / 46%)) drop-shadow(0 0 16px rgb(126 160 201 / 25%))";
    let visible = false;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let flicker: Animation | undefined;
    const allowed = () => !disposed && visible && !document.hidden && !preference.matches;
    const stop = () => {
      clearTimeout(timer);
      timer = undefined;
      if (flicker) { flicker.onfinish = null; flicker.cancel(); flicker = undefined; }
    };
    const schedule = () => {
      if (!allowed()) return;
      timer = setTimeout(() => {
        timer = undefined;
        if (!allowed()) return;
        const pulses = 1 + Math.floor(Math.random() * 3);
        const frames: Keyframe[] = [{ opacity: 1, filter: normal, offset: 0 }];
        let duration = 0;
        for (let i = 0; i < pulses; i++) {
          const length = 60 + Math.random() * 160;
          const dipOnly = Math.random() < .25;
          frames.push(
            { opacity: Math.random() < .2 ? .18 + Math.random() * .17 : .62 + Math.random() * .18, filter: dim, offset: duration + length * (.12 + Math.random() * .12) },
            { opacity: 1, filter: dipOnly ? normal : bright, offset: duration + length * (.35 + Math.random() * .12) },
            { opacity: dipOnly ? 1 : .8 + Math.random() * .13, filter: dipOnly ? normal : dim, offset: duration + length * (.6 + Math.random() * .12) },
            { opacity: 1, filter: normal, offset: duration + length },
          );
          duration += length;
        }
        frames.forEach(frame => { frame.offset = Number(frame.offset) / duration; });
        flicker = glow.animate(frames, { duration, easing: "ease-in-out" });
        flicker.onfinish = () => { flicker = undefined; schedule(); };
      }, 1_500 + Math.random() * 3_000);
    };
    const sync = () => { stop(); schedule(); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    observer.observe(glow);
    document.addEventListener("visibilitychange", sync);
    preference.addEventListener("change", sync);
    return () => {
      disposed = true;
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      preference.removeEventListener("change", sync);
    };
  }, []);

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
