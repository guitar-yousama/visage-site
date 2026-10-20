# Visage チケット予約・管理（ローカル実装）

## 状態と未完了事項

2026-10-20：ユーザー確認により、既存DBなし／Gmailアプリパスワード未設定／受付対象・期間未定。
外部サービス契約・アカウント作成・認証情報発行・本番公開は実施していません。
未設定時は受付を行わず、架空の成功メッセージや一時ファイル保存に切り替えません。
ECLIPSEの外部受付は現状維持。ECLIPSEの本番データや認証基盤を流用しません。

## URLと接続

- `/tickets` 公演一覧（一般のお問い合わせを扱うCONTACTとは分離）
- `/tickets/[公演UUID]` 公演専用フォーム
- `/admin` ログイン、申し込み管理、公演管理、操作ログ
- `/api/tickets/*` 公開受付と管理API。管理APIはすべてセッション認証必須。
- `/api/tickets/events` は公開用の公演情報のみ。申し込み・メールアドレス・秘密情報は含めません。

保存は `pg` でPostgreSQLへ接続。Vercelのメモリやローカルファイルには保存しません。
既存DBが利用できないため、利用開始には1つの永続DBの用意が必要です。
候補はNeon Free。サービスの新規登録はユーザーの承認後に行います。
2026-10-20公式料金ページ表示：Free $0、100 CU-hours/月/プロジェクト、ストレージ1GB。
無料枠超過時の制限、バックアップ・復元範囲、データリージョン、Vercel契約の利用条件も契約前に確認してください。
https://neon.com/pricing

## セットアップ（未実行）

1. DBを承認・作成する。本番・開発を別DBまたは別ブランチに分離する。
2. `db/tickets.sql` を専用DBに一度だけ実行。既存のECLIPSE用DBには実行しない。
3. アプリ接続用のサーバー専用ロールを準備。テーブルCRUD・シーケンス利用を許可する。
   スキーマはRLS有効・匿名ポリシーなし。所有者はRLSをバイパスします。
   所有者と異なる最小権限アプリロールの場合、各テーブルにそのロールだけのRLSポリシーをDB管理者が追加する必要があります。
   Supabase等の公開anon/authenticatedキーからアクセス可能にしないこと。
4. `docs/tickets-env.example` を参照して `.env.local` に設定。実際の値はGit管理しない。
5. `node scripts/ticket-password.mjs` で管理者用scryptハッシュを作成（16文字以上、パスワード非表示）。
   `.env.local` ではハッシュ内の `$` を `\$` にエスケープする（Next.jsの変数展開対策）。
   Vercel環境変数UIにはハッシュをそのまま入力する。
6. `TICKET_SECURITY_SECRET` は32文字以上のランダム文字列。変更すると未送信フォームのnonceが無効になります。
7. Vercelでは `TICKET_SITE_ORIGIN=https://visage-site.vercel.app` 。Previewは本番と別DB・別送信設定を使う。
8. 公開済みLIVEをADMINの「受付設定を追加」で選び、受付開始・締切・枚数上限を設定する。公演情報は読み取り専用。必要になった段階で受付を有効にする。
9. 外部DBへの実保存・ログイン・SMTPテストの完了後に公開可否を判断。

## Gmail

- `GMAIL_USER` と `TICKET_ADMIN_EMAIL` は指定の `daiken.yuuichiroumatsumoto@gmail.com` 。ソース実装では環境変数から取得。
- `GMAIL_APP_PASSWORD` には2段階認証後のアプリパスワードを設定。通常のGoogleパスワードは使用しない。
- `smtp.gmail.com:465` TLS、送信完了をawait。管理者通知は申込者をReply-Toに設定。
- Vercel公式資料では465/587は利用可、25はブロック。ただし実環境での接続は別途検証が必要。
- 個人Gmailは通常1日500通等の制限があり、通知＋自動返信で最低2通/申込を消費。通常メールや再送も同じ枠を消費するため250件/日の受信を保証する意味ではない。
- 保存とメールジョブ作成は同一トランザクション。SMTP失敗でも保存済み申し込みは維持。
- メールは自動で無制限に再試行しない。管理画面から未送信・失敗分を確認のうえ再送する。
- SMTPへ引き渡した後にDB更新に失敗した場合、再送で重複する可能性がある。SMTPでexactly-onceは保証しない。
- メールは送信時点の内容スナップショット。個人情報・枚数・備考の編集後、編集前の未送信ジョブはCONTENT_CHANGEDとして再送対象外にする。
- ステータス変更通知は管理者のチェックがある場合のみ新規作成。
- Gmail実送信・受信確認は認証情報未設定のため未実施。必要ならGmail API（OAuth設定）への切り替えを別途検討。

