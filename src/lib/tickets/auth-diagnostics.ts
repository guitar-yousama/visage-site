// Temporary, non-secret diagnostics. Never return values, lengths or fingerprints.
export function authDiagnostics(env: Record<string, string | undefined>) {
  if (env.VERCEL !== "1" || env.VERCEL_ENV !== "preview" ||
      (env.VERCEL_TARGET_ENV && env.VERCEL_TARGET_ENV !== "preview") ||
      env.VERCEL_GIT_COMMIT_REF !== "codex/ticket-isolated-test") return null;
  const id = env.TICKET_ADMIN_ID ?? "";
  const hash = env.TICKET_ADMIN_PASSWORD_HASH ?? "";
  return {
    previewBranchMatches: true,
    adminIdPresent: Boolean(id),
    adminIdMatchesExpected: id === "visage-preview-admin",
    adminIdHasOuterWhitespace: id !== id.trim(),
    passwordHashPresent: Boolean(hash),
    passwordHashFormatValid: /^scrypt\$32768\$[0-9a-f]{32}\$[0-9a-f]{128}$/.test(hash),
    passwordHashHasOuterWhitespace: hash !== hash.trim(),
    passwordHashHasLineBreak: /[\r\n]/.test(hash),
    passwordHashHasEscapedDollar: hash.includes("\\$"),
    passwordHashHasOuterQuotes: /^["']|["']$/.test(hash),
  };
}
