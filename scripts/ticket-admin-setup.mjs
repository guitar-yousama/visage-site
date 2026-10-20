// Run from the project root. Credentials are read without terminal echo, never as arguments.
import { readFile, writeFile, rename, unlink, chmod } from "node:fs/promises";
import { randomBytes, scryptSync } from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import pg from "pg";

export function mergeEnv(source, values) {
  for (const [key, value] of Object.entries(values)) {
    // Next.js expands $, even inside quotes. All supplied values are single-line.
    const encoded = JSON.stringify(value).replace(/\$/g, "\\$");
    const pattern = new RegExp(`^${key}=.*$`, "gm");
    source = pattern.test(source)
      ? source.replace(pattern, () => `${key}=${encoded}`)
      : source.replace(/\s*$/, "\n") + `${key}=${encoded}\n`;
  }
  return source;
}
async function save(source, values) {
  const target = ".env.local";
  if ((await readFile(target, "utf8")) !== source)
    throw Error("CONCURRENT_CHANGE");
  const temporary = `.env.admin-setup-${randomBytes(12).toString("hex")}`;
  try {
    await writeFile(temporary, mergeEnv(source, values), {
      flag: "wx",
      mode: 0o600,
    });
    if ((await readFile(target, "utf8")) !== source)
      throw Error("CONCURRENT_CHANGE");
    await rename(temporary, target);
    await chmod(target, 0o600);
  } finally {
    await unlink(temporary).catch(() => {});
  }
}
function hidden(prompt, max) {
  return new Promise((resolve, reject) => {
    let value = "";
    process.stderr.write(prompt);
    process.stdin.setEncoding("utf8");
    process.stdin.setRawMode(true);
    process.stdin.resume();
    const finish = () => {
      process.stdin.off("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stderr.write("\n");
    };
    const onData = (chunk) => {
      for (const character of chunk) {
        if (character === "\u0003") {
          finish();
          reject(Error("CANCELLED"));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          resolve(value);
          return;
        }
        if (character === "\u007f" || character === "\b")
          value = Array.from(value).slice(0, -1).join("");
        else if (!/[\u0000-\u001f\u007f]/.test(character) && value.length < max)
          value += character;
      }
    };
    process.stdin.on("data", onData);
  });
}
async function verifyLogin(id, password, env) {
  let server,
    client,
    cookie = "";
  const origin = "http://127.0.0.1:3174";
  const pause = (ms) => new Promise((r) => setTimeout(r, ms));
  const request = async (path, method = "GET", data, authenticated = false) => {
    const result = await fetch(origin + "/api/tickets/" + path, {
      method,
      headers: {
        ...(method !== "GET"
          ? { Origin: origin, "Content-Type": "application/json" }
          : {}),
        ...(authenticated && cookie ? { Cookie: cookie } : {}),
      },
      body: data === undefined ? undefined : JSON.stringify(data),
      signal: AbortSignal.timeout(15000),
    });
    return result;
  };
  try {
    const url = new URL(env.DATABASE_URL);
    if (
      url.hostname !== "ep-dawn-salad-b7oywtz6.c-13.us-east-1.aws.neon.tech" ||
      url.pathname !== "/neondb" ||
      url.searchParams.get("sslmode") !== "verify-full"
    )
      throw Error("WRONG_DB");
    client = new pg.Client({
      connectionString: env.DATABASE_URL,
      connectionTimeoutMillis: 10000,
    });
    await client.connect();
    if (
      !client.connection.stream.encrypted ||
      !client.connection.stream.authorized
    )
      throw Error("TLS");
    // Refuse a pre-existing listener rather than testing another app on that port.
    const net = await import("node:net");
    await new Promise((resolve, reject) => {
      const probe = net.createServer();
      probe.once("error", reject);
      probe.listen(3174, "127.0.0.1", () => probe.close(resolve));
    });
    server = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "dev",
        "--hostname",
        "127.0.0.1",
        "--port",
        "3174",
      ],
      {
        stdio: "ignore",
        env: {
          ...process.env,
          ...env,
          NODE_ENV: "development",
          NEXT_TELEMETRY_DISABLED: "1",
          TICKET_SITE_ORIGIN: origin,
          GMAIL_USER: "",
          GMAIL_APP_PASSWORD: "",
        },
      },
    );
    let ready = false;
    for (let i = 0; i < 60; i++) {
      if (server.exitCode !== null) throw Error("SERVER_EXIT");
      try {
        if ((await request("session")).ok) {
          ready = true;
          break;
        }
      } catch {}
      await pause(1000);
    }
    if (!ready) throw Error("SERVER_TIMEOUT");
    for (const path of [
      "admin/events",
      "admin/reservations",
      "admin/csv",
      "admin/logs",
    ])
      if ((await request(path)).status !== 401) throw Error("AUTH_GUARD");
    const login = await request("login", "POST", { id, password });
    if (!login.ok) throw Error("LOGIN");
    const header = login.headers.get("set-cookie") ?? "";
    if (!/HttpOnly/i.test(header) || !/SameSite=strict/i.test(header))
      throw Error("COOKIE");
    cookie = header.split(";")[0];
    if (
      !(await (await request("session", "GET", undefined, true)).json())
        .authenticated
    )
      throw Error("SESSION");
    if (!(await request("admin/events", "GET", undefined, true)).ok)
      throw Error("ADMIN");
    if (!(await request("logout", "POST", {}, true)).ok) throw Error("LOGOUT");
    // Send the old cookie again: the DB session must already have been removed.
    if (
      (await request("session", "GET", undefined, true)).status !== 200 ||
      (await request("admin/events", "GET", undefined, true)).status !== 401
    )
      throw Error("REVOCATION");
    console.log(
      "確認成功：正式設定でのログイン・管理API参照・ログアウト・旧セッション拒否・未認証アクセス拒否。",
    );
    await writeFile(
      ".env.admin-check.json",
      JSON.stringify(
        {
          verifiedAt: new Date().toISOString(),
          login: true,
          logout: true,
          unauthenticatedDenied: true,
          oldSessionDenied: true,
          developmentOnly: true,
          mailSent: false,
        },
        null,
        2,
      ),
      { mode: 0o600 },
    );
  } finally {
    if (server && cookie)
      await request("logout", "POST", {}, true).catch(() => {});
    if (server) {
      server.kill("SIGTERM");
      await pause(1000);
    }
    if (client) await client.end().catch(() => {});
  }
}
async function main() {
  process.umask(0o077);
  const args = process.argv.slice(2);
  if (args.some((a) => a !== "--prepare")) throw Error("ARGS");
  let source = await readFile(".env.local", "utf8");
  nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} }, true);
  const values = {};
  if (!process.env.TICKET_SECURITY_SECRET)
    values.TICKET_SECURITY_SECRET = randomBytes(32).toString("hex");
  else if (process.env.TICKET_SECURITY_SECRET.length < 32)
    throw Error("SHORT_SECRET");
  if (!process.env.TICKET_SITE_ORIGIN)
    values.TICKET_SITE_ORIGIN = "http://127.0.0.1:3000";
  if (args.includes("--prepare")) {
    await save(source, values);
    console.log(
      "準備完了：秘密値とローカルOriginを設定しました。既存値は維持し、認証情報は表示していません。",
    );
    return;
  }
  if (!process.stdin.isTTY) throw Error("TTY_REQUIRED");
  const id = await hidden(
    "管理者ID（半角英数字 . _ @ -、3〜100文字／非表示）: ",
    101,
  );
  if (!/^[A-Za-z0-9._@-]{3,100}$/.test(id)) throw Error("INVALID_ID");
  let password = await hidden("管理者パスワード（16〜200文字／非表示）: ", 201);
  if (password.length < 16 || password.length > 200)
    throw Error("INVALID_PASSWORD");
  let confirmation = await hidden("同じパスワードを再入力（非表示）: ", 201);
  if (password !== confirmation) throw Error("MISMATCH");
  confirmation = "";
  if (!process.env.TICKET_ADMIN_EMAIL) {
    const email = await hidden("管理通知先メールアドレス（非表示）: ", 255);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Error("INVALID_EMAIL");
    values.TICKET_ADMIN_EMAIL = email;
  }
  const salt = randomBytes(16).toString("hex");
  values.TICKET_ADMIN_ID = id;
  values.TICKET_ADMIN_PASSWORD_HASH = `scrypt$32768$${salt}$${scryptSync(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }).toString("hex")}`;
  await save(source, values);
  console.log(
    "保存完了：パスワードはscryptハッシュのみ保存しました。秘密値は表示していません。",
  );
  try {
    await verifyLogin(id, password, { ...process.env, ...values });
  } finally {
    password = "";
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
  main().catch(() => {
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    process.stdin.pause();
    console.error(
      "設定または検証を完了できませんでした。ID形式・文字数・再入力一致・開発DB設定・他のnext devの終了を確認してください。秘密情報保護のため詳細は非表示です。設定保存済みの場合はファイルを保持します。",
    );
    process.exitCode = 1;
  });
