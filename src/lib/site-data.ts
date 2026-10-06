export const siteNavigation = [
  { label: "MUSIC", href: "/music" },
  { label: "LIVE", href: "/live" },
  { label: "VIDEO", href: "/video" },
  { label: "NEWS", href: "/news" },
  { label: "PROFILE", href: "/profile" },
  { label: "MEMBER", href: "/member" },
] as const;

export type Member = { name: string; role: string; portrait?: string; portraitWidth?: number; portraitHeight?: number };

export const members: Member[] = [
  { name: "霧音", role: "VOCAL", portrait: "/assets/images/member/m_kirine.jpg", portraitWidth: 1705, portraitHeight: 959 },
  { name: "YOU", role: "GUITAR", portrait: "/assets/images/member/m_you.jpg", portraitWidth: 1919, portraitHeight: 1280 },
  { name: "SHINJIRO", role: "GUITAR", portrait: "/assets/images/member/m_shinjiro.jpg", portraitWidth: 1567, portraitHeight: 1045 },
  { name: "YUICHI", role: "BASS", portrait: "/assets/images/member/m_yuichi.jpg", portraitWidth: 1024, portraitHeight: 683 },
  { name: "KENICHIRO", role: "DRUMS", portrait: "/assets/images/member/m_kenichiro.jpg", portraitWidth: 1536, portraitHeight: 1024 },
];

export const siteAssets = {
  // Point these to approved originals under public/assets/images/ when supplied.
  heroPhoto: {
    src: "/assets/images/hero/hero_02.webp",
    width: 1920,
    height: 1080,
    desktopPosition: "center 51%",
    mobilePosition: "center 51%",
  },
  logo: { src: "/assets/images/hero/visage_wh.png", width: 790, height: 322 },
  livePhoto: null as { src: string; objectPosition?: string } | null,
};

export const profileCopy = {
  heading: "We Rise from Beautiful Decay.",
  paragraphs: [
    "美しく、退廃的で、どこか危険。\n闇の中に浮かぶ月のような世界観と、鋭く重いロックサウンド。\n激しさの中に宿るメロディが、聴く者をVisageの世界へと引き込んでいく。",
    "ただ音楽を聴かせるだけではない。\nただステージを見せるだけでもない。",
    "Visageが創り出すのは、\n音楽、ビジュアル、言葉、そしてライブが交差するひとつの世界。",
    "闇を知る者だけが見つけられる美しさ。\n危うさの中にある美しさ。\nその世界を、あなた自身の目で確かめてほしい。",
    "Welcome to the world of Visage.",
  ],
};

export const socialLinks = [
  { platform: "INSTAGRAM", handle: "@re_visage2025", href: "https://www.instagram.com/re_visage2025/", role: "IMAGE" },
  { platform: "X", handle: "@Re_Visage", href: "https://x.com/Re_Visage", role: "NEWS" },
  { platform: "TIKTOK", handle: "@visage7444", href: "https://www.tiktok.com/@visage7444", role: "MOTION" },
  { platform: "YOUTUBE", handle: "@Visage-b9g", href: "https://www.youtube.com/@Visage-b9g", role: "VIDEO" },
] as const;

