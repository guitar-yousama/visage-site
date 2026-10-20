import { randomBytes, scrypt } from "node:crypto";
// The password is read from stdin; never place it in a command-line argument.
if (process.stdin.isTTY) {
  process.stderr.write("管理者パスワード（16文字以上、入力は表示しません）: ");
  process.stdin.setRawMode(true);
  process.stdin.resume();
  let password = "";
  process.stdin.on("data", (chunk) => {
    for (const c of chunk.toString()) {
      if (c === "\u0003") process.exit(1);
      if (c === "\r" || c === "\n") {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stderr.write("\n");
        generate(password);
        return;
      }
      if (c === "\u007f") password = password.slice(0, -1);
      else password += c;
    }
  });
} else {
  let password = "";
  for await (const chunk of process.stdin) password += chunk;
  generate(password.trimEnd());
}
function generate(password) {
  if (password.length < 16 || password.length > 200) {
    process.stderr.write("16〜200文字で指定してください。\n");
    process.exitCode = 1;
    return;
  }
  const salt = randomBytes(16).toString("hex");
  scrypt(
    password,
    salt,
    64,
    { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
    (error, key) => {
      if (error) throw error;
      process.stdout.write(`scrypt$32768$${salt}$${key.toString("hex")}\n`);
    },
  );
}
