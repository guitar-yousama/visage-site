import { authDiagnostics } from "@/lib/tickets/auth-diagnostics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET() {
  const result = authDiagnostics(process.env);
  return Response.json(result ?? { error: "Not found" }, {
    status: result ? 200 : 404,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}
