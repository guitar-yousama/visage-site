"use client";

import { useEffect } from "react";

export function ScrollMotion() {
  useEffect(() => {
    const root = document.documentElement;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let stopMotion = () => {};

    const syncVisibility = () => {
      root.dataset.motionPaused = String(document.hidden);
    };

    const startMotion = () => {
      stopMotion();
      if (preference.matches) return;

      const pending = new Set<HTMLElement>();
      const lights = new Set<HTMLElement>();
      let frame = 0;
      const reveal = (element: HTMLElement) => {
        element.dataset.revealed = "true";
        pending.delete(element);
        observer?.unobserve(element);
      };
      const observer = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
        for (const entry of entries) {
          const element = entry.target as HTMLElement;
          if (element.hasAttribute("data-ambient-light")) {
            element.dataset.lightActive = String(entry.isIntersecting);
          } else if (entry.isIntersecting) {
            reveal(element);
          }
        }
      }, { threshold: 0.08, rootMargin: "0px 0px -7% 0px" }) : null;

      // Only older browsers without IntersectionObserver use scroll events.
      const checkVisible = () => {
        for (const element of pending) {
          const bounds = element.getBoundingClientRect();
          if (bounds.top < window.innerHeight * 0.93 && bounds.bottom > 0) reveal(element);
        }
        for (const element of lights) {
          const bounds = element.getBoundingClientRect();
          element.dataset.lightActive = String(bounds.top < window.innerHeight && bounds.bottom > 0);
        }
      };
      const scheduleVisibleCheck = () => {
        if (frame || document.hidden) return;
        frame = window.requestAnimationFrame(() => {
          frame = 0;
          checkVisible();
        });
      };
      const observeElement = (element: HTMLElement) => {
        if (element.hasAttribute("data-ambient-light")) {
          if (lights.has(element)) return;
          lights.add(element);
          observer?.observe(element);
        } else if (element.hasAttribute("data-reveal") && element.dataset.revealed !== "true") {
          if (pending.has(element)) return;
          pending.add(element);
          observer?.observe(element);
        }
      };
      const observe = (node: ParentNode) => {
        if (node instanceof HTMLElement) observeElement(node);
        node.querySelectorAll<HTMLElement>("[data-reveal], [data-ambient-light]").forEach(observeElement);
        if (!observer) scheduleVisibleCheck();
      };
      const forget = (node: Node) => {
        if (!(node instanceof HTMLElement)) return;
        for (const element of [node, ...node.querySelectorAll<HTMLElement>("[data-reveal], [data-ambient-light]")]) {
          pending.delete(element);
          lights.delete(element);
          observer?.unobserve(element);
        }
      };
      const revealFocused = (event: FocusEvent) => {
        if (!(event.target instanceof HTMLElement)) return;
        let element: HTMLElement | null = event.target;
        while (element) {
          if (element.hasAttribute("data-reveal")) reveal(element);
          element = element.parentElement;
        }
      };
      // Reveal the initial viewport before enabling hidden states, preventing a flash.
      observe(document);
      checkVisible();
      root.dataset.motionReady = "true";
      const mutations = new MutationObserver((records) => {
        for (const record of records) {
          record.removedNodes.forEach(forget);
          record.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) observe(node);
          });
        }
      });
      mutations.observe(document.body, { childList: true, subtree: true });
      document.addEventListener("focusin", revealFocused);
      if (!observer) {
        window.addEventListener("scroll", scheduleVisibleCheck, { passive: true });
        window.addEventListener("resize", scheduleVisibleCheck);
        document.addEventListener("visibilitychange", scheduleVisibleCheck);
      }
      stopMotion = () => {
        observer?.disconnect();
        mutations.disconnect();
        window.cancelAnimationFrame(frame);
        document.removeEventListener("focusin", revealFocused);
        if (!observer) {
          window.removeEventListener("scroll", scheduleVisibleCheck);
          window.removeEventListener("resize", scheduleVisibleCheck);
          document.removeEventListener("visibilitychange", scheduleVisibleCheck);
        }
        for (const element of lights) delete element.dataset.lightActive;
        delete root.dataset.motionReady;
      };
    };

    syncVisibility();
    startMotion();
    document.addEventListener("visibilitychange", syncVisibility);
    preference.addEventListener("change", startMotion);
    return () => {
      stopMotion();
      document.removeEventListener("visibilitychange", syncVisibility);
      preference.removeEventListener("change", startMotion);
      delete root.dataset.motionPaused;
    };
  }, []);

  return null;
}
