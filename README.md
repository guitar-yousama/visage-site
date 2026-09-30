# Visage_web

熊本発ヴィジュアル系バンド「Visage」の公式Webサイト。
コンセプトは **Beautiful Decay**。実際の写真、ロゴ、公式情報を優先し、未確定のコンテンツは掲載しません。

## 開発

```bash
npm install
npm run dev
```

ブラウザで <http://localhost:3000> を開きます。品質確認は`npm run lint`と`npm run build`を実行します。

## 技術

- Next.js App Router / TypeScript
- CSS Modulesと`src/styles/tokens.css`のデザイントークン
- Server Componentsを基本にし、モバイルナビゲーションのみClient Component
- Tailwindおよび外部UIライブラリなし

## 構成

- `src/app`: `/`、`/music`、`/music/[slug]`、`/live`、`/video`、`/news`、`/news/[slug]`、`/profile`、`/member`
- `src/components/layout`: 共通ヘッダー、フッター
- `src/components/sections`: ホームの編集的セクションと共通ページ枠
- `src/components/ui`: 小さな再利用部品
- `src/lib/site-data.ts`: メンバー、公式SNS、リリース、公演、動画、ニュースのデータ
- `public/assets/images`: `hero`、`live`、`member`、`music`、`news`、`og`
- `public/assets/videos`、`icons`、`fonts`: 素材置き場

リリース、公演、動画、ニュースは公式情報が届くまで空配列です。実際のライブ写真・ロゴ・公式ドメインが追加されたら、ヒーローやOG画像、canonical URLへ反映してください。

承認済みの実素材を配置した後は、`src/lib/site-data.ts`の`siteAssets`へ`/assets/images/hero/...`、`/assets/images/live/...`のパスと、写真の`objectPosition`を設定します。公式ロゴは同じ場所へ配置し、元画像の幅・高さとともに`siteAssets.logo`へ登録します。メンバー写真は各`members`項目の`portrait`に登録してください。画像が揃うまでは、空状態やタイポグラフィ表示を維持します。
