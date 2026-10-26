import type { Metadata } from "next";
import Image from "next/image";
import styles from "./goods.module.css";

const title = "OFFICIAL GOODS｜Visage オフィシャルグッズ";
const description = "Visageのオフィシャルグッズ。フェイスタオル、ステッカー、透明・黒のアクリルキーホルダーをご紹介します。数量限定、なくなり次第終了。";
const url = "https://visage-site.vercel.app/goods/";
export const metadata: Metadata = {
  title: { absolute: title }, description, alternates: { canonical: url },
  openGraph: { title, description, url, siteName: "Visage Official Website", locale: "ja_JP", type: "website", images: [{ url: "/assets/images/goods/face-towel-final.png", width: 855, height: 349, alt: "Visageのロゴと三日月を配したフェイスタオル" }] },
  twitter: { card: "summary_large_image", title, description, images: ["/assets/images/goods/face-towel-final.png"] },
};

export default function GoodsPage() {
  return <main id="main-content" className={styles.page}>
    <header className={styles.intro}>
      <div className={styles.heading}><p className={styles.eyebrow}>VISAGE</p><h1>OFFICIAL<br />GOODS</h1><p className={styles.japanese}>オフィシャルグッズ</p><span className={styles.ornament} aria-hidden="true">✧</span></div>
    </header>
    <div className={styles.collection}>
      <section className={styles.product} aria-labelledby="towel-title">
        <header className={styles.productHeader}><span className={styles.number} aria-hidden="true">01</span><div><h2 id="towel-title">FACE TOWEL</h2><p>フェイスタオル</p></div><p className={styles.price}>¥2,500</p></header>
        <Image className={`${styles.photo} ${styles.towelPhoto}`} src="/assets/images/goods/face-towel-final.png" width={855} height={349} alt="黒地に白いVisageロゴと三日月を配したフェイスタオル" sizes="(max-width: 900px) 90vw, 760px" />
        <p className={styles.spec}>サイズ <span>850 × 340 mm</span></p>
      </section>
      <section className={styles.product} aria-labelledby="sticker-title">
        <header className={styles.productHeader}><span className={styles.number} aria-hidden="true">02</span><div><h2 id="sticker-title">STICKER</h2><p>ステッカー</p></div><p className={styles.price}><small>各</small> ¥500</p></header>
        <div className={styles.split}><Image className={`${styles.photo} ${styles.stickerPhoto}`} src="/assets/images/goods/stickers.png" width={580} height={215} alt="A：Visageロゴと三日月の横長ステッカー、B：十字と三日月の正方形ステッカー" sizes="(max-width: 700px) 90vw, 580px" /><div className={styles.details}><p className={styles.spec}>A <span>120 × 60 mm</span></p><p className={styles.spec}>B <span>60 × 60 mm</span></p><p className={styles.setPrice}>2枚セット <strong>¥800</strong></p></div></div>
      </section>
      <section className={styles.product} aria-labelledby="keychain-title">
        <header className={styles.productHeader}><span className={styles.number} aria-hidden="true">03</span><div><h2 id="keychain-title">ACRYLIC KEYCHAIN</h2><p>アクリルキーホルダー</p></div><p className={styles.price}><small>各</small> ¥500</p></header>
        <Image className={`${styles.photo} ${styles.keychainPhoto}`} src="/assets/images/goods/acrylic-keychains-detail.png" width={790} height={170} alt="Visageロゴと三日月を配した透明と黒のアクリルキーホルダー、金属リング付き" sizes="(max-width: 900px) 90vw, 790px" />
        <div className={styles.keySpecs}><p className={styles.spec}>種類 <span>透明・黒</span></p><p className={styles.spec}>サイズ <span>60 × 30 mm</span></p></div>
      </section>
      <p className={styles.limited}>数量限定、なくなり次第終了</p>
    </div>
  </main>;
}
