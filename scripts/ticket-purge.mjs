import { Pool } from "pg";
const date = process.argv.find((arg) => /^\d{4}-\d{2}-\d{2}$/.test(arg));
if (!date || !process.env.DATABASE_URL || !process.env.TICKET_ADMIN_ID) {
  process.stderr.write(
    "DATABASE_URL / TICKET_ADMIN_ID と削除基準日 YYYY-MM-DD が必要です。初期動作は件数確認のみ。--execute で実行します。\n",
  );
  process.exit(1);
}
if (!Number.isFinite(Date.parse(date))) process.exit(1);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const q = await pool.connect();
try {
  await q.query("BEGIN");
  const rows = await q.query(
    "SELECT id FROM ticket_reservations r WHERE deleted_at<$1::date AND NOT EXISTS(SELECT 1 FROM ticket_mail_jobs m WHERE m.reservation_id=r.id AND m.state='sending') FOR UPDATE",
    [date],
  );
  process.stdout.write(
    `対象 ${rows.rows.length}件（論理削除済み・基準日以前・送信処理中なし）\n`,
  );
  if (process.argv.includes("--execute")) {
    for (const { id } of rows.rows) {
      await q.query("DELETE FROM ticket_mail_jobs WHERE reservation_id=$1", [
        id,
      ]);
      await q.query("DELETE FROM ticket_reservations WHERE id=$1", [id]);
      await q.query(
        "INSERT INTO ticket_audit(admin_id,action,target_id) VALUES($1,'reservation.purge',$2)",
        [process.env.TICKET_ADMIN_ID, id],
      );
    }
    await q.query("COMMIT");
    process.stdout.write(
      "完全削除完了（既送信メールやバックアップは別途管理してください）。\n",
    );
  } else {
    await q.query("ROLLBACK");
    process.stdout.write("確認のみ。削除は行っていません。\n");
  }
} catch {
  await q.query("ROLLBACK");
  process.stderr.write(
    "完全削除処理に失敗しました。接続・権限を確認してください。\n",
  );
  process.exitCode = 1;
} finally {
  q.release();
  await pool.end();
}
