"use client";

import { useEffect, useRef } from "react";
import { LIGHTNING_EVENT, LIGHTNING_CANCEL_EVENT, type LightningDetail } from "@/lib/atmosphere-events";
import styles from "./background-atmosphere.module.css";

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

export function BackgroundAtmosphere() {
  const lightningRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lightning = lightningRef.current;
    if (!lightning) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setTimeout> | undefined;
    let strike: Animation | undefined;
    let disposed = false;
    const canAnimate = () => !disposed && !document.hidden && !preference.matches;
    const stop = () => {
      clearTimeout(timer);
      timer = undefined;
      window.dispatchEvent(new Event(LIGHTNING_CANCEL_EVENT));
      if (strike) {
        strike.onfinish = null;
        strike.cancel();
        strike = undefined;
      }
    };
    const schedule = () => {
      if (!canAnimate()) return;
      // One timeout only: a fresh 4–11 second interval after each completed strike.
      timer = setTimeout(flash, randomBetween(4_000, 11_000));
    };
    const flash = () => {
      timer = undefined;
      if (!canAnimate() || typeof lightning.animate !== "function") return;
      const pulses = Math.random() < .5 ? 2 : 3;
      const strength = window.matchMedia("(max-width: 700px)").matches
        ? randomBetween(.38, .52) : randomBetween(.5, .7);
      const frames: Keyframe[] = [{ opacity: 0, offset: 0 }];
      const anchors = pulses === 2 ? [.08, .5] : [.04, .34, .65];
      anchors.forEach((anchor, index) => {
        const start = anchor + randomBetween(0, .04);
        const peak = index === 0 ? strength : strength * randomBetween(.38, .7);
        frames.push(
          { opacity: 0, offset: start },
          { opacity: peak, offset: start + randomBetween(.035, .065) },
          { opacity: 0, offset: start + randomBetween(.13, .18) },
        );
      });
      frames.push({ opacity: 0, offset: 1 });
      const x = randomBetween(25, 75);
      const duration = randomBetween(420, 780);
      const startedAt = Number(document.timeline.currentTime ?? performance.now());
      lightning.style.setProperty("--strike-x", `${x}%`);
      strike = lightning.animate(frames, {
        duration,
        easing: "linear",
      });
      strike.startTime = startedAt;
      window.dispatchEvent(new CustomEvent<LightningDetail>(LIGHTNING_EVENT, { detail: { frames, duration, startedAt, x } }));
      strike.onfinish = () => {
        strike = undefined;
        schedule();
      };
    };
    const sync = () => {
      stop();
      schedule();
    };
    schedule();
    document.addEventListener("visibilitychange", sync);
    preference.addEventListener("change", sync);
    return () => {
      disposed = true;
      stop();
      document.removeEventListener("visibilitychange", sync);
      preference.removeEventListener("change", sync);
    };
  }, []);

  return (
    <div className={styles.atmosphere} aria-hidden="true" data-background-atmosphere>
      <div className={styles.mistFar} data-atmosphere-layer="distant-mist" />
      <div className={styles.mistNear} data-atmosphere-layer="near-mist" />
      <div className={styles.moonlight} data-atmosphere-layer="moonlight" />
      <div ref={lightningRef} className={styles.lightning} data-atmosphere-layer="lightning" />
    </div>
  );
}
