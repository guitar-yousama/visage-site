# Preview限定 Gmail送信テスト（設定は承認後）

この手順は準備用です。今回、環境変数登録・SMTP接続・実送信・commit・push・デプロイは行っていません。
Production・共通Preview変数・開発DBの既存6件は変更しません。

## 許可条件（1つでも不成立ならSMTP接続前に拒否）

- `TICKET_PREVIEW_SMTP_ENABLED` が正確に `true`。
- Vercelの実行環境がPreviewで、`VERCEL_GIT_COMMIT_REF` が `codex/ticket-preview`。Vercel自動設定の変数を手動で上書きしない。
- 既存DBガードを通過：照合済みのvisage-developmentホスト / neondb / sslmode=verify-full。既存Originガードも通過。
- 現在時刻が明示した開始～終了の範囲内（最大1時間。テストは10分程度を推奨）。
- 宛先は単一アドレスで、JSON形式の許可リストに完全一致（大小文字は正規化）。管理者通知先も許可リストに必要。
- 許可期間中、許可設定が有効な状態で、新しい予約の初回通知2件として作成されたジョブだけ。
- 作成時に予約ID・ジョブID・通知種別・本文・宛先・テスト実行ID等をHMAC署名し、送信直前に再検証。署名はメール本文やヘッダーへ渡さない。

過去のジョブには署名を後付けしません。過去6件は手動再送を押してもSMTP接続前に拒否されます。
許可する種別は管理者通知と受付自動返信だけです。ステータス通知は今回のPreviewテストでは送信できません。
署名のない新規予約も、後から環境変数を変更しただけでは送信可能になりません。新しく申し込んでください。

## 登録する変数（まだ登録しない）

Vercelの既存プロジェクト `guitar-yousama/visage-site-7xru` の Settings → Environment Variables で、
**EnvironmentはPreviewのみ、Git Branchはcodex/ticket-previewのみ**を選択します。
Production / Development / 全Preview共通へ登録しないでください。

| 変数 | 値・形式 |
| --- | --- |
| GMAIL_USER | 送信元の本人管理Gmailアドレス |
| GMAIL_APP_PASSWORD | Googleで発行したアプリパスワード。Sensitiveに設定。通常のGoogleパスワードは使わない |
| TICKET_ADMIN_EMAIL | 既存のブランチ限定通知先を維持し、本人管理アドレスであることを確認 |
| TICKET_PREVIEW_SMTP_ENABLED | 準備中はfalse。明示的な送信テスト承認後だけtrue |
| TICKET_PREVIEW_MAIL_ALLOWLIST | JSON配列。例 `["本人管理の通知先","本人管理の自動返信先"]`。例の文字列をそのまま登録しない |
| TICKET_PREVIEW_MAIL_RUN | テストごとに生成する32桁の小文字16進数（16バイト） |
| TICKET_PREVIEW_MAIL_START | UTC ISO形式 `YYYY-MM-DDTHH:mm:ss.sssZ` |
| TICKET_PREVIEW_MAIL_END | 同形式。開始より後、最大1時間以内 |

既存のDATABASE_URL、TICKET_PREVIEW_DB_BRANCH、TICKET_SITE_ORIGIN、管理者認証変数は変更しません。
全てサーバー専用変数です。NEXT_PUBLIC_を付けず、next.configのenvにも追加しません。

## パスワードを安全に登録する具体的な手順

1. 先に本人管理のテスト受信先を確定する。架空アドレス・第三者のアドレスを使わない。
2. Vercelに本人がログインし、上記の専用ブランチを選ぶ。
3. GMAIL_APP_PASSWORDの入力欄へ本人が直接入力する。チャットへ貼らず、画面共有・スクリーンショットを避ける。
4. EnvironmentとGit Branchをもう一度確認して保存する。既存の共通変数は編集しない。
5. 他の必要変数も同じブランチ範囲で登録し、準備中の許可フラグはfalseを維持する。
6. 将来、コードの公開・送信テストが明示承認された後にのみ、専用Previewへ反映する。本番デプロイしない。

CLIを使う場合も値をコマンド引数へ書かないでください。本人が非表示入力できる対話方式かVercel UIを使用してください。
.env.localへの保存は今回不要です。ローカルにGmail認証情報を入れると、通常のローカル予約処理が送信する可能性があるため、今回のPreviewテスト用認証情報はブランチ限定で管理します。

## 承認後の送信試験

1. Vercel Authenticationで未認証アクセスが遮断され、ADMIN認証も必要であることを再確認。
2. テスト開始を少し未来に設定し、10分程度の終了時刻・新しいRUNを登録。許可フラグをtrueにし、専用Previewのみ再デプロイ。
3. 設定を反映したPreviewがREADYで、許可時間内であることを確認。
4. 過去の3予約には触らず、本人管理の許可アドレスで新規テスト予約を1件作成。
5. 管理者通知と受付自動返信の2通について受信箱と迷惑メールを確認。DBのsentはSMTP受理であり、受信箱到達の保証ではない。
6. 過去6件のsent_atが空のまま、新規2件だけが送信対象であることを確認。
7. 必要な再送も同じ署名・RUN・時間・宛先条件を満たす新規ジョブだけ。SMTP通信断による重複配送を完全には防げないため、受信箱を先に確認。
8. 終了後は許可フラグをfalseに戻し専用Previewを再デプロイ。テスト専用アプリパスワードの失効も検討。

重要：環境変数の変更は既存デプロイへ即時反映されません。古いPreview URLは元の設定を保持します。
このため終了時刻でも必ず拒否する実装です。古いデプロイを含め直ちに送信認証を無効化する必要があれば、Google側でテスト用アプリパスワードを失効してください。
Vercel Authenticationを解除したり、バイパストークンを発行したりする必要はありません。

## テストの範囲

自動テストはローカルPGliteと偽の送信関数を使用します。実Neon・Gmail・Vercelへ接続しません。
旧失敗ジョブ6件、新規通知2件、二重再送の除外、許可条件の欠落、改ざん・期限切れを検証します。
DBスキーマ変更・マイグレーションは不要です。既存payload JSON内にサーバー署名を保存します。
