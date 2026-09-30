"use client";

import { useEffect } from "react";

export function ScrollMotion() {
  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    root.dataset.motionReady = "true";
    const revealed = new WeakSet<Element>();
    const pending = new Set<HTMLElement>();
    const reveal = (element: Element) => {
      element.setAttribute("data-revealed", "true");
      revealed.add(element);
      pending.delete(element as HTMLElement);
      observer?.unobserve(element);
    };
    const observer = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        reveal(entry.target);
      }
    }, { threshold: 0.08, rootMargin: "0px 0px -7% 0px" }) : null;

    const revealVisible = () => {
      for (const element of pending) {
        const bounds = element.getBoundingClientRect();
        if (bounds.top < window.innerHeight * 0.93 && bounds.bottom > 0) reveal(element);
      }
    };
    let frame = 0;
    const scheduleVisibleCheck = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        revealVisible();
      });
    };

    const observe = (node: ParentNode) => {
      if (node instanceof HTMLElement) observeNode(node);
      node.querySelectorAll<HTMLElement>("[data-reveal]:not([data-revealed='true'])").forEach((element) => {
        if (revealed.has(element)) return;
        if (observer) observer.observe(element);
        else pending.add(element);
      });
      if (!observer) scheduleVisibleCheck();
    };

    const observeNode = (element: HTMLElement) => {
      if (element.matches("[data-reveal]:not([data-revealed='true'])")) {
        if (observer) observer.observe(element);
        else pending.add(element);
      }
    };

    observe(document);
    const mutations = new MutationObserver((records) => {
      for (const record of records) record.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          observeNode(node);
          observe(node);
        }
      });
    });
    mutations.observe(document.body, { childList: true, subtree: true });
    if (!observer) {
      window.addEventListener("scroll", scheduleVisibleCheck, { passive: true });
      window.addEventListener("resize", scheduleVisibleCheck);
    }

    return () => {
      observer?.disconnect();
      mutations.disconnect();
      if (!observer) {
        window.removeEventListener("scroll", scheduleVisibleCheck);
        window.removeEventListener("resize", scheduleVisibleCheck);
        window.cancelAnimationFrame(frame);
      }
      delete root.dataset.motionReady;
    };
  }, []);

  return null;
}
