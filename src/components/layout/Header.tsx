"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { siteNavigation, socialLinks } from "@/lib/site-data";
import styles from "./header.module.css";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const body = document.body;
    const root = document.documentElement;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const properties = ["position", "top", "left", "right", "width", "overflow"] as const;
    const previous = properties.map(key => body.style[key]);
    const scrollBehavior = root.style.scrollBehavior;
    body.classList.add("menu-open");
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    const desktop = window.matchMedia("(min-width: 901px)");
    const closeOnDesktop = () => { if (desktop.matches) setMenuOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      desktop.removeEventListener("change", closeOnDesktop);
      body.classList.remove("menu-open");
      properties.forEach((key, index) => { body.style[key] = previous[index]; });
      root.style.scrollBehavior = "auto";
      window.scrollTo(scrollX, scrollY);
      root.style.scrollBehavior = scrollBehavior;
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ""} ${menuOpen ? styles.open : ""}`}>
      <Link className={styles.wordmark} href="/" aria-label="Visage ホーム"><Image className={styles.logo} src="/assets/images/hero/visage_wh.png" alt="Visage" width={790} height={322} sizes="(max-width: 900px) 90px, 110px" /></Link>
      <nav className={styles.desktopNav} aria-label="メインナビゲーション">
        {siteNavigation.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
      </nav>
      <button ref={menuButtonRef} className={styles.menuButton} type="button" aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen((value) => !value)}>
        <span>{menuOpen ? "CLOSE" : "MENU"}</span><i aria-hidden="true" />
      </button>
      <nav id="mobile-navigation" className={styles.mobileNav} aria-label="モバイルナビゲーション" inert={!menuOpen}>
        <div className={styles.mobileLinks}>
          {siteNavigation.map((item, index) => <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}><small>0{index + 1}</small>{item.label}</Link>)}
          <Link href="/#follow" onClick={() => flushSync(() => setMenuOpen(false))}><small>07</small>FOLLOW</Link>
          <Link href="/#sadie-title" onClick={() => flushSync(() => setMenuOpen(false))}><small>08</small>MEET SADIE</Link>
        </div>
        <div className={styles.mobileSocials}>
          {socialLinks.map((item) => <a key={item.platform} href={item.href} target="_blank" rel="noreferrer">{item.platform}</a>)}
        </div>
        <p>KUMAMOTO / JAPAN</p>
      </nav>
    </header>
  );
}
