# チケット予約：DB・Gmail 接続準備（2026-10-20）

## 確認結果と停止点

ローカルの .env 設定・関連プロセス環境変数・Vercel CLI接続設定は未設定。
Vercelダッシュボードはログイン画面となり、クラウド側の既存DB有無は未確認です。
ユーザーの以前の回答は「利用可能なDBなし」。新規登録・課金・DB作成・本番公開は実施していません。
認証情報が揃うまで実予約・実ログイン・SMTP送信テストは未実施です。

## 1. 既存Vercelリソースの確認（ユーザー操作）

1. Vercelへログインし、正しいチームの `visage-site-7xru` を選ぶ。
2. Storage / Integrations と Settings → Environment Variables を確認する。
3. PostgreSQL/Neonの接続済みリソースと DATABASE_URL 等の有無・対象環境を確認する。値をチャットへ貼らない。
4. 既存DBがあってもECLIPSE等と共用せず、専用DB・ロールを準備する。既存テーブルへ本手順を実行しない。

## 2. DBがない場合：Neon Free（ユーザー操作）

1. https://console.neon.tech/ から本人が登録し、Freeプランを選択する。カード登録や有料プラン変更は不要。
2. Visageチケット専用プロジェクトを作り、Vercel Functionsの地域に近いリージョンを選ぶ。
3. 空の開発用DBと本番用DBを分離する。本番個人情報を開発ブランチへコピーしない。
4. まず開発用DBのSQL Editorで、リポジトリの `db/tickets.sql` 全文を一度だけ実行する。
   CREATE TABLEは再実行用ではない。既存テーブルがある場合は停止して確認する。
5. 初期構築者とアプリ用ロールを分離する場合、DB管理者がアプリ専用ロールへ6テーブルのSELECT/INSERT/UPDATE/DELETE、必要なシーケンスのUSAGEとスキーマUSAGEを付与する。
   全テーブルはRLS有効・ポリシーなしのため、非所有者ロールは権限付与だけではアクセスできない。
   各テーブルに「そのアプリロールだけ」を対象とするFOR ALL USING(true) WITH CHECK(true)ポリシーも設定する。
   PUBLIC/匿名ロールへポリシーを設定しない。所有者接続ならRLSをバイパスする点に注意。
6. Connectから正しいDB・ロールのpooled接続URLを取得し、TLS指定を維持してDATABASE_URLへ設定する。
   証明書検証を無効化する設定は追加しない。URLにはパスワードが含まれるため共有しない。

Freeは確認時点で$0、100 CU-hours/月/プロジェクト、1GB/プロジェクト、5分の未使用で自動停止。
自動停止後の初回接続時間と無料枠消費を実測する。枠超過時に無停止運用できる保証はない。
https://neon.com/pricing
https://neon.com/docs/connect/connect-from-any-app

## 3. 保存される情報と認証

- ticket_events：受付期間・有効状態・枚数上限
- ticket_reservations：予約データ・予約時点の公演情報
- ticket_sessions：管理セッション（トークンはハッシュのみ）
- ticket_mail_jobs：通知と自動返信の送信状態・失敗履歴
- ticket_rate_limits：送信・ログイン制限
- ticket_audit：管理操作履歴

管理者IDとscryptパスワードハッシュは既存方式を維持し、サーバー環境変数に永続的に設定する。
平文パスワード・認証ハッシュを予約テーブルへ追加しない。認証セッションはDB永続保存。
Vercelのファイル・メモリへの予約保存は行わない。

## 4. Gmail（ユーザー操作）

1. daiken.yuuichiroumatsumoto@gmail.com のGoogleアカウント → セキュリティで2段階認証を設定する。
2. https://myaccount.google.com/apppasswords で「Visage tickets」等の名前でアプリパスワードを発行する。
   項目が表示されない場合、組織制限・高度な保護等を確認する。通常パスワードで代用しない。
3. 発行されたアプリパスワードを GMAIL_APP_PASSWORD に入力する。チャット・スクリーンショット・Gitへ保存しない。
4. GMAIL_USER と TICKET_ADMIN_EMAIL はともに daiken.yuuichiroumatsumoto@gmail.com に設定する。
   接続先は既存実装の smtp.gmail.com:465 / TLS。
5. テスト自動返信先には本人が管理する別アドレスを使う。実利用者へテスト送信しない。

https://support.google.com/accounts/answer/185833

## 5. 環境変数の設定

正式なADMIN設定には `node scripts/ticket-admin-setup.mjs` を使用できます。ID・パスワードを非表示入力し、ハッシュだけ保存して開発DBでログイン検証します。詳細は `docs/ticket-admin-setup.md` を参照してください。

`docs/tickets-env.example` の8項目を `.env.local` に入力する（Git除外済み）。
DATABASE_URL / TICKET_SITE_ORIGIN / TICKET_SECURITY_SECRET / TICKET_ADMIN_ID /
TICKET_ADMIN_PASSWORD_HASH / GMAIL_USER / TICKET_ADMIN_EMAIL / GMAIL_APP_PASSWORD。

- ローカルOriginは http://localhost:3000。127.0.0.1で試す場合はOriginもそちらに合わせる。
- 管理パスワードは `node scripts/ticket-password.mjs` でハッシュ化する。
- `.env.local` 内ではハッシュの `$` を `\$` にエスケープする（Next.js変数展開対策）。
- セキュリティ秘密値は `openssl rand -hex 32` 等で本人の端末上で生成する。
- 再起動して設定を読み込む。秘密値はNEXT_PUBLIC_付き変数にしない。
- 将来公開するときだけ既存VercelプロジェクトのProductionへ同名変数を設定する。
  Production Originは https://visage-site.vercel.app 。Preview/Developmentは別DBにする。
  Vercel UIのハッシュはエスケープせずそのまま入力。設定は次回デプロイから反映される。
- 今回はVercel設定変更・再デプロイを実施しない。

## 6. 設定後に行う実接続試験（未実施）

開発DBと本人管理メールだけで以下を行う。開始・締切未定の本番公演を勝手に有効化しない。

1. DB接続・6テーブル・ロール権限・RLSを確認。
2. ADMINに設定した資格情報でログイン。未認証の管理APIが拒否されることも確認。
3. 公演を選択し、テスト用の開始・締切・上限を設定して予約を1件送信。
4. DBに予約＋2件のメールジョブが残り、再読込・プロセス再起動後も保持されることを確認。
5. ADMINの公演別一覧・詳細・ステータス変更を確認。
6. 開始前／受付中／締切後／手動停止・再開を確認。締切後の直接POSTも拒否されることを確認。
7. 管理者通知・申込者自動返信を実際の受信箱で確認（迷惑メールも確認）。
8. 開発環境だけで一時的にSMTPを失敗させ、予約が失われず、ジョブが失敗状態で残ることを確認。
   正しい設定へ戻し、管理画面から再送を確認。送信済みメールを再送しない。
9. 二重送信、CSV、ログアウト、スマートフォンを確認。結果を個人情報を含めず記録する。

## 7. 依存パッケージの再確認

Next.js / eslint-config-next 16.3.6 → 16.4.2、source-map-js → 1.2.2。
Next.jsとsource-map-jsの報告は解消。
braces 3.0.3（公開最新版）由来のHighは開発依存に残る。関連する5パッケージとして集計される。
未信頼のglobを処理するlintツール経路。一般予約APIの入力で直接使用するものではないが、未解消として扱う。
強制ダウングレード・監査無視・独自パッチでの隠蔽は行っていない。修正版公開後に再評価する。
