import type { Metadata } from "next";
import Image from "next/image";
import styles from "./goods.module.css";

const title = "OFFICIAL GOODS｜Visage オフィシャルグッズ";
const description = "Visageのオフィシャルグッズ。Tシャツ、フェイスタオル、ステッカー、マットステッカー、透明・黒のアクリルキーホルダーをご紹介します。数量限定、なくなり次第終了。";
const url = "https://visage-site.vercel.app/goods/";
export const metadata: Metadata = {
  title: { absolute: title }, description, alternates: { canonical: url },
  openGraph: { title, description, url, siteName: "Visage Official Website", locale: "ja_JP", type: "website", images: [{ url: "/assets/images/goods/face-towel-final.png", width: 855, height: 349, alt: "Visageのロゴと三日月を配したフェイスタオル" }] },
  twitter: { card: "summary_large_image", title, description, images: ["/assets/images/goods/face-towel-final.png"] },
};

export default function GoodsPage() {
  return <main id="main-content" className={styles.page}>
    <header className={styles.intro}>
      <div className={styles.heading}><p className={styles.eyebrow}>VISAGE</p><h1>OFFICIAL<br />GOODS</h1><p className={styles.japanese}>オフィシャルグッズ</p><div className={styles.introduction}><p>Visageの世界を、あなたの日常に。</p><p>ライブの記憶とともに持ち帰れる、オフィシャルグッズをご用意しました。</p><p>会場で、お気に入りのアイテムを見つけてください。</p></div><span className={styles.ornament} aria-hidden="true">✧</span></div>
    </header>
    <div className={styles.collection}>
      <section className={styles.product} aria-labelledby="shirt-title">
        <header className={styles.productHeader}><span className={styles.number} aria-hidden="true">01</span><div><h2 id="shirt-title">T-SHIRT</h2><p>Tシャツ</p></div><p className={styles.price}>¥3,700</p></header>
        <Image className={`${styles.photo} ${styles.shirtPhoto}`} src="/assets/images/goods/t-shirt-complete.png" width={1774} height={887} alt="Visageの黒いTシャツの表と裏。表に白いロゴ、背面に小さなロゴと赤い英文" sizes="(max-width: 700px) 90vw, 635px" />
        <p className={styles.spec}>サイズ <span>XL ONLY</span></p>
      </section>
      <section className={styles.product} aria-labelledby="towel-title">
        <header className={styles.productHeader}><span className={styles.number} aria-hidden="true">02</span><div><h2 id="towel-title">FACE TOWEL</h2><p>フェイスタオル</p></div><p className={styles.price}>¥2,500</p></header>
        <Image className={`${styles.photo} ${styles.towelPhoto}`} src="/assets/images/goods/face-towel-final.png" width={855} height={349} alt="黒地に白いVisageロゴと三日月を配したフェイスタオル" sizes="(max-width: 900px) 90vw, 760px" />
        <p className={styles.spec}>サイズ <span>850 × 340 mm</span></p>
      </section>
      <section className={styles.product} aria-labelledby="sticker-title">
        <header className={styles.productHeader}><span className={styles.number} aria-hidden="true">03</span><div><h2 id="sticker-title">STICKER</h2><p>ステッカー</p></div><p className={styles.price}><small>各</small> ¥500</p></header>
        <div className={styles.split}><Image className={`${styles.photo} ${styles.stickerPhoto}`} src="/assets/images/goods/stickers.png" width={580} height={215} alt="A：Visageロゴと三日月の横長ステッカー、B：十字と三日月の正方形ステッカー" sizes="(max-width: 700px) 90vw, 580px" /><div className={styles.details}><p className={styles.spec}>A <span>120 × 60 mm</span></p><p className={styles.spec}>B <span>60 × 60 mm</span></p><p className={styles.setPrice}>2枚セット <strong>¥800</strong></p></div></div>
      </section>
      <section className={styles.product} aria-labelledby="mat-sticker-title">
        <header className={styles.productHeader}><span className={styles.number} aria-hidden="true">04</span><div><h2 id="mat-sticker-title">MAT STICKER</h2><p>マットステッカー</p></div><p className={styles.price}><small>各</small> ¥500</p></header>
        <div className={styles.split}><Image className={`${styles.photo} ${styles.stickerPhoto}`} src="/assets/images/goods/mat-stickers.png" width={595} height={137} alt="銀色の装飾フレームとVisageロゴを配した黒・白のマットステッカー" sizes="(max-width: 700px) 90vw, 580px" /><div className={styles.details}><p className={styles.spec}>種類 <span>黒・白</span></p><p className={styles.spec}>サイズ <span>120 × 60 mm</span></p><p className={styles.setPrice}>2枚セット <strong>¥900</strong></p></div></div>
      </section>
      <section className={styles.product} aria-labelledby="keychain-title">
        <header className={styles.productHeader}><span className={styles.number} aria-hidden="true">05</span><div><h2 id="keychain-title">ACRYLIC KEYCHAIN</h2><p>アクリルキーホルダー</p></div><p className={styles.price}><small>各</small> ¥500</p></header>
        <Image className={`${styles.photo} ${styles.keychainPhoto}`} src="/assets/images/goods/keychains-intact.png" width={670} height={140} alt="Visageロゴと三日月を配した透明と黒のアクリルキーホルダー、金属リング付き" sizes="(max-width: 900px) 90vw, 790px" />
        <div className={styles.keySpecs}><p className={styles.spec}>種類 <span>透明・黒</span></p><p className={styles.spec}>サイズ <span>60 × 30 mm</span></p></div>
      </section>
      <div className={styles.salesNotes}><p className={styles.limited}>数量限定、なくなり次第終了</p><p className={styles.disclaimer}>※デザインは多少異なる場合がございます。</p><p className={styles.salesLocation}>ライブ会場での物販ブースでの販売となります。通信販売は行なっておりません。</p></div>
    </div>
  </main>;
}
