import { requireUser } from "@/lib/session";
import { buildExport, EXPORTS, isExportKind } from "@/server/exports";
import { limitAction } from "@/server/rate-limit";

/*
  GET /admin/exports/<kind>  ->  CSV download.

  - requireUser sends signed-out people to /login and enforces the
    superuser's 2FA, same as every page.
  - Unknown kinds and roles that aren't allowed both get a plain 404,
    so the endpoint doesn't confirm which exports exist.
  - no-store: the file must never sit in a browser, proxy or CDN cache.
  - Every successful download is audit-logged in buildExport.
*/

const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(_req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const actor = await requireUser();
  const { kind } = await params;

  if (!isExportKind(kind) || !EXPORTS[kind].allowed(actor.role)) return notFound();

  const blocked = await limitAction("export", actor.id);
  if (blocked) {
    return new Response(blocked, { status: 429, headers: { "Retry-After": "600", "Cache-Control": "no-store" } });
  }

  const { csv, filename } = await buildExport(actor, kind);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