// Keep releases empty until official information is provided.
export const releases: Release[] = [];
export const liveEvents: LiveEvent[] = [
  {
    slug: "visage-vs-gheme-eclipse",
    date: "2026-11-07",
    eventName: "Visage vs GHEME Two-man Live [ECLIPSE]",
    description: "光と闇が、同じステージに立つ。\n\nVisage × GHEME\nTWO-MAN LIVE “ECLIPSE”\n\n相反する二つの世界。\n交わった先に何が生まれるのか。",
    dateLabel: "2026.11.07 Sat",
    venue: "KUMAMOTO B.9 V2",
    openingTime: "17:00",
    startTime: "18:00",
    admission: "ADV ¥2,000 / DOOR ¥2,500",
    drinkCharge: "+1DRINK ¥600",
    poster: "/assets/images/live/20261107_01.png",
    ticketUrl: "https://eclipse-visage-gheme.spicy-badge-3006.chatgpt.site/?utm_source=ig&utm_medium=social&utm_content=link_in_bio&fbclid=PAZXh0bgNhZW0CMTEAcGRvZgJzcnRjBmFwcF9pZA85MzY2MTk3NDMzOTI0NTkAAafhZ-wDAesEZ_sIDRMohwLfve0pChAFscaEQN0a4m3rIq8G5I_SlSHW43Hl_g_aem_COcXuXluyS19wvjvrnawXg",
    ticketNote: "チケット予約は下記リンクより。",
  },
];
export const videos: Video[] = [
  { slug: "hftteg0nd7k", videoId: "HFtTEG0Nd7k", youtubeUrl: "https://www.youtube.com/watch?v=HFtTEG0Nd7k", thumbnail: "https://i.ytimg.com/vi/HFtTEG0Nd7k/hqdefault.jpg" },
  { slug: "wjckwpbp14", videoId: "WjCkWPbpB14", youtubeUrl: "https://www.youtube.com/watch?v=WjCkWPbpB14", thumbnail: "https://i.ytimg.com/vi/WjCkWPbpB14/hqdefault.jpg" },
  { slug: "d5gfsbykegw", videoId: "D5gfSBYKeGw", youtubeUrl: "https://www.youtube.com/watch?v=D5gfSBYKeGw", thumbnail: "https://i.ytimg.com/vi/D5gfSBYKeGw/hqdefault.jpg" },
];
export const newsItems: NewsItem[] = [
  {
    slug: "eclipse-limited-collaboration-t-shirt",
    category: "NEWS",
    title: "ECLIPSE 限定コラボTシャツ",
    image: "/assets/images/news/202601107_02.png",
    body: "販売価格\n\n4,000円（税込）\n\nサイズ\n\nXL ワンサイズ\n\n申込締切\n\n2026年10月20日\n\n本商品は、ご注文いただいた分のみ製作する受注生産品です。制作手配後のキャンセルはできませんので、内容をご確認のうえお申し込みください。\n\n本商品は今回限りの限定受注です。再販および締切後の追加生産は予定しておりません。ご希望の方は、ぜひこの機会にお申し込みください。",
  },
  {
    slug: "visage-interview-asia-no-tengoku",
    date: "2026.10.05",
    category: "NEWS",
    title: "ルーマニアの音楽メディア「アジアの天国」にVisageインタビュー掲載",
    body: "ルーマニアの音楽メディア「アジアの天国」にて、\nVisageのインタビューが掲載されました。\n\n“We Rise from Beautiful Decay.”\n\nVisageの音楽、楽曲制作、ライブ、そして僕たちが大切にしているものについて、深く取り上げていただいています。\n\n海を越えて僕たちの音楽と向き合い、こうして紹介していただけたことに感謝します。",
    externalUrl: "https://www.ajianotengoku.com/2026/10/visage-arta-care-se-ridica-din.html?fbclid=PAZXh0bgNhZW0CMTEAcGRvZgRzcnRjBmFwcF9pZAwyNTYyODEwNDA1NTgAAafMWAkA129GQn6zC2HE53vu3schVUHbIrI6A7q5zuJu9VaxPir3EJZ2QzDaqA_aem_iqdh8a1TlDX6haMFhl3-ow",
  },
  {
    slug: "visage-interview-tokio-panic",
    date: "2026.09.22",
    category: "NEWS",
    title: "メキシコの音楽メディア「TOKIO PANIC」にVisageインタビュー掲載",
    body: "日本の音楽、J-Musicやオルタナティブカルチャーを発信するメキシコのメディア「TOKIO PANIC」に、Visageのインタビューを掲載していただきました。\n\nVisageの音楽や、その背景にある考えについて丁寧に取り上げていただいています。\n\n遠くメキシコからVisageに目を留め、こうした機会をいただけたことを、とても嬉しく思います。\n\nTOKIO PANICの皆様に、心より感謝いたします。\n\nThank you, @tokiopanic.\n\nWe Rise from Beautiful Decay.",
    bodyLink: { text: "@tokiopanic", href: "https://www.instagram.com/tokiopanic/?hl=ja" },
    externalUrl: "https://tokiopanic.com/noticias/visage-entrevista-kirine",
    seoDescription: "日本の音楽、J-Musicやオルタナティブカルチャーを発信するメキシコのメディア「TOKIO PANIC」に、Visageのインタビューを掲載していただきました。",
  },
];

export type Release = {
  slug: string;
  title: string;
  type: "ALBUM" | "SINGLE" | "VIDEO";
  releaseDate: string;
  artwork?: string;
  description?: string;
  streamingLinks?: { label: string; href: string }[];
  tracks?: string[];
};

export type LiveEvent = {
  slug: string;
  date: string;
  eventName: string;
  description?: string;
  dateLabel?: string;
  venue: string;
  admission?: string;
  drinkCharge?: string;
  poster?: string;
  openingTime?: string;
  startTime?: string;
  ticketUrl?: string;
  ticketNote?: string;
  archived?: boolean;
};

export type Video = { slug: string; videoId: string; youtubeUrl: string; thumbnail: string; title?: string; date?: string };
export type NewsItem = { slug: string; date?: string; category: string; title: string; body: string; image?: string; externalUrl?: string; bodyLink?: { text: string; href: string }; seoDescription?: string };
