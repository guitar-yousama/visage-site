# 管理者専用の非公開予約テスト

専用ID: ea0a8f5e-f2ef-4a29-9876-f92520b6b405。ECLIPSEと異なる固定ID。
通常LIVE/NEWSデータ・sitemapに追加しない。公開公演APIから常に除外。

## サーバー環境変数（初期状態は全て未設定・停止）

- TICKET_ISOLATED_ENABLED: 厳密に true の場合だけ許可。停止は false。
- TICKET_ISOLATED_START / TICKET_ISOLATED_END: UTCのISO日時（例 2030-01-01T00:00:00.000Z）。最大1時間、終了時刻は排他的。
- TICKET_ISOLATED_ALLOWLIST: メールアドレス配列のJSON。空・不正・未設定は拒否。予約者とTICKET_ADMIN_EMAILの双方を含める。
- TICKET_ISOLATED_SMTP_ENABLED: 本番実送信の追加許可。未設定/falseはSMTP拒否。今回設定・有効化しない。

Previewではisolated SMTPフラグに関係なく疑似送信のみ。SMTP transportは生成しない。
メールジョブはsentとPREVIEW_SIMULATEDを記録する。実際の到達確認ではない。
通常公演の既存Previewメール制御は維持する。

## 後続のPreview検証

1. このブランチ限定でDATABASE_URL、既存ADMIN設定、Origin、TICKET_PREVIEW_DB_BRANCHを準備する。
2. Neon開発ホスト・neondb・verify-fullを照合。Productionには接続しない。
3. Preview全体のVercel Authenticationを維持する。
4. 上記の時間・許可リスト・許可フラグをPreviewブランチだけへ設定して反映。
5. 既存ADMINで「非公開・予約システム動作確認」を選び受付設定を作成。開始/締切はテスト時間内、1申込1枚・総定員1枚を推奨。
6. ログイン済みのまま /admin/test-reservation を開く。未認証は404、全isolated APIも404。
7. 架空名・本人管理の許可メールで1件テスト。メールは疑似送信。ADMINでジョブコードも確認。
8. ADMINで受付停止。時間外/OFF/停止中のAPI拒否を確認。予約はキャンセルし、履歴は保持する。
9. 停止後のメール再送も時間/OFF/宛先検証により拒否。通常公演の再送処理は従来通り。

新しい公開受付は追加しない。既存ADMINは認証済み管理者だけが全予約を管理する設計を維持する。
DBスキーマ変更は不要。自動テストはPGliteと疑似送信を使用し、実Neon/SMTPへ接続しない。
本番公開・本番DB書き込み・実メールテストは別途承認が必要。