公式資料：
https://support.google.com/accounts/answer/185833
https://support.google.com/mail/answer/22839
https://vercel.com/kb/guide/sending-emails-from-an-application-on-vercel

## 受付・重複・スパム対策

- DBのtimestamptzを利用。管理入力と表示は日本時間、内部はUTCで統一。
- 開始以上・締切未満で受付可能。手動停止が最優先。DB時計で検証するためデプロイやCronは不要。
- 開いたままのフォームは30秒ごとに公演状態を再取得し、境界日時で送信可否を更新する。最終判断は常にPOSTのサーバー側。
- フォームはIPに結びつけた署名nonce、最小3秒、30分有効、ハニーポット、DB共有回数制限を使用。
- 新しい外部CAPTCHA登録は行っていない。大規模botの完全阻止を保証しない。必要になれば別途Turnstile等の導入を相談。
- nonce再送は同じ受付番号を返す。内容を書き換えた再送は拒否。
- 同一公演・正規化メールの有効な申し込みは1件。変更は主催者が管理画面から行う。
- 公演ごとの上限は1申込あたり。総販売枚数・座席在庫・オンライン決済は今回の対象外。
- 送信試行15回/15分、成功3回/IP/15分、同一メール・公演3回/日、全体200件/日。制限はDBで共有。
- ローカルはIP共通扱い。本番はVercelが提供するx-vercel-forwarded-forのみを参照。

## 認証・個人情報

- 管理ID・scryptパスワードハッシュを環境変数で保持。
- ランダム256bitセッション。DBにはトークンのSHA256のみ。有効期限8時間、ログアウトで削除。
- パスワードハッシュまたはID変更で既存セッションを無効化。
- HttpOnly、SameSite=Strict、本番Secure Cookie。ローカルHTTPの開発モードのみSecureを外す。
- ログイン試行はIP8回/15分、全体80回/15分。
- 更新APIはOrigin完全一致・JSONのみ。DBはすべてパラメータ化、Reactでエスケープ。
- 管理APIはno-store/noindex。個人情報やSMTP/DB例外詳細をconsole出力しない。
- CSVの危険な先頭記号をエスケープ。CSVは個人情報のためダウンロード後の保存場所にも注意。
- 一覧は30件ずつ。CSVは最大1万件・4MiB、超過時は公演等で絞り込み。
- 論理削除ではDB内の個人情報は残る。保存期間・取り扱い担当者・バックアップ方針の確定が必要。
- `node scripts/ticket-purge.mjs YYYY-MM-DD` は削除済みデータの完全削除対象件数を確認（環境変数設定後）。
  `--execute` を付けた場合のみ、基準日以前の論理削除済み予約とメール情報を物理削除し、PIIを含まない操作ログを残す。
  完全削除は不可逆のため、実行前に別途承認を得る。送信済みGmailやDBバックアップは別途管理する。

## NEWS / LIVEと既存機能

LIVEの `eventId` を共通の公演IDとし、関連NEWSにも同じ `eventId` を設定する。
旧データでIDが未指定ならLIVEのslugから決定的UUIDを生成する。タイトル・料金変更でIDは変わらない。
既存ECLIPSEには現在の決定的IDを明記して固定済み：`38001475-2b0f-884f-a241-f7122ec9a2c5`。
slugを変更する際は、同じeventIdを明記してIDを維持する。既存IDを別公演に使い回さない。

LIVEを公演情報の正本とし、ADMINは受付設定だけを管理する。
ADMINの一覧には公開済みLIVEが自動で現れ、タイトル・開催日時・会場・料金の再入力は不要。
DBには照合用の公演情報キャッシュが残るが、フォーム表示・新規申込は現在のLIVE情報をサーバー側で参照する。
受付時の公演名・同意・メール内容は履歴のためスナップショットとして残す。
NEWSのIDが未登録のLIVEを指す場合、またはLIVEでIDが重複する場合は検証エラーにして誤接続を防ぐ。
LIVEの開催日・開演時刻・料金・会場が不完全なら受付設定を作成できない。
公開元が削除された場合や開催日時変更で締切が不整合になった場合は、新規受付を停止する。過去の予約は削除しない。
旧手入力方式のDBレコードに公開元IDがない場合は「未連携」として停止し、履歴を保持する（実DBは未作成のため現状の実データ移行は不要）。

公開側は同じ `/tickets/[eventId]` へ遷移。受付設定のない公演・関連のないNEWSには新フォームのボタンを出さない。
既存ECLIPSEの外部リンクは、同じ公演IDに受付設定を保存するまで維持する。
開始前：予約受付開始前、期間中：申し込み可能、締切以上：予約受付終了、手動停止：受付停止中。
締切は含まない。開始と同時刻から受付可能。手動停止は期間より優先し、再開しても期間外は受け付けない。

