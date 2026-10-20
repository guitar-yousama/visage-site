# Neonの開発用接続設定

## 現状

アプリはDATABASE_URLのみ参照し、POSTGRES_URL_NON_POOLINGを自動参照しない。
pg.Poolは直接接続URLを利用可能（最大3接続/プロセス）。Vercelでは並列インスタンスごとに接続が増えるため、本番アプリの通常利用はpooled URLを第一候補とし、初期DDLやローカル確認は直接接続を利用できる。
直接URLであること自体は安全な開発DBである証明にならない。Neon側のブランチ/DB/endpointを必ず照合する。

## 1. 開発用DBを分離（本人操作）

Neon Consoleで今回のVercel連携プロジェクトを開く。
本番のブランチ/endpointを記録し、それとは別の開発ブランチ（例 tickets-development）を作成する。
通常ブランチ作成は親のデータを複製するため、本番個人情報が存在する場合は通常のクローンを使わず、schema-only branch等のデータを複製しない方法、または別の空プロジェクトを使う。
同じブランチ内の別DBだけでもテーブルは分離できるが、誤接続防止には別ブランチを推奨。
無料枠を確認し、有料リソースを追加しない。作成は今回自動実行しない。
開発ブランチのConnectで対象DBとロールを選び、直接接続URLを取得する。

## 2. Vercel側Development環境を確認（本人操作）

既存プロジェクトvisage-site-7xruのDevelopment環境に、開発ブランチのURLを設定する。
ProductionのPOSTGRES_URL_NON_POOLINGを変更・コピーしない。
Developmentへ割り当てられた変数も本番ブランチを参照する場合があるため、環境名だけで判断しない。
DATABASE_URLに開発用URLを直接登録するか、ローカルで取得した開発用POSTGRES_URL_NON_POOLINGをDATABASE_URLへ安全に転記する。
TLSはsslmode=verify-fullを指定し、他のNeon接続パラメータを保持。証明書検証を無効にしない。

## 3. CLIで取得（ターミナルで本人がログイン）

プロジェクトルートで以下を実行する。npxはCLIを一時取得し、サイトのpackage.jsonへ追加しない。

```bash
npx vercel@latest login
npx vercel@latest link
```

linkでは正しいチームと既存プロジェクトvisage-site-7xruを選択する。「新規作成」は選ばない。
このコマンドは紐付けのみ。vercel単体やdeploy、--prodは実行しない。
開発用変数の接続先が確認できたら以下を実行する。

```bash
umask 077
npx vercel@latest env pull .env.local --environment=development
chmod 600 .env.local
```

.env.localが既にある場合は、先に安全な場所でバックアップし、CLIのマージ/上書き結果に注意する。
Productionを指定してpullしない。cat .env.local、printenv、set -x、スクリーンショットによる秘密値の出力は行わない。
VS Code等のローカルエディターでDATABASE_URLへ開発用の直接URLを設定する。URLをチャットへ貼らない。
既存のTICKET_SITE_ORIGINは使用するlocalhost等と一致させる。
.gitignoreの.env*と.vercelでGit除外済み。念のためgit check-ignore .env.localで確認する。

## 4. SQL前の読み取り専用確認

```bash
node scripts/ticket-db-check.mjs
```

このスクリプトはNext.jsの開発環境変数を読み、READ ONLYトランザクションでDB名・スキーマ・search_path・既存テーブル一覧・TLSを確認する。
URL、パスワード、ユーザー名、ホスト、DBエラー本文は出力しない。DDL/データ変更は行わない。
出力されたDB名だけで開発ブランチとは判定できないため、Neon Console上のendpointとローカル接続先も本人が照合する。
既存ticket_*テーブルや想定外のテーブルがある場合はSQL適用を停止する。DROP/初期化はしない。

## 5. 開発DB確認後だけSQLを適用

正しい開発ブランチ・空の専用DB・publicスキーマであることを確認後、Neon SQL Editorで開発ブランチ/DBを選び、db/tickets.sqlの全文を一度だけ実行する。
このSQLはCREATE TABLEであり再実行用ではない。既存テーブルを削除して再実行しない。
本番ブランチでは実行しない。管理者ロールとアプリロールを分ける場合は、ticket-connection-setup.md記載のGRANT/RLS設定も必要。
再度ticket-db-check.mjsを実行し、6テーブル・TLSを確認する。その後アプリの実保存/ログイン等を試験する。

参考:
https://vercel.com/docs/cli/env
https://vercel.com/docs/cli/link
https://neon.com/docs/concepts/branch-your-backend
