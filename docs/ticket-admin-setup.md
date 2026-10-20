# 正式なADMIN認証のローカル設定

## 現在の準備

秘密値はcrypto.randomBytes(32)の64桁hex（256bit）を端末内で生成し、.env.localへ保存。
既存の秘密値がある場合は勝手に再生成しない。変更すると既存のフォーム署名等に影響する。
ローカルOriginは未設定の場合だけ補完。管理通知先が未設定なら設定コマンド内で非表示入力する。SMTP認証は設定しない。
実際の管理者ID・パスワードは本人が決める。チャットへ送らない。

## 非表示入力と実ログイン検証

プロジェクトルートのMacターミナルで実行する。

```bash
node scripts/ticket-admin-setup.mjs
```

- 管理者ID：半角英数字と . _ @ -、3〜100文字。入力は表示されない。
- パスワード：16〜200文字。十分に長い、他で使っていないものを使用。2回とも非表示入力。
- Ctrl+Cで入力中止。コマンド引数・環境変数で平文パスワードを渡さない。
- 128bitランダムsalt、scrypt N=32768/r=8/p=1・64byte出力。
- 保存形式はscrypt$32768$<salt>$<hash>。平文パスワードは保存しない。
- .env.localでは$をエスケープし、Next.jsの変数展開で壊れないよう保存する。
- ファイルは一時ファイルから置換し権限600。DB接続設定・既存の他変数は保持する。
- 入力後、3174番ポートで一時Next.js開発サーバーを起動し、照合済みNeon開発DBだけでログイン・管理API・ログアウト・旧セッション拒否・未認証拒否を検証する。
- SMTP資格情報は検証プロセスで空にし、メール送信しない。検証後、一時サーバーは終了する。
- 他のnext devが動いている場合は先に終了する。3174が使用中の場合は停止する。
- 成功時は秘密値なしの結果のみ表示し、.env.admin-check.jsonへ検証結果を保存する（Git除外対象）。
- 認証情報を保存した後で検証が失敗した場合、保存値はそのまま保持する。設定失敗とログイン失敗を混同せず、表示を確認する。

通常のローカルサーバーは再起動して新設定を読み込む。
TICKET_SITE_ORIGINは現在 http://127.0.0.1:3000 。localhost等で使う場合は実際のURLへ合わせる。
Gmailの認証未設定のため実メールは送信されない。

## 環境変数

認証に必須：
- TICKET_ADMIN_ID
- TICKET_ADMIN_PASSWORD_HASH
- TICKET_SECURITY_SECRET

管理画面・フォーム動作にも必要：
- DATABASE_URL（照合済み開発ブランチのみ）
- TICKET_SITE_ORIGIN（起動したローカルURL）
- TICKET_ADMIN_EMAIL（通知先。SMTP認証とは別）

セッションは256bitランダムトークンをCookieへ発行し、DBにはSHA-256ハッシュだけ保存する。
CookieはHttpOnly / SameSite=Strict、有効8時間。本番NODE_ENVではSecure付き。
セッションは署名Cookie方式ではなくDB照合方式。TICKET_SECURITY_SECRETはフォームnonce署名とレート制限用HMACで使う。
管理者ID・パスワードハッシュを変更すると、以前のセッションは認証できなくなる。

## Vercel Developmentへの登録（今回未実行）

既存のguitar-yousama/visage-site-7xru → Settings → Environment Variablesで、対象をDevelopmentだけにして上記の変数を登録する。
Production/Previewへ同時登録しない。DATABASE_URLは既存の開発ブランチを維持する。
値は本人がローカルエディターで参照し、画面共有・スクリーンショット・チャットへの貼り付けをしない。
パスワードそのものは登録せず、TICKET_ADMIN_PASSWORD_HASHだけを登録する。
ローカルファイルのハッシュ内の `\$` は、Vercel UIでは `$` として入力する。囲み引用符も除く。
TICKET_SECURITY_SECRETもローカルと同じ値を登録する。ログに出力して転記しない。
登録後のenv pullで再取得するとローカルの値が上書きされる場合があるため、Developmentへの登録を済ませてから行う。
変数設定はデプロイではない。今回はProduction設定・デプロイは行わない。
