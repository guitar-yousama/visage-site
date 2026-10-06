"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Member } from "@/lib/site-data";
import styles from "./member-photo.module.css";

export function MemberPhoto({ member, className, children }: { member: Member; className: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open || !dialog.current) return;
    const modal = dialog.current;
    const opener = trigger.current;
    const body = document.body;
    const root = document.documentElement;
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    const properties = ["position", "top", "left", "right", "width", "overflow"] as const;
    const previous = properties.map(key => body.style[key]);
    const behavior = root.style.scrollBehavior;
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    modal.showModal();
    closeButton.current?.focus({ preventScroll: true });
    return () => {
      if (modal.open) modal.close();
      properties.forEach((key, index) => { body.style[key] = previous[index]; });
      root.style.scrollBehavior = "auto";
      window.scrollTo(scrollX, scrollY);
      opener?.focus({ preventScroll: true });
      root.style.scrollBehavior = behavior;
    };
  }, [open]);

  const close = () => dialog.current?.close();
  return <>
    <button ref={trigger} type="button" className={`${className} ${styles.trigger}`} aria-label={`${member.name}の写真を拡大表示`} aria-haspopup="dialog" onClick={() => setOpen(true)}>{children}</button>
    <dialog ref={dialog} className={styles.dialog} aria-modal="true" aria-label={`${member.name}の拡大写真`} onClose={() => setOpen(false)} onCancel={event => { event.preventDefault(); close(); }} onKeyDown={event => { if (event.key === "Tab") { event.preventDefault(); closeButton.current?.focus(); } }} onClick={event => { if (event.target === event.currentTarget || (event.target instanceof HTMLElement && event.target.tagName === "FIGURE")) close(); }}>
      <button ref={closeButton} className={styles.close} type="button" aria-label="拡大写真を閉じる" onClick={close}><span aria-hidden="true">×</span></button>
      {open && member.portrait && <figure className={styles.figure}>
        <Image className={styles.photo} src={member.portrait} alt={`${member.name}のアーティスト写真`} width={member.portraitWidth ?? 800} height={member.portraitHeight ?? 1000} sizes="(max-width: 700px) 92vw, (max-width: 1200px) 90vw, 1200px" />
        <figcaption className={styles.caption}><span className={styles.name}>{member.name}</span><span className={styles.role}>{member.role}</span></figcaption>
      </figure>}
    </dialog>
  </>;
}