### コード変更・デプロイなしでできる範囲

一度NEWS・LIVEの公演情報を登録・公開すれば、ADMINでの公演選択・受付期間・枚数上限・停止／再開・予約管理はDB更新のみ。
公演ごとのフォーム開発やプログラム改修は不要。時刻による開始・終了にデプロイやCronは不要。

**現在のNEWS・LIVEは `src/lib/site-data.ts` で管理されており、新規告知の追加・本文・公演情報の変更にはデータファイル編集とビルド／公開が必要。**
ADMINはNEWS・LIVEの記事を作成するCMSではない。告知内容の登録まで完全ノーコードにするには別途CMS機能が必要で、今回は追加しない。
新規公演ではLIVE側に固定eventIdを割り当て、関連するNEWSにも同じ値を設定する。内容編集時もIDを維持する。

既存ページのmetadata、JSON-LD、verification、画像、背景・霧・雷・ロゴの処理は変更しない。
sitemapは既存URLを保持し、公開の `/tickets` だけを追加。個別フォームはnoindex・自己canonical、adminはnoindex。

## 検証と制限

2026-10-20 公演管理運用の確定に合わせた確認：

- `npm run lint` / `npm run build` 成功。
- `npm run test:tickets`：17テスト成功。IDの安定性・NEWS/LIVEの関連・ADMINからの公演情報改変防止・設定後の公開元情報反映・停止／再開・締切拒否・ロック待ちで締切を過ぎた場合の拒否を含む。
- ブラウザのテスト用APIで1440 / 820 / 393 / 320pxの表示と操作を確認。公開済み公演の選択、基本情報の読み取り専用表示、受付設定だけの送信、画面を開いたままの開始前→受付中→締切、手動停止を確認。
- 現在の既存NEWS詳細には関連公演IDが未設定のため、新フォームの予約ボタンが出ないことを確認。関連NEWSが同じ公演IDを参照する判定はテスト用のNEWS/LIVEデータで検証。
- 既存のECLIPSEはNEWS一覧からLIVEへ遷移する既存経路を維持。受付設定保存後に同一公演IDのフォームへ連動する。


`npm run test:tickets`：PGlite（PostgreSQL互換WASMエンジン）のテスト専用DBでSQLロジックを検証。
これは外部DBの永続性や実PostgreSQLでの多接続競合試験とは異なる。
画面検証のフォーム送信・ログイン成功・管理操作はテスト用API応答で検証する。
実APIの未認証拒否・設定不足時の閉鎖は別途確認。
本番接続情報・公演期間が未定のため、実保存・実Gmail送受信・実Cookieログインの一連の検証は本番公開前の必須事項。
実DB接続後は複数接続の同時申し込み、同一メールの競合、停止と送信の競合も再検証する。

2026-10-20接続準備でNext.js・eslint-config-nextを16.4.2へ更新し、source-map-jsを1.2.2へ更新。
開発依存braces 3.0.3由来のHighは修正版未公開のため残存。詳細と実接続手順は ticket-connection-setup.md を参照。

## 変更・追加ファイル

既存ファイル（予約導線・sitemap・依存追加のみ）：

- `package.json`
- `package-lock.json`
- `src/components/sections/ContentLists.tsx`
- `src/app/news/[slug]/page.tsx`
- `src/app/sitemap.ts`
- `src/lib/site-data.ts`（公演IDと型定義のみ。公演本文・料金等は変更しない）

新規ファイル：

- `src/app/tickets/page.tsx`
- `src/app/tickets/[eventId]/page.tsx`
- `src/app/admin/page.tsx`
- `src/app/api/tickets/[...path]/route.ts`
- `src/components/tickets/TicketForm.tsx`
- `src/components/tickets/TicketAdmin.tsx`
- `src/components/tickets/ReservationLink.tsx`
- `src/components/tickets/tickets.module.css`
- `src/lib/tickets/domain.ts`
- `src/lib/tickets/catalogue.ts`
- `src/lib/tickets/service.ts`
- `src/lib/tickets/database.ts`
- `src/lib/tickets/server.ts`
- `db/tickets.sql`
- `scripts/ticket-password.mjs`
- `scripts/ticket-purge.mjs`
- `tests/tickets.test.ts`
- `docs/tickets-env.example`
- `docs/ticket-reservations.md`

既存未追跡 `prize-house-preview/` と別Gitディレクトリ `visage-web/` は対象外。
