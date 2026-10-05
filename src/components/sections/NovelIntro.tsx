"use client";

import { useEffect, useRef } from "react";
import styles from "./novel-intro.module.css";

type Props = { paragraphs: string[]; className: string; emphasisClass: string; closingClass: string };

export function NovelIntro({ paragraphs, className, emphasisClass, closingClass }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const characters = Array.from(root.querySelectorAll<HTMLElement>("[data-novel-char]"));
    let timer: ReturnType<typeof setTimeout> | undefined;
    let observer: IntersectionObserver | undefined;
    let started = false;
    let complete = false;
    let cursor = 0;
    const finish = () => {
      if (complete) return;
      complete = true;
      clearTimeout(timer);
      observer?.disconnect();
      root.dataset.novelComplete = "true";
      root.querySelector<HTMLButtonElement>("button")?.setAttribute("disabled", "");
    };
    const random = (min: number, max: number) => min + Math.random() * (max - min);
    const advance = () => {
      if (complete) return;
      const character = characters[cursor++];
      character.dataset.visible = "true";
      if (cursor === characters.length) return finish();
      const next = characters[cursor];
      const currentParagraph = character.closest("p");
      const nextParagraph = next.closest("p");
      const text = character.textContent;
      let delay = currentParagraph?.dataset.novelClosing ? 75 : random(45, 60);
      // Structural pauses replace punctuation pauses rather than accumulating them.
      if (nextParagraph !== currentParagraph) delay = nextParagraph?.dataset.novelClosing ? 1000 : random(700, 1000);
      else if (text === "\n") delay = random(400, 600);
      else if (next.textContent === "\n") delay = 0;
      else if (text === "、") delay = random(150, 220);
      else if (text === "。" || text === ".") delay = random(350, 500);
      timer = setTimeout(advance, delay);
    };
    const skip = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest("a")) return;
      finish();
    };
    const onMotion = () => { if (motion.matches) finish(); };
    root.addEventListener("click", skip);
    motion.addEventListener("change", onMotion);
    if (motion.matches || !("IntersectionObserver" in window)) finish();
    else {
      root.dataset.novelEnabled = "true";
      observer = new IntersectionObserver(entries => {
        if (!started && entries.some(entry => entry.isIntersecting)) {
          started = true;
          observer?.disconnect();
          root.dataset.novelStarted = "true";
          advance();
        }
      }, { threshold: 0.25, rootMargin: "0px 0px -10% 0px" });
      const firstParagraph = root.querySelector("p");
      if (firstParagraph) observer.observe(firstParagraph);
    }
    return () => {
      clearTimeout(timer);
      observer?.disconnect();
      root.removeEventListener("click", skip);
      motion.removeEventListener("change", onMotion);
      delete root.dataset.novelEnabled;
      delete root.dataset.novelComplete;
      delete root.dataset.novelStarted;
      characters.forEach(character => delete character.dataset.visible);
      root.querySelector<HTMLButtonElement>("button")?.removeAttribute("disabled");
    };
  }, [paragraphs]);

  return <div ref={rootRef} className={`${className} ${styles.novel}`} data-novel-intro>
    {paragraphs.map((paragraph, index) => <p key={paragraph}
      className={index === 1 || index === 2 ? emphasisClass : index === paragraphs.length - 1 ? closingClass : undefined}
      data-novel-closing={index === paragraphs.length - 1 ? "true" : undefined}>
      {Array.from(paragraph).map((character, position) => <span key={position} data-novel-char>{character}</span>)}
    </p>)}
    <button className={styles.hint} type="button" aria-label="紹介文の残りをすべて表示">TAP TO REVEAL</button>
  </div>;
}
