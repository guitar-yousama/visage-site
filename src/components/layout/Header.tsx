"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
    document.body.classList.toggle("menu-open", menuOpen);
    return () => document.body.classList.remove("menu-open");
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
      <Link className={styles.wordmark} href="/" aria-label="Visage ホーム">VISAGE</Link>
      <nav className={styles.desktopNav} aria-label="メインナビゲーション">
        {siteNavigation.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
      </nav>
      <button ref={menuButtonRef} className={styles.menuButton} type="button" aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen((value) => !value)}>
        <span>{menuOpen ? "CLOSE" : "MENU"}</span><i aria-hidden="true" />
      </button>
      <nav id="mobile-navigation" className={styles.mobileNav} aria-label="モバイルナビゲーション" inert={!menuOpen}>
        <div className={styles.mobileLinks}>
          {siteNavigation.map((item, index) => <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}><small>0{index + 1}</small>{item.label}</Link>)}
        </div>
        <div className={styles.mobileSocials}>
          {socialLinks.map((item) => <a key={item.platform} href={item.href} target="_blank" rel="noreferrer">{item.platform}</a>)}
        </div>
        <p>KUMAMOTO / JAPAN</p>
      </nav>
    </header>
  );
}
