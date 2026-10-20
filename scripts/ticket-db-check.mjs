// Read-only preflight. Never prints connection strings, roles, passwords or raw errors.
import nextEnv from '@next/env';
import pg from 'pg';
nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const value = process.env.DATABASE_URL;
if (!value) {
  console.error('DATABASE_URLが未設定です。DBへの接続・変更は行っていません。');
  process.exit(1);
}
let client;
try {
  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error();
  if (url.searchParams.get('sslmode') !== 'verify-full' || url.searchParams.get('uselibpqcompat') === 'true') {
    console.error('証明書検証付きTLS（sslmode=verify-full）を設定してから再実行してください。');
    process.exit(1);
  }
  client = new pg.Client({connectionString:value, connectionTimeoutMillis:10000, statement_timeout:10000});
  await client.connect();
  await client.query('BEGIN READ ONLY');
  const {rows:[identity]} = await client.query('SELECT current_database() AS database, current_schema() AS schema, current_setting(\'search_path\') AS search_path');
  const {rows:tables} = await client.query("SELECT schemaname, tablename FROM pg_catalog.pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY schemaname, tablename");
  const {rows:[tls]} = await client.query('SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()');
  await client.query('ROLLBACK');
  console.log(JSON.stringify({readOnly:true, tls:tls?.ssl === true, ...identity, tables},null,2));
  console.log('ブランチの本番/開発判定はSQLだけではできません。Neon Consoleで接続先と照合してください。SQL適用は行っていません。');
} catch {
  console.error('接続先確認に失敗しました。URL・TLS・権限を端末上で確認してください。秘密情報保護のためDBエラー詳細は出力しません。');
  process.exitCode=1;
} finally {
  if(client) await client.end().catch(()=>{});
}
